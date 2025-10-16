import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private logger = new Logger('MetricsMiddleware');

  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const method = req.method;
    const originalUrl = req.originalUrl;
    
    // Extract route pattern (remove query params and normalize)
    const route = this.extractRoute(originalUrl);
    
    // Use res.on('finish') instead of overriding res.end
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const statusCode = res.statusCode;
      
      try {
        // Record HTTP request metrics
        this.metricsService.incrementHttpRequest(method, route, statusCode);
        this.metricsService.observeHttpDuration(method, route, statusCode, duration);
        
        this.logger.debug(`HTTP ${method} ${route} - ${statusCode} (${duration.toFixed(3)}s)`);
      } catch (error) {
        this.logger.error('Error recording HTTP metrics:', error);
      }
    });

    next();
  }

  private extractRoute(url: string): string {
    // Remove query parameters
    const pathWithoutQuery = url.split('?')[0];
    
    // Normalize common route patterns
    return pathWithoutQuery
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs with :id
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs with :uuid
      .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIds
      .replace(/\/$/, '') || '/'; // Remove trailing slash
  }
}