import { Injectable, Logger } from '@nestjs/common';

export type Language = 'en' | 'fr' | 'ar';
export type VoiceCommand = 'show_timeline' | 'show_map' | 'show_settings' | 'switch_language' | 'help';

interface PromptContext {
  language: Language;
  gender?: string;
  ritualType?: 'umrah' | 'hajj';
  currentStage?: string;
  lapNumber?: number;
  totalLaps?: number;
}

interface NavigationPromptContext {
  type: 'approaching' | 'turn' | 'arrived' | 'lap_complete' | 'stage_change';
  landmark?: string;
  direction?: string;
  distance?: number;
  lapNumber?: number;
  totalLaps?: number;
  nextStage?: string;
}

/**
 * Prompt Builder Service
 *
 * Generates multi-language prompts and responses for the AI guide.
 * Supports English, French, and Arabic with context-aware messaging.
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * Build navigation prompt in appropriate language
   */
  buildNavigationPrompt(
    context: NavigationPromptContext,
    language: Language = 'en',
  ): string {
    const templates = this.getNavigationTemplates(language);

    switch (context.type) {
      case 'approaching':
        return this.formatTemplate(templates.approaching, {
          landmark: context.landmark,
          distance: context.distance?.toString(),
        });

      case 'turn':
        return this.formatTemplate(templates.turn, {
          direction: context.direction,
          distance: context.distance?.toString(),
        });

      case 'arrived':
        return this.formatTemplate(templates.arrived, {
          landmark: context.landmark,
          nextStage: context.nextStage,
        });

      case 'lap_complete':
        return this.formatTemplate(templates.lap_complete, {
          lapNumber: context.lapNumber?.toString(),
          totalLaps: context.totalLaps?.toString(),
          nextStage: context.nextStage,
        });

      case 'stage_change':
        return this.formatTemplate(templates.stage_change, {
          nextStage: context.nextStage,
        });

      default:
        return templates.continue;
    }
  }

  /**
   * Build voice command response
   */
  buildVoiceCommandResponse(
    command: VoiceCommand,
    language: Language = 'en',
    params?: Record<string, string>,
  ): string {
    const templates = this.getVoiceCommandTemplates(language);

    switch (command) {
      case 'show_timeline':
        return templates.show_timeline;

      case 'show_map':
        return templates.show_map;

      case 'show_settings':
        return templates.show_settings;

      case 'switch_language':
        return this.formatTemplate(templates.switch_language, {
          language: params?.language || 'English',
        });

      case 'help':
        return templates.help;

      default:
        return templates.unknown;
    }
  }

  /**
   * Build welcome message
   */
  buildWelcomeMessage(context: PromptContext): string {
    const templates = this.getWelcomeTemplates(context.language);
    const ritualName = context.ritualType === 'hajj' ?
      (context.language === 'ar' ? 'الحج' : context.language === 'fr' ? 'Hajj' : 'Hajj') :
      (context.language === 'ar' ? 'العمرة' : context.language === 'fr' ? 'Omra' : 'Umrah');

    return this.formatTemplate(templates.welcome, {
      ritual: ritualName,
    });
  }

  /**
   * Build encouragement message
   */
  buildEncouragementMessage(
    type: 'start' | 'progress' | 'completion',
    language: Language = 'en',
  ): string {
    const templates = this.getEncouragementTemplates(language);

    switch (type) {
      case 'start':
        return templates.start;
      case 'progress':
        return templates.progress;
      case 'completion':
        return templates.completion;
      default:
        return templates.progress;
    }
  }

  /**
   * Build error message
   */
  buildErrorMessage(
    errorType: 'navigation_failed' | 'session_expired' | 'unknown_error',
    language: Language = 'en',
  ): string {
    const templates = this.getErrorTemplates(language);

    switch (errorType) {
      case 'navigation_failed':
        return templates.navigation_failed;
      case 'session_expired':
        return templates.session_expired;
      default:
        return templates.unknown_error;
    }
  }

  /**
   * Format template with variables
   */
  private formatTemplate(template: string, variables?: Record<string, string>): string {
    if (!variables) return template;

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      if (value) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    }

    // Remove unfilled placeholders
    result = result.replace(/\{[^}]+\}/g, '');

    // Clean up extra spaces
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  // ========================================
  // TEMPLATE COLLECTIONS
  // ========================================

  private getNavigationTemplates(language: Language) {
    const templates = {
      en: {
        approaching: "You're approaching {landmark}{distance}",
        turn: "Turn {direction}{distance}",
        arrived: "You've arrived at {landmark}. {nextStage}",
        lap_complete: "You've completed lap {lapNumber} of {totalLaps}. {nextStage}",
        stage_change: "Great progress! {nextStage}",
        continue: "Continue on your path",
      },
      fr: {
        approaching: "Vous approchez de {landmark}{distance}",
        turn: "Tournez à {direction}{distance}",
        arrived: "Vous êtes arrivé à {landmark}. {nextStage}",
        lap_complete: "Vous avez terminé le tour {lapNumber} sur {totalLaps}. {nextStage}",
        stage_change: "Excellent progrès ! {nextStage}",
        continue: "Continuez votre chemin",
      },
      ar: {
        approaching: "أنت تقترب من {landmark}{distance}",
        turn: "انعطف {direction}{distance}",
        arrived: "لقد وصلت إلى {landmark}. {nextStage}",
        lap_complete: "لقد أتممت الشوط {lapNumber} من {totalLaps}. {nextStage}",
        stage_change: "تقدم رائع! {nextStage}",
        continue: "تابع طريقك",
      },
    };

    return templates[language] || templates.en;
  }

  private getVoiceCommandTemplates(language: Language) {
    const templates = {
      en: {
        show_timeline: "Opening the timeline for you",
        show_map: "Opening the map",
        show_settings: "Opening settings",
        switch_language: "Switching to {language}",
        help: "I can help you with navigation, ritual guidance, and answering questions about Umrah and Hajj. What would you like to know?",
        unknown: "I didn't understand that command. Try saying 'help' to see what I can do.",
      },
      fr: {
        show_timeline: "J'ouvre la chronologie pour vous",
        show_map: "J'ouvre la carte",
        show_settings: "J'ouvre les paramètres",
        switch_language: "Passage à {language}",
        help: "Je peux vous aider avec la navigation, les conseils rituels et répondre aux questions sur l'Omra et le Hajj. Que souhaitez-vous savoir ?",
        unknown: "Je n'ai pas compris cette commande. Essayez de dire 'aide' pour voir ce que je peux faire.",
      },
      ar: {
        show_timeline: "أفتح الجدول الزمني لك",
        show_map: "أفتح الخريطة",
        show_settings: "أفتح الإعدادات",
        switch_language: "التبديل إلى {language}",
        help: "يمكنني مساعدتك في التنقل والإرشاد الديني والإجابة على الأسئلة حول العمرة والحج. ماذا تريد أن تعرف؟",
        unknown: "لم أفهم هذا الأمر. حاول قول 'مساعدة' لمعرفة ما يمكنني فعله.",
      },
    };

    return templates[language] || templates.en;
  }

  private getWelcomeTemplates(language: Language) {
    const templates = {
      en: {
        welcome: "Peace be upon you. I'm your AI guide for {ritual}. I'm here to help you throughout your sacred journey. How can I assist you?",
      },
      fr: {
        welcome: "Que la paix soit sur vous. Je suis votre guide IA pour {ritual}. Je suis là pour vous aider tout au long de votre voyage sacré. Comment puis-je vous aider ?",
      },
      ar: {
        welcome: "السلام عليكم. أنا مرشدك الذكي لـ {ritual}. أنا هنا لمساعدتك طوال رحلتك المقدسة. كيف يمكنني مساعدتك؟",
      },
    };

    return templates[language] || templates.en;
  }

  private getEncouragementTemplates(language: Language) {
    const templates = {
      en: {
        start: "May Allah accept your worship. Let's begin your journey.",
        progress: "You're doing wonderfully. Keep going, may Allah make it easy for you.",
        completion: "Alhamdulillah! You've completed this ritual. May Allah accept your efforts.",
      },
      fr: {
        start: "Qu'Allah accepte votre adoration. Commençons votre voyage.",
        progress: "Vous faites merveilleusement bien. Continuez, qu'Allah vous facilite.",
        completion: "Alhamdoulillah ! Vous avez terminé ce rituel. Qu'Allah accepte vos efforts.",
      },
      ar: {
        start: "تقبل الله عبادتك. لنبدأ رحلتك.",
        progress: "أنت تقوم بعمل رائع. استمر، يسر الله لك.",
        completion: "الحمد لله! لقد أتممت هذا المنسك. تقبل الله سعيك.",
      },
    };

    return templates[language] || templates.en;
  }

  private getErrorTemplates(language: Language) {
    const templates = {
      en: {
        navigation_failed: "I'm having trouble with navigation right now. Please try again in a moment.",
        session_expired: "Your session has expired. Please start a new session to continue.",
        unknown_error: "I encountered an error. Please try again or contact support if the problem persists.",
      },
      fr: {
        navigation_failed: "J'ai des difficultés avec la navigation en ce moment. Veuillez réessayer dans un instant.",
        session_expired: "Votre session a expiré. Veuillez démarrer une nouvelle session pour continuer.",
        unknown_error: "J'ai rencontré une erreur. Veuillez réessayer ou contacter le support si le problème persiste.",
      },
      ar: {
        navigation_failed: "أواجه صعوبة في التنقل الآن. يرجى المحاولة مرة أخرى بعد قليل.",
        session_expired: "انتهت جلستك. يرجى بدء جلسة جديدة للمتابعة.",
        unknown_error: "واجهت خطأ. يرجى المحاولة مرة أخرى أو الاتصال بالدعم إذا استمرت المشكلة.",
      },
    };

    return templates[language] || templates.en;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Language[] {
    return ['en', 'fr', 'ar'];
  }

  /**
   * Validate language code
   */
  isLanguageSupported(language: string): boolean {
    return ['en', 'fr', 'ar'].includes(language);
  }

  /**
   * Get language name
   */
  getLanguageName(language: Language): string {
    const names = {
      en: 'English',
      fr: 'Français',
      ar: 'العربية',
    };

    return names[language] || 'English';
  }
}
