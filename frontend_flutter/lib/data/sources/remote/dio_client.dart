import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/app_config.dart';
import '../../../core/utils/logger.dart';
import '../local/secure_storage.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/log_interceptor.dart';
import 'interceptors/retry_interceptor.dart';

// Provider for SecureStorage
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

// Provider for Dio instance
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  // Add interceptors in order
  final storage = ref.watch(secureStorageProvider);

  dio.interceptors.addAll([
    AuthInterceptor(storage),
    RetryInterceptor(dio),
    LoggingInterceptor(),
  ]);

  AppLogger.i('Dio client initialized with base URL: ${AppConfig.apiBaseUrl}');

  return dio;
});
