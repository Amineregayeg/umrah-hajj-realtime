import { Injectable, Logger } from '@nestjs/common';
import { PromptBuilderService, Language, VoiceCommand } from './prompt-builder.service';

export interface CommandMatch {
  command: VoiceCommand;
  confidence: number;
  params?: Record<string, string>;
}

export interface CommandResult {
  success: boolean;
  command: VoiceCommand;
  response: string;
  action?: {
    type: 'navigate' | 'toggle' | 'switch_language';
    target?: string;
    value?: any;
  };
}

/**
 * Voice Command Service
 *
 * Parses voice commands from user speech and maps them to actions.
 * Supports multi-language command recognition.
 */
@Injectable()
export class VoiceCommandService {
  private readonly logger = new Logger(VoiceCommandService.name);

  constructor(private readonly promptBuilderService: PromptBuilderService) {}

  /**
   * Parse voice input and detect command
   */
  parseCommand(input: string, language: Language = 'en'): CommandMatch | null {
    const normalizedInput = input.toLowerCase().trim();

    // Try to match commands in order of specificity
    const patterns = this.getCommandPatterns(language);

    for (const [command, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        if (typeof pattern === 'string') {
          if (normalizedInput.includes(pattern)) {
            return {
              command: command as VoiceCommand,
              confidence: 1.0,
            };
          }
        } else {
          // RegExp pattern
          const match = normalizedInput.match(pattern);
          if (match) {
            return {
              command: command as VoiceCommand,
              confidence: 0.9,
              params: this.extractParams(command as VoiceCommand, match),
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Execute command and generate response
   */
  async executeCommand(
    match: CommandMatch,
    language: Language = 'en',
  ): Promise<CommandResult> {
    const response = this.promptBuilderService.buildVoiceCommandResponse(
      match.command,
      language,
      match.params,
    );

    const action = this.getCommandAction(match.command, match.params);

    this.logger.log(`Executed command: ${match.command}`);

    return {
      success: true,
      command: match.command,
      response,
      action,
    };
  }

  /**
   * Process voice input end-to-end
   */
  async processVoiceInput(
    input: string,
    language: Language = 'en',
  ): Promise<CommandResult | null> {
    const match = this.parseCommand(input, language);

    if (!match) {
      return null;
    }

    return this.executeCommand(match, language);
  }

  /**
   * Get command patterns for each language
   */
  private getCommandPatterns(language: Language): Record<string, (string | RegExp)[]> {
    const patterns = {
      en: {
        show_timeline: [
          'show timeline',
          'open timeline',
          'display timeline',
          'timeline',
          'show schedule',
        ],
        show_map: [
          'show map',
          'open map',
          'display map',
          'map',
          'where am i',
        ],
        show_settings: [
          'show settings',
          'open settings',
          'settings',
          'preferences',
        ],
        switch_language: [
          /switch to (english|french|arabic)/,
          /change language to (english|french|arabic)/,
          /speak (english|french|arabic)/,
        ],
        help: [
          'help',
          'what can you do',
          'commands',
          'how to use',
          'assist me',
        ],
      },
      fr: {
        show_timeline: [
          'afficher la chronologie',
          'ouvrir la chronologie',
          'chronologie',
          'afficher le programme',
        ],
        show_map: [
          'afficher la carte',
          'ouvrir la carte',
          'carte',
          'où suis-je',
        ],
        show_settings: [
          'afficher les paramètres',
          'ouvrir les paramètres',
          'paramètres',
          'préférences',
        ],
        switch_language: [
          /passer (à l\'|au |en )(anglais|français|arabe)/,
          /changer de langue (en |pour )(anglais|français|arabe)/,
          /parler (anglais|français|arabe)/,
        ],
        help: [
          'aide',
          'aidez-moi',
          'que pouvez-vous faire',
          'commandes',
        ],
      },
      ar: {
        show_timeline: [
          'أظهر الجدول الزمني',
          'افتح الجدول الزمني',
          'الجدول الزمني',
          'أظهر البرنامج',
        ],
        show_map: [
          'أظهر الخريطة',
          'افتح الخريطة',
          'الخريطة',
          'أين أنا',
        ],
        show_settings: [
          'أظهر الإعدادات',
          'افتح الإعدادات',
          'الإعدادات',
          'التفضيلات',
        ],
        switch_language: [
          /تبديل (إلى |ل)(الإنجليزية|الفرنسية|العربية)/,
          /تغيير اللغة (إلى |ل)(الإنجليزية|الفرنسية|العربية)/,
        ],
        help: [
          'مساعدة',
          'ساعدني',
          'ماذا تستطيع أن تفعل',
          'الأوامر',
        ],
      },
    };

    return patterns[language] || patterns.en;
  }

  /**
   * Extract parameters from regex match
   */
  private extractParams(command: VoiceCommand, match: RegExpMatchArray): Record<string, string> {
    if (command === 'switch_language' && match[1]) {
      const languageMap = {
        english: 'en',
        french: 'fr',
        arabic: 'ar',
        anglais: 'en',
        français: 'fr',
        arabe: 'ar',
        الإنجليزية: 'en',
        الفرنسية: 'fr',
        العربية: 'ar',
      };

      const detectedLang = match[1].toLowerCase();
      const languageCode = languageMap[detectedLang] || 'en';

      return {
        language: this.promptBuilderService.getLanguageName(languageCode as Language),
        languageCode,
      };
    }

    return {};
  }

  /**
   * Get action to perform for command
   */
  private getCommandAction(
    command: VoiceCommand,
    params?: Record<string, string>,
  ): CommandResult['action'] {
    switch (command) {
      case 'show_timeline':
        return {
          type: 'navigate',
          target: 'timeline',
        };

      case 'show_map':
        return {
          type: 'navigate',
          target: 'map',
        };

      case 'show_settings':
        return {
          type: 'navigate',
          target: 'settings',
        };

      case 'switch_language':
        return {
          type: 'switch_language',
          value: params?.languageCode || 'en',
        };

      case 'help':
        return undefined; // No action, just show help

      default:
        return undefined;
    }
  }

  /**
   * Check if input contains a command
   */
  isCommand(input: string, language: Language = 'en'): boolean {
    return this.parseCommand(input, language) !== null;
  }

  /**
   * Get all available commands for a language
   */
  getAvailableCommands(language: Language = 'en'): VoiceCommand[] {
    return ['show_timeline', 'show_map', 'show_settings', 'switch_language', 'help'];
  }

  /**
   * Get command description
   */
  getCommandDescription(command: VoiceCommand, language: Language = 'en'): string {
    const descriptions = {
      en: {
        show_timeline: 'Show the ritual timeline',
        show_map: 'Display the navigation map',
        show_settings: 'Open app settings',
        switch_language: 'Change the AI language',
        help: 'Get help and see available commands',
      },
      fr: {
        show_timeline: 'Afficher la chronologie des rituels',
        show_map: 'Afficher la carte de navigation',
        show_settings: "Ouvrir les paramètres de l'application",
        switch_language: "Changer la langue de l'IA",
        help: 'Obtenir de l\'aide et voir les commandes disponibles',
      },
      ar: {
        show_timeline: 'عرض الجدول الزمني للمناسك',
        show_map: 'عرض خريطة التنقل',
        show_settings: 'فتح إعدادات التطبيق',
        switch_language: 'تغيير لغة الذكاء الاصطناعي',
        help: 'الحصول على المساعدة ورؤية الأوامر المتاحة',
      },
    };

    return descriptions[language]?.[command] || descriptions.en[command];
  }
}
