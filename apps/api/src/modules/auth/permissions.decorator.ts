import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route handler.
 * Usage: @RequirePermission('pipeline:trigger', 'deployment:rollback')
 * The user must have ALL listed permissions to access the route.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
