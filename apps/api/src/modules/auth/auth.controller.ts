import { Controller, Post, Body, Get, UseGuards, Request, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { User, Organization, SSOConfiguration } from '../../entities';
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
  ) {}

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
                     this.configService.get<string>('AUTH_SECRET') ?? 
                     'ochhExgjtTPvCk/Dqpb0zkAGtQgdOeNV+2XGhsFPo/4=';
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

    // 1. Ensure the default organization exists
    const orgSlug = 'default-org';
    let org = await this.orgRepo.findOne({ where: { slug: orgSlug } });
    if (!org) {
      org = this.orgRepo.create({
        name: 'Default Organization',
        slug: orgSlug,
      });
      org = await this.orgRepo.save(org);
    }
    const orgId = org.id;

    // 2. Find user by email or githubId
    let user = await this.userRepo.findOne({
      where: [
        { githubId },
        { email },
      ],
    });

    if (!user) {
      // Create user
      user = this.userRepo.create({
        email,
        name,
        avatarUrl,
        githubId,
        githubUsername,
        githubAccessToken,
        provider: 'github',
        organizationId: orgId,
        role: 'admin',
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
      if (githubAccessToken && user.githubAccessToken !== githubAccessToken) {
        user.githubAccessToken = githubAccessToken;
        updated = true;
      }
      if (updated) {
        await this.userRepo.save(user);
      }
    }

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

    // 1. Ensure the default organization exists
    const orgSlug = 'default-org';
    let org = await this.orgRepo.findOne({ where: { slug: orgSlug } });
    if (!org) {
      org = this.orgRepo.create({
        name: 'Default Organization',
        slug: orgSlug,
      });
      org = await this.orgRepo.save(org);
    }
    const orgId = org.id;

    const email = body.email;
    const name = body.name || 'Google User';
    const avatarUrl = body.avatarUrl || '';

    // 2. Find or create user
    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      user = this.userRepo.create({
        email,
        name,
        avatarUrl,
        provider: 'google',
        organizationId: orgId,
        role: 'admin',
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

  @Post('credentials-callback')
  @ApiOperation({ summary: 'Register or login user via credentials (DEV ONLY)' })
  async credentialsCallback(@Body() body: any) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }

    const orgSlug = 'default-org';
    let org = await this.orgRepo.findOne({ where: { slug: orgSlug } });
    if (!org) {
      org = this.orgRepo.create({
        name: 'Default Organization',
        slug: orgSlug,
      });
      org = await this.orgRepo.save(org);
    }
    const orgId = org.id;

    let user = await this.userRepo.findOne({ where: { email: body.email } });
    if (!user) {
      user = this.userRepo.create({
        email: body.email,
        name: body.name || 'Dev User',
        provider: 'credentials',
        organizationId: orgId,
        role: 'admin',
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
      isNew: false,
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
    let organizationId: string = body.organizationId || 'default-org';

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
      } catch (err) {
        this.logger.error(`SAML parsing failed: ${err.message}`);
        throw new BadRequestException('Failed to parse SAML Response assertion');
      }
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required from your identity assertion');
    }

    const domain = email.split('@')[1].toLowerCase();

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
    let organizationId: string = body.organizationId || 'default-org';

    if (body.id_token) {
      try {
        const parts = body.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          email = payload.email;
          name = payload.name || payload.preferred_username || name;
          organizationId = payload.org || payload.organizationId || organizationId;
        }
      } catch (err) {
        this.logger.error(`OIDC parsing failed: ${err.message}`);
        throw new BadRequestException('Failed to parse OIDC ID Token');
      }
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required from OIDC assertion');
    }

    const domain = email.split('@')[1].toLowerCase();

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
