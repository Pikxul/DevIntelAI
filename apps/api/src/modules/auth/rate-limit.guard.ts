import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit = 100; // 100 requests per minute
  private readonly windowMs = 60000; // 1 minute
  private clients = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress || '127.0.0.1';

    const now = Date.now();
    const client = this.clients.get(ip);

    if (!client || now > client.resetTime) {
      this.clients.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    client.count++;
    if (client.count > this.limit) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'API rate limit exceeded. Please try again later.',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
