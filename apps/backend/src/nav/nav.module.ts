import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NavGateway } from './nav.gateway';
import { NavController } from './nav.controller';
import { GraphController } from './graph/graph.controller';
import { GraphService } from './graph/services/graph.service';
import { GraphLoaderService } from './graph/services/graph-loader.service';
import { PathfindingService } from './graph/algorithms/pathfinding.service';
import { GraphCacheService } from './graph/services/graph-cache.service';
import { NavigationCorrectionService } from './services/navigation-correction.service';
import { HMMTrackingService } from './services/hmm-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [ConfigModule, PrismaModule, MetricsModule],
  controllers: [NavController, GraphController],
  providers: [
    NavGateway,
    GraphService,
    GraphLoaderService,
    PathfindingService,
    GraphCacheService,
    NavigationCorrectionService,
    HMMTrackingService,
  ],
  exports: [NavGateway, GraphService, NavigationCorrectionService],
})
export class NavModule {}