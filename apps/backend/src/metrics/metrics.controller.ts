import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint() // Exclude from Swagger as it's for Prometheus scraping
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics();
  }

  @Get('metrics/summary')
  @ApiOperation({ 
    summary: 'Get metrics summary',
    description: 'Returns a summary of available metrics and collection status',
    tags: ['Health']
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        processMetricsCollected: { type: 'boolean' },
        promClientAvailable: { type: 'boolean' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  getMetricsSummary() {
    return this.metricsService.getMetricsSummary();
  }

  @Get('metrics/build_info')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ 
    summary: 'Get build information in Prometheus format',
    description: 'Returns build information including version, git SHA, and build date in Prometheus metrics format',
    tags: ['Metrics']
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Build information in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: '# HELP build_info Build information\n# TYPE build_info gauge\nbuild_info{version="0.0.1",git_sha="abc123",build_date="2025-10-08T12:00:00.000Z"} 1'
        }
      }
    }
  })
  async getBuildInfo(): Promise<string> {
    try {
      const buildInfo = this.metricsService.getBuildInfo();
      
      // Try to get git SHA if not set in environment
      let gitSha = buildInfo.gitSha;
      if (gitSha === 'unknown') {
        try {
          const { stdout } = await execAsync('git rev-parse HEAD');
          gitSha = stdout.trim().substring(0, 8);
        } catch {
          gitSha = 'unknown';
        }
      }

      // Update the metrics service with fresh build info
      this.metricsService.updateBuildInfo(buildInfo.version, gitSha, buildInfo.buildDate);

      const timestamp = Date.now();
      let output = '# HELP build_info Build information\n';
      output += '# TYPE build_info gauge\n';
      output += `build_info{version="${buildInfo.version}",git_sha="${gitSha}",build_date="${buildInfo.buildDate}",node_version="${buildInfo.nodeVersion}",environment="${buildInfo.environment}"} 1 ${timestamp}\n`;
      
      return output;
    } catch (error) {
      return '# Error retrieving build info\n';
    }
  }
}