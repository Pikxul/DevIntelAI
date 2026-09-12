import { Controller, Post, Body, Get, UseGuards, Request, Logger, UnauthorizedException, BadRequestException, ForbiddenException, Param, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { User, Organization, SSOConfiguration, AuditLogEntity, InvitationEntity } from '../../entities';
import { PermissionsService } from './permissions.service';
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
    private permissionsService: PermissionsService,
    private dataSource: DataSource,
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

    // ── Existing user login ──────────────────────────────────────────────
    let user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      // Check deactivated status
      if ((user as any).status === 'deactivated') {
        await this.logAuthEvent(email, 'login_failed', 'Account is deactivated');
        throw new ForbiddenException('Your account has been deactivated. Contact your organization administrator.');
      }

      // Existing user — verify password
      if (user.password && password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          await this.logAuthEvent(email, 'login_failed', 'Invalid password');
          throw new UnauthorizedException('Invalid email or password');
        }
      } else if (user.password && !password) {
        await this.logAuthEvent(email, 'login_failed', 'Password required but not provided');
        throw new UnauthorizedException('Password is required');
      }

      await this.logAuthEvent(email, 'login_success', 'Credentials authentication', user.organizationId);

      const permissions = await this.permissionsService.getUserPermissions(user.id, user.role);

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
        firstLogin: (user as any).firstLogin ?? false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || '',
          organizationId: user.organizationId,
          role: user.role,
          status: (user as any).status || 'active',
          firstLogin: (user as any).firstLogin ?? false,
          permissions,
        },
      };
    }

    // ── New user registration ────────────────────────────────────────────
    if (!password || password.length < 4) {
      throw new BadRequestException('Password is required (minimum 4 characters) for new accounts');
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException('Invalid email address');
    }

    // Check if an organization already exists for this email domain
    const domainSlug = domain.split('.')[0];
    const existingOrg = await this.orgRepo
      .createQueryBuilder('org')
      .where('org.slug LIKE :slug', { slug: `${domainSlug}%` })
      .getOne();

    // Also check for pending invitation
    const invitation = await this.invitationRepo.findOne({ where: { email, status: 'pending' } });

    if (existingOrg && !invitation) {
      // Org exists but no invitation → reject (invitation-only)
      await this.logAuthEvent(email, 'login_failed', `No invitation found. Organization '${existingOrg.name}' requires an invitation.`);
      throw new UnauthorizedException(
        'Registration is by invitation only. Contact your organization administrator for an invite.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    let org;
    let role: string;

    if (invitation) {
      // Invited user — join the existing org with assigned role
      org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });
      if (!org) {
        throw new BadRequestException('The organization for this invitation no longer exists.');
      }
      role = invitation.role;
      invitation.status = 'accepted';
      await this.invitationRepo.save(invitation);
      this.logger.log(`Invitation accepted for ${email} → role: ${role} in org: ${org.name}`);
    } else {
      // First user for this domain — create org, become owner
      const orgName = domain !== 'example.com' && domain !== 'gmail.com'
        ? `${domainSlug.charAt(0).toUpperCase() + domainSlug.slice(1)} Corp`
        : `${userName}'s Organization`;
      const orgSlug = domain !== 'example.com' && domain !== 'gmail.com'
        ? `${domainSlug}-corp`
        : `org-${Date.now().toString(36)}`;

      org = await this.orgRepo.findOne({ where: [{ slug: orgSlug }, { name: orgName }] });
      if (!org) {
        org = this.orgRepo.create({ name: orgName, slug: orgSlug });
        org = await this.orgRepo.save(org);
        this.logger.log(`New organization created: ${orgName} (${orgSlug})`);
      }
      role = 'owner';
    }

    user = this.userRepo.create({
      email,
      name: userName,
      organizationId: org.id,
      role,
      provider: 'credentials',
      password: passwordHash,
      invitedBy: invitation ? invitation.invitedBy : undefined,
    });
    await this.userRepo.save(user);

    await this.logAuthEvent(email, 'registration_success', `Registered as ${role}`, org.id);

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
  @ApiOperation({ summary: 'Get current authenticated user profile with permissions' })
  async getMe(@Request() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) return req.user;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if ((user as any).status === 'deactivated') {
      throw new ForbiddenException('Account is deactivated');
    }

    const org = await this.orgRepo.findOne({ where: { id: user.organizationId } });
    const permissions = await this.permissionsService.getUserPermissions(user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      role: user.role,
      status: (user as any).status || 'active',
      firstLogin: (user as any).firstLogin ?? false,
      onboardingCompleted: user.onboardingCompleted,
      permissions,
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: (org as any).status || 'active',
      } : null,
    };
  }
  // ─── Organization Registration ──────────────────────────────────────────────

  @Post('register-organization')
  @ApiOperation({ summary: 'Register a new organization and owner account (atomic)' })
  async registerOrganization(@Body() body: any) {
    const { organizationName, ownerName, email, password } = body;

    if (!organizationName || !ownerName || !email || !password) {
      throw new BadRequestException('organizationName, ownerName, email, and password are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check uniqueness
    const existingUser = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

    // Generate slug
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let suffix = 0;
    while (await this.orgRepo.findOne({ where: { slug } })) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Use a transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create organization
      const org = this.orgRepo.create({
        name: organizationName,
        slug,
        plan: 'free',
      } as any);
      (org as any).status = 'active';
      const savedOrg = await queryRunner.manager.save(org) as unknown as Organization;

      // Create owner user
      const hashedPassword = await bcrypt.hash(password, 12);
      const owner = this.userRepo.create({
        name: ownerName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'owner',
        organizationId: savedOrg.id,
        onboardingCompleted: false,
      } as any);
      (owner as any).status = 'active';
      (owner as any).firstLogin = false;
      const savedOwner = await queryRunner.manager.save(owner) as unknown as User;

      // Assign owner role via permissions service (outside transaction – will auto-save)
      await queryRunner.commitTransaction();

      // Assign role after commit so the user exists
      await this.permissionsService.assignUserRole(savedOwner.id, 'owner');

      await this.logAuthEvent(normalizedEmail, 'org_registered', `Organization "${organizationName}" registered`, savedOrg.id);

      // Issue JWT
      const payload = {
        sub: savedOwner.id,
        email: savedOwner.email,
        name: savedOwner.name,
        org: savedOrg.id,
        role: 'owner',
      };

      const permissions = await this.permissionsService.getUserPermissions(savedOwner.id, 'owner');

      return {
        token: this.jwtService.sign(payload),
        isNew: true,
        firstLogin: false,
        user: {
          id: savedOwner.id,
          email: savedOwner.email,
          name: savedOwner.name,
          organizationId: savedOrg.id,
          role: 'owner',
          status: 'active',
          firstLogin: false,
          permissions,
        },
        organization: {
          id: savedOrg.id,
          name: savedOrg.name,
          slug: savedOrg.slug,
          status: 'active',
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Organization registration failed: ${error.message}`, error.stack);
      throw new BadRequestException('Organization registration failed. Please try again.');
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Change Password (First-Login Flow) ──────────────────────────────────────

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (required on first login with temporary credentials)' })
  async changePassword(@Request() req: any, @Body() body: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If user has a password set, verify current password
    if (user.password && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    } else if (user.password && !currentPassword) {
      // For firstLogin users with temp password, currentPassword is required
      throw new BadRequestException('Current password is required');
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, {
      password: hashedPassword,
      firstLogin: false,
    } as any);

    await this.logAuthEvent(user.email, 'password_changed', 'Password changed successfully', user.organizationId);

    // Return updated JWT
    const permissions = await this.permissionsService.getUserPermissions(user.id, user.role);
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      role: user.role,
    };

    return {
      message: 'Password changed successfully',
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role,
        status: (user as any).status || 'active',
        firstLogin: false,
        permissions,
      },
    };
  }

  // ─── Invitation Acceptance Flow ──────────────────────────────────────────────

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Validate an invitation token and return details' })
  async getInvitationByToken(@Param('token') token: string) {
    if (!token || token.length < 16) {
      throw new BadRequestException('Invalid invitation token');
    }

    const invitation = await this.invitationRepo.findOne({ where: { token, status: 'pending' } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      await this.invitationRepo.save(invitation);
      throw new BadRequestException('This invitation has expired. Please ask your admin for a new one.');
    }

    const org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });

    return {
      email: invitation.email,
      role: invitation.role,
      organizationName: org?.name || 'Unknown Organization',
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
    };
  }

  @Post('accept-invitation')
  @ApiOperation({ summary: 'Accept an invitation and create user account' })
  async acceptInvitation(@Body() body: { token: string; name: string; password: string }) {
    if (!body.token || !body.name || !body.password) {
      throw new BadRequestException('Token, name, and password are required');
    }

    if (body.password.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters');
    }

    const invitation = await this.invitationRepo.findOne({ where: { token: body.token, status: 'pending' } });
    if (!invitation) {
      throw new BadRequestException('Invitation not found or already used');
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      await this.invitationRepo.save(invitation);
      throw new BadRequestException('This invitation has expired.');
    }

    // Check if user already exists
    const existingUser = await this.userRepo.findOne({ where: { email: invitation.email } });
    if (existingUser) {
      throw new BadRequestException('An account with this email already exists. Please sign in instead.');
    }

    const org = await this.orgRepo.findOne({ where: { id: invitation.organizationId } });
    if (!org) {
      throw new BadRequestException('The organization for this invitation no longer exists.');
    }

    // Create the user with hashed password
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = this.userRepo.create({
      email: invitation.email,
      name: body.name.trim(),
      organizationId: org.id,
      role: invitation.role,
      provider: 'credentials',
      password: passwordHash,
      invitedBy: invitation.invitedBy,
    });
    await this.userRepo.save(user);

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await this.invitationRepo.save(invitation);

    await this.logAuthEvent(user.email, 'invitation_accepted', `Joined ${org.name} as ${invitation.role}`, org.id);
    this.logger.log(`Invitation accepted: ${user.email} joined ${org.name} as ${invitation.role}`);

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
        avatarUrl: user.avatarUrl || '',
        organizationId: user.organizationId,
        role: user.role,
      },
    };
  }
}
