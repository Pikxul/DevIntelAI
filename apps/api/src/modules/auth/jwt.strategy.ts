import { Injectable } from '@nestjs/common';
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
      // Use NEXTAUTH_SECRET (same key Next.js uses to sign session JWTs)
      // Falls back to same string used in frontend auth.ts for dev
      secretOrKey: cfg.get<string>('NEXTAUTH_SECRET') ?? cfg.get<string>('AUTH_SECRET') ?? 'ochhExgjtTPvCk/Dqpb0zkAGtQgdOeNV+2XGhsFPo/4=',
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.org ?? 'default-org',
      role: payload.role ?? 'user',
    };
  }
}
