import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Fail-closed: unauthenticated users are always denied
    if (!user) {
      return false;
    }

    // If no explicit permissions are required on this route, allow authenticated access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const userRole = (user.role || 'viewer').toLowerCase();
    const allowed = this.permissionsService.hasAllPermissions(userRole, requiredPermissions);

    if (!allowed) {
      this.logger.warn(
        `Access denied for role "${userRole}" – missing permissions: [${requiredPermissions.join(', ')}]`,
      );
    }

    return allowed;
  }
}
