import { CallHandler, ExecutionContext, Injectable, NestInterceptor, BadRequestException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private cache = new Map<string, { body: any; status: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Only apply idempotency to writing requests (POST, PUT, DELETE)
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const key = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];
    if (!key) {
      return next.handle();
    }

    if (typeof key !== 'string' || key.trim() === '') {
      throw new BadRequestException('Invalid Idempotency-Key header');
    }

    const orgId = request.user?.organizationId || request.user?.org || 'anonymous';
    const cacheKey = `org:${orgId}:idempotency:${key}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      response.status(cached.status);
      response.setHeader('x-cache-idempotent', 'true');
      return of(cached.body);
    }

    return next.handle().pipe(
      tap((body) => {
        const statusCode = response.statusCode || 200;
        this.cache.set(cacheKey, { body, status: statusCode });
        
        // Auto-cleanup keys after 5 minutes to avoid memory leaks
        setTimeout(() => {
          this.cache.delete(cacheKey);
        }, 300000);
      }),
    );
  }
}
