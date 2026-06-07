import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_TENANT_CHECK_KEY = 'skipTenantCheck';

/**
 * TenantGuard — scoped authorization guard that prevents cross-tenant data access.
 *
 * After the JWT is verified, every request that carries an `organizationId`
 * (in query params, route params, or request body) is checked against the
 * `organizationId` embedded in the JWT claims.  If they do not match the
 * request is rejected with 403 Forbidden.
 *
 * Routes that should be exempt (e.g. public webhooks, machine-to-machine
 * endpoints, admin overrides) must be decorated with @SkipTenantCheck().
 *
 * IMPORTANT: This guard must run *after* AuthGuard('jwt') so that req.user
 * is already populated.  Register it at the APP_GUARD level after the JWT
 * guard, or apply it at the controller / handler level.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow bypass via @SkipTenantCheck() decorator
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no authenticated user is present (unauthenticated public route),
    // let the AuthGuard handle it – don't block here.
    if (!user) {
      return true;
    }

    const jwtOrgId: string | undefined = user.organizationId;

    // Extract the organizationId sent by the client from any of the
    // standard locations: query string, route params, or request body.
    const clientOrgId: string | undefined =
      request.query?.organizationId ??
      request.params?.organizationId ??
      request.body?.organizationId ??
      request.query?.orgId ??
      request.params?.orgId ??
      request.body?.orgId;

    // If the request does not carry any organizationId, allow it through.
    // The resource-level service layer is responsible for scoping queries
    // to the user's own organization.
    if (!clientOrgId) {
      return true;
    }

    if (!jwtOrgId) {
      throw new ForbiddenException('JWT is missing organizationId claim');
    }

    if (clientOrgId !== jwtOrgId) {
      throw new ForbiddenException(
        'Access denied: organizationId in request does not match your tenant',
      );
    }

    return true;
  }
}
