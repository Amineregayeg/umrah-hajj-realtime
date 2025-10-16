import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GraphService } from './services/graph.service';
import { RouteRequest, PathFindingResult } from './interfaces/graph.interface';

@ApiTags('graph')
@Controller('nav/graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post('route')
  @ApiOperation({ summary: 'Find route between two nodes' })
  @ApiResponse({ status: 200, description: 'Route found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 404, description: 'Nodes not found or no route available' })
  async findRoute(@Body() request: RouteRequest): Promise<PathFindingResult> {
    return this.graphService.findRoute(request);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate if a route is possible' })
  @ApiResponse({ status: 200, description: 'Route validation result' })
  async validateRoute(@Body() request: RouteRequest): Promise<{ valid: boolean; error?: string }> {
    return this.graphService.validateRoute(request);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get graph statistics' })
  @ApiResponse({ status: 200, description: 'Graph statistics' })
  getGraphStats() {
    return {
      graph: this.graphService.getGraphStats(),
      cache: this.graphService.getCacheStats()
    };
  }

  @Get('nodes/:nodeId')
  @ApiOperation({ summary: 'Get information about a specific node' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node information' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  getNodeInfo(@Param('nodeId') nodeId: string) {
    const nodeInfo = this.graphService.getNodeInfo(nodeId);
    if (!nodeInfo) {
      throw new Error('Node not found');
    }
    return nodeInfo;
  }

  @Get('floors/:floorId')
  @ApiOperation({ summary: 'Get information about a specific floor' })
  @ApiParam({ name: 'floorId', description: 'Floor identifier' })
  @ApiResponse({ status: 200, description: 'Floor information' })
  @ApiResponse({ status: 404, description: 'Floor not found' })
  getFloorInfo(@Param('floorId') floorId: string) {
    const floorInfo = this.graphService.getFloorInfo(floorId);
    if (!floorInfo) {
      throw new Error('Floor not found');
    }
    return floorInfo;
  }

  @Get('graph')
  @ApiOperation({ summary: 'Get the complete graph structure' })
  @ApiResponse({ status: 200, description: 'Complete graph data' })
  getGraph() {
    return this.graphService.getGraph();
  }

  @Post('cache/invalidate')
  @ApiOperation({ summary: 'Invalidate routing cache' })
  @ApiQuery({ name: 'pattern', required: false, description: 'Pattern to match for selective invalidation' })
  @ApiResponse({ status: 200, description: 'Cache invalidated' })
  invalidateCache(@Query('pattern') pattern?: string) {
    this.graphService.invalidateCache(pattern);
    return { message: 'Cache invalidated', pattern };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check graph system health' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async healthCheck() {
    try {
      const graph = this.graphService.getGraph();
      const stats = this.graphService.getGraphStats();
      
      // Test a simple route to verify pathfinding is working
      const testRoute: RouteRequest = {
        from: graph.nodes[0]?.id,
        to: graph.nodes[1]?.id,
        algorithm: 'dijkstra'
      };

      if (graph.nodes.length >= 2) {
        await this.graphService.findRoute(testRoute);
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}