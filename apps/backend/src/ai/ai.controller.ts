import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { VoiceTokenService } from './services/voice-token.service';
import {
  AIChatRequestDto,
  AIContentGenerationRequestDto,
  AITranslationRequestDto,
  AIRecommendationRequestDto,
} from './dto/ai-request.dto';
import {
  AIChatResponseDto,
  AIContentGenerationResponseDto,
  AITranslationResponseDto,
  AIRecommendationResponseDto,
  AIUsageStatsDto,
} from './dto/ai-response.dto';
import {
  CreateVoiceTokenDto,
  VoiceTokenResponseDto,
  VoiceTokenErrorDto,
} from './dto/voice-token.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { AuditLogUtil } from '../shared/utils/audit-log.util';

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly voiceTokenService: VoiceTokenService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant' })
  @ApiResponse({ status: 200, description: 'Chat response generated successfully', type: AIChatResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  // @ApiBearerAuth() // TODO: Uncomment when auth is implemented
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async chat(
    @Request() req: any, // TODO: Type this properly when auth is implemented
    @Body() request: AIChatRequestDto,
  ): Promise<AIChatResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.chat(userId, request);
  }

  @Post('generate')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async generateContent(
    @Request() req: any,
    @Body() request: AIContentGenerationRequestDto,
  ): Promise<AIContentGenerationResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.generateContent(userId, request);
  }

  @Post('translate')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async translate(
    @Request() req: any,
    @Body() request: AITranslationRequestDto,
  ): Promise<AITranslationResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.translate(userId, request);
  }

  @Post('recommendations')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async getRecommendations(
    @Request() req: any,
    @Body() request: AIRecommendationRequestDto,
  ): Promise<AIRecommendationResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.getRecommendations(userId, request);
  }

  @Get('prayer-guidance')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async getPrayerGuidance(
    @Request() req: any,
    @Query('location') location?: string,
    @Query('language') language?: string,
  ): Promise<AIContentGenerationResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.getPrayerGuidance(userId, location, language);
  }

  @Get('ritual-assistance/:ritual')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async getRitualAssistance(
    @Request() req: any,
    @Param('ritual') ritual: string,
    @Query('step') step?: number,
  ): Promise<AIContentGenerationResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.getRitualAssistance(userId, ritual, step);
  }

  @Get('usage-stats')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async getUsageStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AIUsageStatsDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.aiService.getUsageStats(userId, start, end);
  }

  @Get('chat-history')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async getChatHistory(
    @Request() req: any,
    @Query('conversationId') conversationId?: string,
    @Query('limit') limit?: number,
  ): Promise<AIChatResponseDto[]> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.getChatHistory(userId, conversationId, limit);
  }

  @Delete('chat-history')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async deleteChatHistory(
    @Request() req: any,
    @Query('conversationId') conversationId?: string,
  ): Promise<void> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.aiService.deleteChatHistory(userId, conversationId);
  }

  @Post('voice/token')
  @ApiOperation({ 
    summary: 'Issue ephemeral token for AI voice realtime integration',
    description: 'Creates a short-lived JWT token (≤60s TTL) for voice realtime API access with rate limiting (≤5/min/user, burst 10)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Voice token created successfully', 
    type: VoiceTokenResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request data or rate limit exceeded', 
    type: VoiceTokenErrorDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing authentication token' 
  })
  @ApiBearerAuth()
  @UseGuards(SupabaseJwtGuard)
  async createVoiceToken(
    @Request() req: any,
    @Body() createVoiceTokenDto: CreateVoiceTokenDto,
  ): Promise<VoiceTokenResponseDto> {
    const requestContext = AuditLogUtil.createRequestContext(req);
    
    try {
      // Extract user information from authenticated request
      const userId = req.user?.sub;
      const userEmail = req.user?.email;

      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }

      return await this.voiceTokenService.createVoiceToken(
        userId,
        userEmail || 'unknown',
        createVoiceTokenDto,
        requestContext,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException({
        error: 'Failed to create voice token',
        code: 'VOICE_TOKEN_CREATION_FAILED',
        message: error.message,
      });
    }
  }
}