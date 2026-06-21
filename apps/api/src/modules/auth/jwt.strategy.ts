import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  org: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private cfg: ConfigService) {
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

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.org,
      role: payload.role ?? 'user',
    };
  }
}
