import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './permissions.guard';
import {
  User,
  Organization,
  SSOConfiguration,
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
  AuditLogEntity,
  InvitationEntity,
} from '../../entities';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET', 'change-me'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Organization,
      SSOConfiguration,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      AuditLogEntity,
      InvitationEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, PermissionsService, PermissionsGuard],
  exports: [PassportModule, JwtModule, PermissionsService, PermissionsGuard],
})
export class AuthModule {}

