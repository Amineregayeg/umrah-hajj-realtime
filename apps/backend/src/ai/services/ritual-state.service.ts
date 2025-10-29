import { Injectable, Logger } from '@nestjs/common';

export type RitualType = 'umrah' | 'hajj';
export type RitualStage =
  | 'ihram'
  | 'tawaf'
  | 'sai'
  | 'taqsir'
  | 'arafat'
  | 'muzdalifah'
  | 'jamarat'
  | 'completed';

export interface RitualState {
  userId: string;
  ritualType: RitualType;
  stage: RitualStage;
  tawafLaps: number;
  saiLaps: number;
  startedAt: Date;
  lastUpdatedAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface RitualProgress {
  currentStage: RitualStage;
  progress: number; // 0-100
  nextStage: RitualStage | null;
  completedStages: RitualStage[];
  remainingStages: RitualStage[];
}

/**
 * Ritual State Service
 *
 * Tracks user's progress through Umrah/Hajj rituals.
 * Provides context for AI to give stage-aware guidance.
 *
 * Note: Uses in-memory storage for now. In production, this should
 * be backed by a database (Prisma/PostgreSQL).
 */
@Injectable()
export class RitualStateService {
  private readonly logger = new Logger(RitualStateService.name);

  // In-memory storage (replace with database in production)
  private ritualStates = new Map<string, RitualState>();

  /**
   * Initialize or resume a ritual
   */
  async initializeRitual(
    userId: string,
    ritualType: RitualType,
  ): Promise<RitualState> {
    // Check if there's an active ritual
    const existingState = this.ritualStates.get(userId);

    if (existingState && existingState.isActive) {
      this.logger.log(`Resuming existing ${ritualType} for user ${userId}`);
      return existingState;
    }

    // Create new ritual state
    const newState: RitualState = {
      userId,
      ritualType,
      stage: 'ihram',
      tawafLaps: 0,
      saiLaps: 0,
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      isActive: true,
      metadata: {},
    };

    this.ritualStates.set(userId, newState);
    this.logger.log(`Initialized new ${ritualType} for user ${userId}`);

    return newState;
  }

  /**
   * Get current ritual state for user
   */
  async getRitualState(userId: string): Promise<RitualState | null> {
    const state = this.ritualStates.get(userId);

    if (!state || !state.isActive) {
      return null;
    }

    return state;
  }

  /**
   * Update ritual stage
   */
  async updateStage(userId: string, stage: RitualStage): Promise<RitualState> {
    const state = this.ritualStates.get(userId);

    if (!state) {
      throw new Error('No active ritual found for user');
    }

    state.stage = stage;
    state.lastUpdatedAt = new Date();

    this.ritualStates.set(userId, state);
    this.logger.log(`Updated stage to ${stage} for user ${userId}`);

    return state;
  }

  /**
   * Update Tawaf progress (lap completed)
   */
  async updateTawafProgress(userId: string, lapNumber: number): Promise<RitualState> {
    const state = this.ritualStates.get(userId);

    if (!state) {
      throw new Error('No active ritual found for user');
    }

    state.tawafLaps = lapNumber;
    state.lastUpdatedAt = new Date();

    // Auto-advance to next stage after 7 laps
    if (lapNumber >= 7 && state.stage === 'tawaf') {
      state.stage = 'sai';
      this.logger.log(`Tawaf completed for user ${userId}, advancing to Sa'i`);
    }

    this.ritualStates.set(userId, state);

    return state;
  }

  /**
   * Update Sa'i progress (lap completed)
   */
  async updateSaiProgress(userId: string, lapNumber: number): Promise<RitualState> {
    const state = this.ritualStates.get(userId);

    if (!state) {
      throw new Error('No active ritual found for user');
    }

    state.saiLaps = lapNumber;
    state.lastUpdatedAt = new Date();

    // Auto-advance to next stage after 7 laps
    if (lapNumber >= 7 && state.stage === 'sai') {
      if (state.ritualType === 'umrah') {
        state.stage = 'taqsir';
        this.logger.log(`Sa'i completed for user ${userId}, advancing to Taqsir`);
      } else {
        state.stage = 'arafat';
        this.logger.log(`Sa'i completed for user ${userId}, advancing to Arafat`);
      }
    }

    this.ritualStates.set(userId, state);

    return state;
  }

  /**
   * Complete ritual
   */
  async completeRitual(userId: string): Promise<RitualState> {
    const state = this.ritualStates.get(userId);

    if (!state) {
      throw new Error('No active ritual found for user');
    }

    state.stage = 'completed';
    state.isActive = false;
    state.lastUpdatedAt = new Date();

    this.ritualStates.set(userId, state);
    this.logger.log(`${state.ritualType} completed for user ${userId}`);

    return state;
  }

