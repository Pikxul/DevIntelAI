import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  org: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private cfg: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('NEXTAUTH_SECRET') ?? cfg.get<string>('JWT_SECRET') ?? cfg.get<string>('AUTH_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.org || payload.org === 'default-org') {
      throw new UnauthorizedException('Invalid or missing organization ID in token');
    }

    // Validate user still exists and is active in DB
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }
    if ((user as any).status === 'deactivated') {
      throw new ForbiddenException('Your account has been deactivated');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.org,
      role: user.role ?? payload.role ?? 'user',
    };
  }
}
