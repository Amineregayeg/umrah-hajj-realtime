class AppConfig {
  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'ws://localhost:3001',
  );

  // Supabase Configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  // Environment
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  // Feature Flags
  static const bool enableAIVoice = bool.fromEnvironment(
    'ENABLE_AI_VOICE',
    defaultValue: false,
  );

  static const bool enableARQibla = bool.fromEnvironment(
    'ENABLE_AR_QIBLA',
    defaultValue: false,
  );

  static const bool enableOfflineMode = bool.fromEnvironment(
    'ENABLE_OFFLINE_MODE',
    defaultValue: true,
  );

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);

  // Cache
  static const Duration cacheValidityDuration = Duration(hours: 24);

  // Initialization
  static Future<void> initialize() async {
    // Perform any async initialization here
    // E.g., load from .env file, Supabase init, etc.
  }

  // Helper getters
  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';
  static bool get isStaging => environment == 'staging';
}