  /**
   * Get ritual progress summary
   */
  async getRitualProgress(userId: string): Promise<RitualProgress | null> {
    const state = await this.getRitualState(userId);

    if (!state) {
      return null;
    }

    const stages = this.getRitualStages(state.ritualType);
    const currentIndex = stages.indexOf(state.stage);
    const completedStages = stages.slice(0, currentIndex);
    const remainingStages = stages.slice(currentIndex + 1);

    const progress = Math.round((currentIndex / stages.length) * 100);
    const nextStage = remainingStages.length > 0 ? remainingStages[0] : null;

    return {
      currentStage: state.stage,
      progress,
      nextStage,
      completedStages,
      remainingStages,
    };
  }

  /**
   * Get stage description for AI context
   */
  getStageDescription(stage: RitualStage, language: 'en' | 'fr' | 'ar' = 'en'): string {
    const descriptions = {
      en: {
        ihram: 'Entering the state of Ihram - sacred consecration',
        tawaf: 'Performing Tawaf - circling the Kaaba 7 times',
        sai: "Performing Sa'i - walking between Safa and Marwa 7 times",
        taqsir: 'Performing Taqsir or Halq - cutting or shaving hair',
        arafat: 'Standing at Arafat - the most important rite of Hajj',
        muzdalifah: 'Staying at Muzdalifah - spending the night in prayer',
        jamarat: 'Stoning the Jamarat - symbolic rejection of evil',
        completed: 'Ritual completed - may Allah accept it',
      },
      fr: {
        ihram: "Entrée dans l'état d'Ihram - consécration sacrée",
        tawaf: 'Exécution du Tawaf - tourner autour de la Kaaba 7 fois',
        sai: "Exécution du Sa'i - marcher entre Safa et Marwa 7 fois",
        taqsir: 'Exécution du Taqsir ou Halq - couper ou raser les cheveux',
        arafat: 'Station à Arafat - le rite le plus important du Hajj',
        muzdalifah: 'Séjour à Muzdalifah - passer la nuit en prière',
        jamarat: 'Lapidation des Jamarat - rejet symbolique du mal',
        completed: 'Rituel terminé - qu\'Allah l\'accepte',
      },
      ar: {
        ihram: 'الدخول في الإحرام - التقديس المقدس',
        tawaf: 'أداء الطواف - الدوران حول الكعبة 7 مرات',
        sai: 'أداء السعي - المشي بين الصفا والمروة 7 مرات',
        taqsir: 'أداء التقصير أو الحلق - قص أو حلق الشعر',
        arafat: 'الوقوف بعرفة - أهم ركن من أركان الحج',
        muzdalifah: 'المبيت بمزدلفة - قضاء الليل في الصلاة',
        jamarat: 'رمي الجمرات - الرفض الرمزي للشر',
        completed: 'اكتمل المنسك - تقبل الله',
      },
    };

    return descriptions[language]?.[stage] || descriptions.en[stage];
  }

  /**
   * Get next stage name
   */
  getNextStageName(currentStage: RitualStage, ritualType: RitualType): RitualStage | null {
    const stages = this.getRitualStages(ritualType);
    const currentIndex = stages.indexOf(currentStage);

    if (currentIndex === -1 || currentIndex >= stages.length - 1) {
      return null;
    }

    return stages[currentIndex + 1];
  }

  /**
   * Get ritual stages in order
   */
  private getRitualStages(ritualType: RitualType): RitualStage[] {
    if (ritualType === 'umrah') {
      return ['ihram', 'tawaf', 'sai', 'taqsir', 'completed'];
    } else {
      return ['ihram', 'tawaf', 'sai', 'arafat', 'muzdalifah', 'jamarat', 'taqsir', 'completed'];
    }
  }

  /**
   * Check if Tawaf is complete
   */
  isTawafComplete(userId: string): boolean {
    const state = this.ritualStates.get(userId);
    return state ? state.tawafLaps >= 7 : false;
  }

  /**
   * Check if Sa'i is complete
   */
  isSaiComplete(userId: string): boolean {
    const state = this.ritualStates.get(userId);
    return state ? state.saiLaps >= 7 : false;
  }

  /**
   * Get all active rituals (for cleanup/monitoring)
   */
  async getActiveRituals(): Promise<RitualState[]> {
    const activeStates: RitualState[] = [];

    for (const state of this.ritualStates.values()) {
      if (state.isActive) {
        activeStates.push(state);
      }
    }

    return activeStates;
  }

  /**
   * Clean up old inactive rituals
   */
  async cleanupOldRituals(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    let cleanedCount = 0;

    for (const [userId, state] of this.ritualStates.entries()) {
      if (!state.isActive && state.lastUpdatedAt < cutoffTime) {
        this.ritualStates.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old ritual states`);
    }

    return cleanedCount;
  }

  /**
   * Reset ritual (for testing or when user wants to start over)
   */
  async resetRitual(userId: string): Promise<void> {
    this.ritualStates.delete(userId);
    this.logger.log(`Reset ritual state for user ${userId}`);
  }
}
