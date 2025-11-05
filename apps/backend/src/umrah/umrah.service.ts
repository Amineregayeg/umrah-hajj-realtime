import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UmrahStepDto, UmrahStepsResponseDto } from './dto/umrah-steps.dto';
import { RitualProgressDto } from './dto/ritual-progress.dto';

@Injectable()
export class UmrahService {
  private readonly logger = new Logger(UmrahService.name);

  // Static ordered steps for Umrah ritual
  private readonly UMRAH_STEPS: UmrahStepDto[] = [
    {
      id: 'ihram',
      name: 'Ihram (State of Purity)',
      description: 'Enter the state of ritual purity with intention (Niyyah) and appropriate clothing',
      order: 1,
    },
    {
      id: 'tawaf',
      name: 'Tawaf (Circumambulation)',
      description: 'Circle the Kaaba seven times counterclockwise, starting from the Black Stone',
      order: 2,
    },
    {
      id: 'sai',
      name: 'Sa\'i (Running between Safa and Marwah)',
      description: 'Walk/run seven times between the hills of Safa and Marwah',
      order: 3,
    },
    {
      id: 'halq',
      name: 'Halq or Taqsir (Hair Cutting)',
      description: 'Shave the head (Halq) or trim the hair (Taqsir) to complete Umrah',
      order: 4,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the ordered list of Umrah ritual steps
   */
  async getSteps(): Promise<UmrahStepsResponseDto> {
    return {
      steps: this.UMRAH_STEPS,
    };
  }

  /**
   * Get the current ritual progress for a user
   * Returns default values if no active session exists
   */
  async getProgress(userId: string): Promise<RitualProgressDto> {
    try {
      // Find the most recent active session for the user
      const session = await this.prisma.umrahSession.findFirst({
        where: {
          userId,
          state: 'active',
        },
        include: {
          progress: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      if (!session) {
        // Return default progress if no active session
        return {
          sessionState: 'none',
          currentStep: 'ihram',
          tawafLaps: 0,
          saiLaps: 0,
          completedAt: null,
          startedAt: null,
        };
      }

      // Return progress from active session
      return {
        sessionState: session.state,
        currentStep: session.progress?.currentStep || 'ihram',
        tawafLaps: session.progress?.tawafLaps || 0,
        saiLaps: session.progress?.saiLaps || 0,
        completedAt: session.progress?.completedAt || null,
        startedAt: session.startedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get ritual progress for user ${userId}: ${error.message}`);

      // Return safe defaults on error
      return {
        sessionState: 'error',
        currentStep: 'ihram',
        tawafLaps: 0,
        saiLaps: 0,
        completedAt: null,
        startedAt: null,
      };
    }
  }
}
