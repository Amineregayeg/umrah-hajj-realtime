import { AIServiceType, AIProvider } from './ai-request.dto';

export class AIChatResponseDto {
  id: string;
  message: string;
  conversationId: string;
  provider: AIProvider;
  language: string;
  tokensUsed: number;
  responseTime: number;
  confidence?: number;
  createdAt: Date;
}

export class AIContentGenerationResponseDto {
  id: string;
  content: string;
  type: AIServiceType;
  provider: AIProvider;
  language: string;
  tokensUsed: number;
  prompt: string;
  quality?: number;
  createdAt: Date;
}

export class AITranslationResponseDto {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: AIProvider;
  confidence?: number;
  createdAt: Date;
}

export class AIRecommendationResponseDto {
  id: string;
  recommendations: RecommendationItem[];
  type: AIServiceType;
  provider: AIProvider;
  relevanceScore?: number;
  createdAt: Date;
}

export class RecommendationItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  score: number;
  url?: string;
  metadata?: Record<string, any>;
}

export class AIUsageStatsDto {
  userId: string;
  totalRequests: number;
  totalTokensUsed: number;
  requestsByType: Record<AIServiceType, number>;
  requestsByProvider: Record<AIProvider, number>;
  averageResponseTime: number;
  period: {
    start: Date;
    end: Date;
  };
}