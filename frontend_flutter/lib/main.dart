import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'config/app_config.dart';
import 'core/utils/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Initialize configuration
  await AppConfig.initialize();

  // Initialize Supabase only if real credentials are provided (not placeholders)
  final hasValidSupabaseUrl = AppConfig.supabaseUrl.isNotEmpty &&
      !AppConfig.supabaseUrl.contains('YOUR_SUPABASE_URL_HERE') &&
      AppConfig.supabaseUrl.startsWith('http');

  final hasValidSupabaseKey = AppConfig.supabaseAnonKey.isNotEmpty &&
      !AppConfig.supabaseAnonKey.contains('YOUR_SUPABASE_ANON_KEY_HERE');

  if (hasValidSupabaseUrl && hasValidSupabaseKey) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      debug: AppConfig.isDevelopment,
    );
    AppLogger.i('Supabase initialized: ${AppConfig.supabaseUrl}');
  } else {
    AppLogger.w('Supabase credentials not provided - running without Supabase');
  }

  // Setup logging
  AppLogger.i('App starting in ${AppConfig.environment} mode');
  AppLogger.i('API Base URL: ${AppConfig.apiBaseUrl}');

  runApp(
    // ProviderScope is required for Riverpod
    const ProviderScope(
      child: MyApp(),
    ),
  );
}
