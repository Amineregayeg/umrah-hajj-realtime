import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { RouteRequest } from '../interfaces/graph.interface';

describe('A* Debug', () => {
  let service: PathfindingService;
  let graphLoader: GraphLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathfindingService,
        GraphLoaderService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                GRAPH_PATH: '/mnt/d/umrah-hajj-realtime/apps/backend/data/nav_graph.json',
                NODE_ENV: 'test'
              };
              return config[key];
            }
          }
        }
      ],
    }).compile();

    service = module.get<PathfindingService>(PathfindingService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);

    await graphLoader.onModuleInit();
  });

  it('should find simple A* path', async () => {
    const request: RouteRequest = {
      from: 'gate_a',
      to: 'central_hall',
      algorithm: 'astar'
    };

    const result = await service.findPath(request);
    
    console.log('A* Result:', result);
    expect(result.path).toEqual(['gate_a', 'central_hall']);
  });
});