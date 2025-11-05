import { Controller, Get, Post, Body, Logger, UseGuards, Request, HttpStatus, HttpException, Header, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { NavGateway } from './nav.gateway';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { NavUpdateDto } from './dto/nav-update.dto';
import { NavigationCorrectionService } from './services/navigation-correction.service';
import { GraphService } from './graph/services/graph.service';
import { createHash } from 'crypto';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

@ApiTags('Navigation')
@Controller('nav')
export class NavController {
  private readonly logger = new Logger(NavController.name);

  private snapshotBuckets = new Map<string, number>();

  constructor(
    private readonly navGateway: NavGateway,
    private readonly prismaService: PrismaService,
    private readonly navCorrectionService: NavigationCorrectionService,
    private readonly graphService: GraphService
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get WebSocket status and connection statistics' })
  @ApiResponse({ status: 200, description: 'WebSocket status retrieved successfully' })
  getWebSocketStatus() {
    this.logger.log('WebSocket status check requested');
    
    const stats = this.navGateway.getConnectionStats();
    
    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      websocket: {
        port: 3001,
        features: {
          jwt_auth: true,
          heartbeat_interval: '15s',
          rate_limiting: '10Hz client, 5Hz server',
          message_queues: '≤50 messages',
          zod_validation: true,
          backpressure_handling: true
        },
        connections: stats
      }
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get navigation service health status' })
  @ApiResponse({ status: 200, description: 'Service health status retrieved successfully' })
  getHealth() {
    return {
      status: 'healthy',
      service: 'nav-websocket-gateway',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  @Post('snapshot')
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Submit navigation snapshot (REST fallback)', 
    description: 'Fallback endpoint for submitting navigation updates when WebSocket is unavailable. ' +
                 'Rate limited to 1 snapshot per minute per user (idempotent within minute bucket).'
  })
  @ApiBody({ type: NavUpdateDto })
  @ApiResponse({ status: 200, description: 'Snapshot accepted' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (1 per minute)' })
  @ApiResponse({ status: 400, description: 'Invalid snapshot data' })
  async submitSnapshot(@Body() navUpdate: NavUpdateDto, @Request() req: any) {
    const userId = req.user.id;
    const minuteBucket = Math.floor(Date.now() / 60000); // minute bucket
    const bucketKey = `${userId}:${minuteBucket}`;
    
    // Check if we already have a snapshot for this minute (idempotent)
    if (this.snapshotBuckets.has(bucketKey)) {
      this.logger.debug(`Snapshot already exists for user ${userId} in minute ${minuteBucket}`);
      return {
        success: true,
        message: 'Snapshot already recorded for this minute',
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      // Process navigation correction
      const correction = await this.navCorrectionService.processNavigationUpdate(navUpdate);
      
      // Check if snapshot already exists for this minute
      const minuteStart = new Date(minuteBucket * 60000);
      const minuteEnd = new Date((minuteBucket + 1) * 60000);
      
      const existingSnapshot = await this.prismaService.navCheckpoint.findFirst({
        where: {
          userId: userId,
          ts: {
            gte: minuteStart,
            lt: minuteEnd
          }
        }
      });
      
      if (!existingSnapshot) {
        // Create new snapshot
        await this.prismaService.navCheckpoint.create({
          data: {
            userId: userId,
            ts: new Date(navUpdate.ts),
            stage: navUpdate.stage,
            lap: navUpdate.lap,
            saiLeg: navUpdate.sai_leg || null,
            floor: navUpdate.pos.floor,
            lat: navUpdate.pos.lat,
            lon: navUpdate.pos.lon,
            acc: navUpdate.pos.acc
          }
        });
      }
      
      // Mark this minute bucket as processed
      this.snapshotBuckets.set(bucketKey, Date.now());
      
      // Clean up old buckets (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      for (const [key, timestamp] of this.snapshotBuckets.entries()) {
        if (timestamp < fiveMinutesAgo) {
          this.snapshotBuckets.delete(key);
        }
      }
      
      this.logger.log(`Navigation snapshot saved for user ${userId} at minute ${minuteBucket}`);
      
      return {
        success: true,
        message: 'Navigation snapshot saved',
        timestamp: new Date().toISOString(),
        correction: correction ? {
          snapTo: correction.snapTo,
          delta: correction.delta,
          confidence: correction.confidence
        } : null
      };
    } catch (error) {
      this.logger.error(`Error saving navigation snapshot: ${error.message}`);
      throw new HttpException(
        'Failed to save navigation snapshot',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('correction/stats')
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get navigation correction statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getCorrectionStats() {
    const stats = this.navCorrectionService.getStats();
    return {
      ...stats,
      snapshotBuckets: this.snapshotBuckets.size,
      timestamp: new Date().toISOString()
    };
  }

  @Get('offline-bundle')
  @ApiOperation({
    summary: 'Get offline navigation bundle',
    description: 'Returns complete navigation graph and metadata for offline use. Cached for 30 days (immutable). Supports ETag for efficient caching.'
  })
  @ApiResponse({ status: 200, description: 'Offline bundle with graph data' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  @Header('Cache-Control', 'public, max-age=2592000, immutable')
  async getOfflineBundle(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const graph = this.graphService.getGraph();

    const payload = {
      version: process.env.GIT_SHA ?? 'dev',
      generatedAt: new Date().toISOString(),
      graph,
      phrases: [
        'Turn left', 'Turn right', 'Continue straight',
        'Take stairs up', 'Take stairs down', 'Take elevator',
        'Walk north', 'Walk south', 'Walk east', 'Walk west',
        'Walk northeast', 'Walk northwest', 'Walk southeast', 'Walk southwest'
      ],
      units: 'metric'
    };

    const json = JSON.stringify(payload);
    const etag = '"' + createHash('sha256').update(json).digest('base64').slice(0, 27) + '"';

    // Check ETag for 304 Not Modified
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('ETag', etag);
    res.type('application/json').send(json);
  }
}