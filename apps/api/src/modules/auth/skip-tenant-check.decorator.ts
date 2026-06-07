import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from './tenant.guard';

/**
 * @SkipTenantCheck()
 *
 * Apply this decorator to a controller class or individual handler to opt-out
 * of the global TenantGuard check.  Use sparingly — only for:
 *   - Public / machine-to-machine webhook endpoints that authenticate via
 *     HMAC signatures instead of JWTs (e.g. POST /webhooks/github)
 *   - Health-check or metadata endpoints that carry no user context
 *   - Internal service-to-service calls that have their own auth mechanism
 */
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);
