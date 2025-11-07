import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'config/app_config.dart';
import 'core/utils/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Initialize configuration
  await AppConfig.initialize();

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
