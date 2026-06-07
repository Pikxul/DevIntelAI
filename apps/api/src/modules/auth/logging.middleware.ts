import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || req.headers['request-id'] || uuidv4();
    
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId as string);

    res.on('finish', () => {
      const { method, originalUrl, ip } = req;
      const userAgent = req.headers['user-agent'] || '';
      const { statusCode } = res;
      const duration = Date.now() - start;

      const logData = {
        requestId,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        statusCode,
        durationMs: duration,
        ip,
        userAgent,
      };

      this.logger.log(JSON.stringify(logData));
    });

    next();
  }
}
