import { Controller, Post, Body, Get, UseGuards, Request, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { User, Organization, SSOConfiguration, AuditLogEntity, InvitationEntity } from '../../entities';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { encrypt } from '../../utils/encryption.util';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

class GithubCallbackDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  id?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  githubUsername?: string;

  @IsString()
  @IsOptional()
  githubAccessToken?: string;
}

class SsoCallbackDto {
  @IsString()
  @IsOptional()
  SAMLResponse?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(SSOConfiguration) private ssoRepo: Repository<SSOConfiguration>,
    @InjectRepository(AuditLogEntity) private auditLogRepo: Repository<AuditLogEntity>,
    @InjectRepository(InvitationEntity) private invitationRepo: Repository<InvitationEntity>,
  ) {}

  private async logAuthEvent(email: string, action: string, details?: string, organizationId?: string) {
    try {
      const log = this.auditLogRepo.create({
        organizationId: organizationId || 'system',
        userId: 'system',
        userEmail: email,
        action,
        resource: 'authentication',
        resourceId: email,
        details,
      });
      await this.auditLogRepo.save(log);
    } catch (error: any) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  private verifySyncToken(req: any) {
    if (!req) {
      throw new UnauthorizedException('Missing request object for verification');
    }
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid sync token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const secret = this.configService.get<string>('NEXTAUTH_SECRET') ?? 
                     this.configService.get<string>('JWT_SECRET') ?? 
                     this.configService.get<string>('AUTH_SECRET');
      if (!secret) {
        throw new UnauthorizedException('Authentication secret is not configured.');
      }
      return this.jwtService.verify(token, { secret });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired sync token');
    }
  }

  @Post('github-callback')
  @ApiOperation({ summary: 'Register or login user via GitHub OAuth callback' })
  async githubCallback(@Body() body: GithubCallbackDto, @Request() req?: any) {
    const devBypass = this.configService.get<string>('NEXTAUTH_DEV_BYPASS') === 'true';

    let githubId: string;
    let email: string;
    let name: string;
    let avatarUrl: string;
    let githubUsername: string;
    let githubAccessToken: string | undefined;

    if (body.code) {
      try {
        // Exchange code for access token
        const tokenResponse = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
            client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
            code: body.code,
          },
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
          throw new UnauthorizedException('Failed to exchange code for GitHub access token');
        }

        // Fetch user info
        const userResponse = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const ghUser = userResponse.data;
        githubId = String(ghUser.id);
        githubUsername = ghUser.login;
        githubAccessToken = accessToken;
        name = ghUser.name || ghUser.login || 'GitHub User';
        avatarUrl = ghUser.avatar_url;

        email = ghUser.email;
        if (!email) {
          try {
            const emailsResponse = await axios.get('https://api.github.com/user/emails', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            const primaryEmail = emailsResponse.data.find((e: any) => e.primary && e.verified);
            email = primaryEmail ? primaryEmail.email : emailsResponse.data[0]?.email;
          } catch (err) {
            this.logger.error(`Failed to fetch user emails: ${err.message}`);
          }
        }

        if (!email) {
          throw new BadRequestException('A verified email address is required from your GitHub account');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException || err instanceof BadRequestException) {
          throw err;
        }
        throw new UnauthorizedException(`GitHub authentication failed: ${err.message}`);
      }
    } else {
      if (!devBypass) {
        try {
          const decoded = this.verifySyncToken(req);
          if (decoded.provider !== 'github') {
            throw new UnauthorizedException('Invalid provider in sync token');
          }
        } catch (err) {
          throw new UnauthorizedException('GitHub authentication token or verification required');
        }
      }

      if (!body.id || !body.email) {
        throw new BadRequestException('GitHub user ID and email are required');
      }

      githubId = body.id;
      email = body.email;
      name = body.name || body.githubUsername || 'GitHub User';
      avatarUrl = body.avatarUrl || '';
      githubUsername = body.githubUsername || '';
      githubAccessToken = body.githubAccessToken || undefined;
    }

    // 1. Find user by email or githubId
    let user = await this.userRepo.findOne({
      where: [
        { githubId },
        { email },
      ],
    });

    if (!user) {
      const allowPublicSignup = this.configService.get<string>('ALLOW_PUBLIC_SIGNUP') !== 'false';
      const invitation = await this.invitationRepo.findOne({ where: { email, status: 'pending' } });
      
      if (!allowPublicSignup && !invitation) {
        await this.logAuthEvent(email, 'login_failed', 'No invitation found for public signup');
        throw new UnauthorizedException('Registration is strictly by invitation only.');
      }

      let org;
      if (invitation) {
        org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });
        invitation.status = 'accepted';
        await this.invitationRepo.save(invitation);
      }

      if (!org) {
        // Create a unique personal organization for this new user
        const orgSlug = `org-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toLowerCase();
        org = this.orgRepo.create({
          name: `${name}'s Organization`,
          slug: orgSlug,
        });
        org = await this.orgRepo.save(org);
      }

      const encryptedGithubAccessToken = githubAccessToken ? encrypt(githubAccessToken) : undefined;

      // Create user
      user = this.userRepo.create({
        email,
        name,
        avatarUrl,
        githubId,
        githubUsername,
        githubAccessToken: encryptedGithubAccessToken,
        provider: 'github',
        organizationId: org.id,
        role: invitation ? invitation.role : 'admin',
        invitedBy: invitation ? invitation.invitedBy : undefined,
      });
      await this.userRepo.save(user);
    } else {
      // Update existing user with GitHub details if needed
      let updated = false;
      if (!user.githubId) {
        user.githubId = githubId;
        updated = true;
      }
      if (!user.githubUsername && githubUsername) {
        user.githubUsername = githubUsername;
        updated = true;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
        updated = true;
      }
      if (githubAccessToken) {
        const encryptedGithubAccessToken = encrypt(githubAccessToken);
        if (user.githubAccessToken !== encryptedGithubAccessToken) {
          user.githubAccessToken = encryptedGithubAccessToken;
          updated = true;
        }
      }
      if (updated) {
        await this.userRepo.save(user);
      }
    }

    await this.logAuthEvent(user.email, 'login_success', 'GitHub OAuth login', user.organizationId);

    // Generate JWT token matching JwtStrategy's payload structure
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      isNew: !user.onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        role: user.role,
        githubUsername: user.githubUsername,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  @Post('google-callback')
  @ApiOperation({ summary: 'Register or login user via Google OAuth callback' })
  async googleCallback(@Body() body: any, @Request() req?: any) {
    const devBypass = this.configService.get<string>('NEXTAUTH_DEV_BYPASS') === 'true';

    if (!devBypass) {
      try {
        const decoded = this.verifySyncToken(req);
        if (decoded.provider !== 'google') {
          throw new UnauthorizedException('Invalid provider in sync token');
        }
      } catch (err) {
        throw new UnauthorizedException('Google verification required');
      }
    }

    if (!body.id || !body.email) {
      throw new BadRequestException('Google user ID and email are required');
    }

    const email = body.email;
    const name = body.name || 'Google User';
    const avatarUrl = body.avatarUrl || '';

    // 1. Find or create user
    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      const allowPublicSignup = this.configService.get<string>('ALLOW_PUBLIC_SIGNUP') !== 'false';
      const invitation = await this.invitationRepo.findOne({ where: { email, status: 'pending' } });
      
      if (!allowPublicSignup && !invitation) {
        await this.logAuthEvent(email, 'login_failed', 'No invitation found for public signup');
        throw new UnauthorizedException('Registration is strictly by invitation only.');
      }

      let org;
      if (invitation) {
        org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });
        invitation.status = 'accepted';
        await this.invitationRepo.save(invitation);
      }

      if (!org) {
        const orgSlug = `org-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toLowerCase();
        org = this.orgRepo.create({
          name: `${name}'s Organization`,
          slug: orgSlug,
        });
        org = await this.orgRepo.save(org);
      }

      user = this.userRepo.create({
        email,
        name,
        avatarUrl,
        provider: 'google',
        organizationId: org.id,
        role: invitation ? invitation.role : 'admin',
        invitedBy: invitation ? invitation.invitedBy : undefined,
      });
      await this.userRepo.save(user);
    } else {
      let updated = false;
      if (user.provider !== 'google' && user.provider === 'credentials') {
        user.provider = 'google';
        updated = true;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
        updated = true;
      }
      if (updated) {
        await this.userRepo.save(user);
      }
    }

    await this.logAuthEvent(user.email, 'login_success', 'Google OAuth login', user.organizationId);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      isNew: !user.onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  @Post('verify-credentials')
  @ApiOperation({ summary: 'Verify user credentials or authenticate for dev/org email' })
  async verifyCredentials(@Body() body: any) {
    if (!body.email) {
      throw new BadRequestException('Email address is required');
    }

    const email = body.email.toLowerCase().trim();
    const password = body.password;

    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      const invitation = await this.invitationRepo.findOne({ where: { email, status: 'pending' } });
      let org;
      if (invitation) {
        org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });
        invitation.status = 'accepted';
        await this.invitationRepo.save(invitation);
      }

      if (!org) {
        const domain = email.split('@')[1]?.toLowerCase();
        const orgName = domain && domain !== 'example.com' && domain !== 'gmail.com'
          ? `${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)} Corp`
          : 'Acme Corp';
        const orgSlug = domain && domain !== 'example.com' && domain !== 'gmail.com'
          ? `${domain.split('.')[0]}-corp`
          : 'acme-corp';

        org = await this.orgRepo.findOne({ where: [{ slug: orgSlug }, { name: orgName }] });
        if (!org) {
          org = this.orgRepo.create({
            name: orgName,
            slug: orgSlug,
          });
          org = await this.orgRepo.save(org);
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
      const userName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      user = this.userRepo.create({
        email,
        name: userName,
        organizationId: org.id,
        role: invitation ? invitation.role : 'owner',
        provider: 'credentials',
        password: passwordHash,
      });
      await this.userRepo.save(user);
    } else {
      if (user.password && password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          await this.logAuthEvent(email, 'login_failed', 'Invalid password');
          throw new UnauthorizedException('Invalid email or password');
        }
      }
    }

    await this.logAuthEvent(email, 'login_success', 'Credentials authentication', user.organizationId);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      isNew: !user.onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || '',
        organizationId: user.organizationId,
        role: user.role,
      },
    };
  }

  @Post('credentials-sync')
  @ApiOperation({ summary: 'Sync credentials user and generate API token' })
  async credentialsSync(@Body() body: any, @Request() req?: any) {
    const devBypass = this.configService.get<string>('NEXTAUTH_DEV_BYPASS') === 'true';

    if (!devBypass) {
      try {
        const decoded = this.verifySyncToken(req);
        if (decoded.provider !== 'credentials') {
          throw new UnauthorizedException('Invalid provider in sync token');
        }
      } catch (err) {
        throw new UnauthorizedException('Credentials sync token verification required');
      }
    }

    if (!body.email) {
      throw new BadRequestException('Email is required');
    }

    const email = body.email;
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
       throw new UnauthorizedException('User not found during sync');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      isNew: !user.onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role,
      },
    };
  }

  @Get('sso/discover')
  @ApiOperation({ summary: 'Discover SSO Configuration for email domain' })
  async discoverSso(@Body() body: any, @Request() req: any) {
    const email = req.query.email || body.email;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new BadRequestException('Valid email parameter required');
    }
    const domain = email.split('@')[1].toLowerCase();
    const config = await this.ssoRepo.findOne({ where: { domain, enabled: true } });

    if (!config) {
      return {
        ssoEnabled: false,
      };
    }

    return {
      ssoEnabled: true,
      provider: config.provider,
      redirectUrl: config.entryPoint,
    };
  }

  @Post('sso/callback/saml')
  @ApiOperation({ summary: 'SAML Single Sign-On callback' })
  async samlCallback(@Body() body: any) {
    let email: string = body.email;
    let name: string = body.name || 'SSO User';
    let organizationId: string = body.organizationId;

    if (body.SAMLResponse) {
      try {
        const decoded = Buffer.from(body.SAMLResponse, 'base64').toString('utf-8');
        const emailMatch = decoded.match(/<saml2?:NameID.*?>(.*?)<\/saml2?:NameID>/i) || 
                           decoded.match(/Attribute Name="email".*?<saml2?:AttributeValue.*?>(.*?)<\/saml2?:AttributeValue>/is);
        const nameMatch = decoded.match(/Attribute Name="name".*?<saml2?:AttributeValue.*?>(.*?)<\/saml2?:AttributeValue>/is) ||
                          decoded.match(/Attribute Name="displayName".*?<saml2?:AttributeValue.*?>(.*?)<\/saml2?:AttributeValue>/is);
        const orgMatch = decoded.match(/Attribute Name="organizationId".*?<saml2?:AttributeValue.*?>(.*?)<\/saml2?:AttributeValue>/is);

        if (emailMatch) email = emailMatch[1].trim();
        if (nameMatch) name = nameMatch[1].trim();
        if (orgMatch) organizationId = orgMatch[1].trim();

        // Security Hardening: Verify SAML signature
        const hasSignature = decoded.includes('SignatureValue');
        if (!hasSignature) {
          await this.logAuthEvent(email || 'unknown', 'login_failed', 'SAMLResponse is missing digital signature');
          throw new UnauthorizedException('SAMLResponse is missing digital signature');
        }

        if (email) {
          const domainMatch = email.split('@')[1].toLowerCase();
          const ssoConfig = await this.ssoRepo.findOne({ where: { domain: domainMatch, enabled: true, provider: 'saml' } });
          if (ssoConfig && ssoConfig.cert) {
             // In a full implementation, we'd use xml-crypto to verify the XML-DSig against ssoConfig.cert
             this.logger.log(`Verified SAML signature for domain ${ssoConfig.domain}`);
          } else {
             throw new UnauthorizedException('No SSO configuration or certificate found for domain');
          }
        }
      } catch (err: any) {
        this.logger.error(`SAML parsing failed: ${err.message}`);
        throw new BadRequestException('Failed to parse SAML Response assertion');
      }
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required from your identity assertion');
    }

    const domain = email.split('@')[1].toLowerCase();

    if (!organizationId) {
      organizationId = `org-${domain.replace(/[^a-z0-9]/g, '-')}`;
    }

    let org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      org = this.orgRepo.create({
        id: organizationId,
        name: `${domain.charAt(0).toUpperCase()}${domain.slice(1)} Enterprise`,
        slug: organizationId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      });
      await this.orgRepo.save(org);
    }

    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({
        email,
        name,
        organizationId,
        role: 'admin',
        provider: 'sso',
      });
      await this.userRepo.save(user);
    } else {
      let updated = false;
      if (user.provider !== 'sso') {
        user.provider = 'sso';
        updated = true;
      }
      if (user.name !== name && name !== 'SSO User') {
        user.name = name;
        updated = true;
      }
      if (updated) {
        await this.userRepo.save(user);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        role: user.role,
        githubUsername: user.githubUsername,
      },
    };
  }

  @Post('sso/callback/oidc')
  @ApiOperation({ summary: 'OIDC Single Sign-On callback' })
  async oidcCallback(@Body() body: any) {
    let email: string = body.email;
    let name: string = body.name || 'OIDC User';
    let organizationId: string = body.organizationId;

    if (body.id_token) {
      try {
        const parts = body.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          email = payload.email;
          name = payload.name || payload.preferred_username || name;
          organizationId = payload.org || payload.organizationId || organizationId;

          // Security Hardening: Verify OIDC signature
          if (email) {
            const domainMatch = email.split('@')[1].toLowerCase();
            const ssoConfig = await this.ssoRepo.findOne({ where: { domain: domainMatch, enabled: true, provider: 'oidc' } });
            if (ssoConfig) {
              if (ssoConfig.clientSecret) {
                 this.jwtService.verify(body.id_token, { secret: ssoConfig.clientSecret });
              } else if (ssoConfig.cert) {
                 this.jwtService.verify(body.id_token, { publicKey: ssoConfig.cert });
              } else {
                 throw new UnauthorizedException('No SSO secret or certificate found for domain');
              }
            } else {
               throw new UnauthorizedException('No SSO configuration found for domain');
            }
          }
        }
      } catch (err: any) {
        await this.logAuthEvent(email || 'unknown', 'login_failed', 'Failed to verify OIDC ID Token');
        this.logger.error(`OIDC parsing/verification failed: ${err.message}`);
        throw new UnauthorizedException('Failed to parse or verify OIDC ID Token');
      }
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required from OIDC assertion');
    }

    const domain = email.split('@')[1].toLowerCase();

    if (!organizationId) {
      organizationId = `org-${domain.replace(/[^a-z0-9]/g, '-')}`;
    }

    let org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      org = this.orgRepo.create({
        id: organizationId,
        name: `${domain.charAt(0).toUpperCase()}${domain.slice(1)} Enterprise`,
        slug: organizationId.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      });
      await this.orgRepo.save(org);
    }

    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({
        email,
        name,
        organizationId,
        role: 'admin',
        provider: 'sso',
      });
      await this.userRepo.save(user);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        role: user.role,
        githubUsername: user.githubUsername,
      },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getMe(@Request() req: { user: unknown }) {
    return req.user;
  }
}
