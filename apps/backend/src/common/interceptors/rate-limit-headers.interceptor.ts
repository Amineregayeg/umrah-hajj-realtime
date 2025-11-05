import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Interceptor that adds rate-limit headers to responses
 * Format follows standard X-RateLimit-* convention
 */
@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  private readonly RATE_LIMIT = 60; // requests per window
  private readonly WINDOW_SIZE = 60; // seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    // Calculate reset time (next minute)
    const now = Math.floor(Date.now() / 1000);
    const reset = now + this.WINDOW_SIZE;

    // For MVP, we'll use simple per-endpoint limits
    // In production, this should integrate with a proper rate-limiting service
    const remaining = this.RATE_LIMIT - 1; // Simplified for now

    return next.handle().pipe(
      tap(() => {
        // Add rate-limit headers to response
        response.setHeader('X-RateLimit-Limit', this.RATE_LIMIT.toString());
        response.setHeader('X-RateLimit-Remaining', remaining.toString());
        response.setHeader('X-RateLimit-Reset', reset.toString());
      }),
    );
  }
}
