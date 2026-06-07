import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

export const RoleWeights: Record<string, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  security_engineer: 45,
  developer: 40,
  engineer: 40,
  user: 40, // standard user fallback
  viewer: 20,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is not logged in, fail-closed (require authentication)
    if (!user) {
      return false;
    }

    const userRole = (user.role || 'viewer').toLowerCase();
    const userWeight = RoleWeights[userRole] ?? 40;

    // 1. Enforce: Standard read-only "viewer" role CANNOT perform any mutating requests (POST, PUT, DELETE, PATCH)
    const method = request.method;
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && userWeight <= 20) {
      return false;
    }

    // 2. If no explicit role metadata is required, allow standard access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Find the lowest weight among required roles. The user must meet or exceed this weight.
    const requiredWeights = requiredRoles.map(r => RoleWeights[r.toLowerCase()] ?? 40);
    const minRequiredWeight = Math.min(...requiredWeights);

    return userWeight >= minRequiredWeight;
  }
}
