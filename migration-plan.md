# Phase B: Migration Plan & Architecture Design

**Project:** Umrah & Hajj Realtime Mobile App - Flutter Frontend Migration
**Date:** 2025-11-07
**Status:** Planning Phase

---

## Table of Contents
1. [Target Flutter SDK & Justification](#1-target-flutter-sdk--justification)
2. [Project Layout](#2-project-layout)
3. [State Management](#3-state-management)
4. [HTTP Client & API Adapter](#4-http-client--api-adapter)
5. [Theming & Styling](#5-theming--styling)
6. [Navigation Strategy](#6-navigation-strategy)
7. [Error Handling & Logging](#7-error-handling--logging)
8. [Testing Plan](#8-testing-plan)
9. [Prioritized Implementation Steps](#9-prioritized-implementation-steps)
10. [Risk Areas](#10-risk-areas)
11. [Dependencies (pubspec.yaml)](#11-dependencies-pubspecyaml)

---

## 1. Target Flutter SDK & Justification

### Target Version
**Flutter SDK:** `3.24.x` (latest stable as of Nov 2025)

### Justification
- **Stability:** 3.24.x is the current stable channel with LTS support
- **Null Safety:** Fully mature null-safety support
- **Performance:** Impeller rendering engine on iOS (stable), Android preview
- **Material 3:** Complete M3 theming support (matches design system)
- **Hot Reload:** Fast iteration during development
- **Platform Support:** Android, iOS with single codebase
- **Package Ecosystem:** Mature package ecosystem for all required features

### Minimum SDK Version
```yaml
environment:
  sdk: '>=3.1.0 <4.0.0'
  flutter: '>=3.24.0'
```

---

## 2. Project Layout

### Recommended Directory Structure
```
frontend_flutter/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── app.dart                     # MaterialApp configuration
│   │
│   ├── config/
│   │   ├── env.dart                 # Environment variables
│   │   ├── constants.dart           # App constants
│   │   └── app_config.dart          # Feature flags, API URLs
│   │
│   ├── core/
│   │   ├── routes/
│   │   │   ├── app_router.dart      # Route configuration
│   │   │   └── route_names.dart     # Route name constants
│   │   ├── theme/
│   │   │   ├── app_theme.dart       # ThemeData (light/dark)
│   │   │   ├── app_colors.dart      # Color palette
│   │   │   ├── app_text_styles.dart # Typography
│   │   │   └── app_dimensions.dart  # Spacing, sizes
│   │   ├── errors/
│   │   │   ├── exceptions.dart      # Custom exceptions
│   │   │   └── failures.dart        # Failure classes
│   │   └── utils/
│   │       ├── logger.dart          # Logging utility
│   │       ├── validators.dart      # Form validators
│   │       └── extensions.dart      # Dart extensions
│   │
│   ├── data/
│   │   ├── models/                  # Data models (JSON serializable)
│   │   │   ├── profile.dart
│   │   │   ├── consent.dart
│   │   │   ├── quran.dart
│   │   │   ├── prayer_time.dart
│   │   │   ├── umrah_step.dart
│   │   │   └── nav_update.dart
│   │   ├── repositories/            # Data layer (API + cache)
│   │   │   ├── profile_repository.dart
│   │   │   ├── quran_repository.dart
│   │   │   ├── content_repository.dart
│   │   │   ├── navigation_repository.dart
│   │   │   └── auth_repository.dart
│   │   ├── sources/
│   │   │   ├── remote/             # Remote data sources
│   │   │   │   ├── api_client.dart
│   │   │   │   ├── dio_interceptors.dart
│   │   │   │   ├── profile_api.dart
│   │   │   │   ├── quran_api.dart
│   │   │   │   └── websocket_client.dart
│   │   │   └── local/              # Local data sources
│   │   │       ├── hive_storage.dart
│   │   │       ├── secure_storage.dart
│   │   │       └── offline_cache.dart
│   │   └── dto/                    # Data transfer objects
│   │       ├── profile_dto.dart
│   │       └── quran_dto.dart
│   │
│   ├── domain/
│   │   ├── entities/               # Business entities
│   │   │   ├── user_profile.dart
│   │   │   ├── qibla_direction.dart
│   │   │   └── prayer_times.dart
│   │   └── usecases/               # Business logic
│   │       ├── get_qibla_direction.dart
│   │       ├── fetch_prayer_times.dart
│   │       └── update_profile.dart
│   │
│   ├── presentation/
│   │   ├── providers/              # Riverpod providers
│   │   │   ├── auth_provider.dart
│   │   │   ├── profile_provider.dart
│   │   │   ├── quran_provider.dart
│   │   │   ├── navigation_provider.dart
│   │   │   └── theme_provider.dart
│   │   ├── screens/
│   │   │   ├── splash/
│   │   │   │   ├── splash_screen.dart
│   │   │   │   └── widgets/
│   │   │   ├── onboarding/
│   │   │   │   ├── main_screen.dart
│   │   │   │   └── language_selector.dart
│   │   │   ├── auth/
│   │   │   │   ├── login_screen.dart
│   │   │   │   ├── email_verification_screen.dart
│   │   │   │   └── widgets/
│   │   │   ├── home/
│   │   │   │   ├── home_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── location_chip.dart
│   │   │   │       └── start_umrah_cta.dart
│   │   │   ├── profile/
│   │   │   │   ├── profile_setup_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── profile_form.dart
│   │   │   │       └── accessibility_toggles.dart
│   │   │   ├── qibla/
│   │   │   │   ├── qibla_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── compass_widget.dart
│   │   │   │       └── ar_view_button.dart
│   │   │   ├── quran/
│   │   │   │   ├── quran_screen.dart
│   │   │   │   ├── surah_list_screen.dart
│   │   │   │   ├── surah_detail_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── surah_card.dart
│   │   │   │       ├── ayah_list.dart
│   │   │   │       └── audio_player_bar.dart
│   │   │   ├── salat/
│   │   │   │   ├── prayer_times_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── prayer_card.dart
│   │   │   │       └── hijri_date_widget.dart
│   │   │   ├── guidance/
│   │   │   │   ├── guidance_screen.dart
│   │   │   │   ├── step_detail_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── progress_indicator.dart
│   │   │   │       └── instruction_card.dart
│   │   │   ├── navigation/
│   │   │   │   ├── map_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       ├── floor_selector.dart
│   │   │   │       ├── position_marker.dart
│   │   │   │       └── offline_banner.dart
│   │   │   ├── consent/
│   │   │   │   ├── consent_screen.dart
│   │   │   │   └── widgets/
│   │   │   │       └── consent_toggle.dart
│   │   │   └── offline/
│   │   │       └── offline_indicator.dart
│   │   └── widgets/
│   │       ├── common/
│   │       │   ├── custom_app_bar.dart
│   │       │   ├── custom_button.dart
│   │       │   ├── custom_text_field.dart
│   │       │   ├── loading_indicator.dart
│   │       │   ├── error_widget.dart
│   │       │   └── bottom_nav_bar.dart
│   │       └── shared/
│   │           ├── gradient_background.dart
│   │           └── blur_container.dart
│   │
│   └── services/
│       ├── location_service.dart
│       ├── compass_service.dart
│       ├── audio_service.dart
│       └── analytics_service.dart
│
├── assets/
│   ├── images/
│   │   ├── kaaba.png
│   │   ├── background_home.jpg
│   │   └── logo.png
│   ├── fonts/
│   │   └── Inter/
│   │       ├── Inter-Regular.ttf
│   │       ├── Inter-Medium.ttf
│   │       └── Inter-Bold.ttf
│   └── offline/
│       └── navigation_bundle.json
│
├── test/
│   ├── unit/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── usecases/
│   ├── widget/
│   │   ├── screens/
│   │   └── widgets/
│   └── integration/
│       ├── login_flow_test.dart
│       └── quran_browsing_test.dart
│
├── pubspec.yaml
├── analysis_options.yaml
├── .env.example
└── README.md
```

### Rationale
- **Separation of Concerns:** Clear layering (data, domain, presentation)
- **Scalability:** Easy to add new features without refactoring
- **Testability:** Each layer can be tested independently
- **Maintainability:** Logical file grouping and naming conventions
- **Clean Architecture:** Inspired by Uncle Bob's Clean Architecture principles

---

## 3. State Management

### Chosen Solution: **Riverpod**

### Justification
- **Type Safety:** Compile-time safety, no runtime errors from incorrect provider usage
- **Testability:** Providers are easily mockable and overridable for testing
- **Performance:** Fine-grained reactivity, only rebuilds affected widgets
- **Dev Experience:** Excellent IDE support, clear error messages
- **Scoped State:** Per-screen or global state with same API
- **No BuildContext:** Access providers anywhere (services, models)
- **Community:** Strong community support, actively maintained by Remi Rousselet
- **Migration Path:** Easy to refactor from Provider if needed

### Provider Types Usage
```dart
// State (immutable)
final themeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// FutureProvider (async data)
final prayerTimesProvider = FutureProvider.autoDispose.family<PrayerTimes, LatLng>(
  (ref, location) async {
    final repo = ref.watch(contentRepositoryProvider);
    return repo.getPrayerTimes(location.latitude, location.longitude);
  },
);

// StreamProvider (WebSocket)
final navigationStreamProvider = StreamProvider<NavUpdate>((ref) {
  final wsClient = ref.watch(websocketClientProvider);
  return wsClient.navigationStream;
});

// StateNotifier (complex state)
final profileNotifierProvider = StateNotifierProvider<ProfileNotifier, ProfileState>(
  (ref) => ProfileNotifier(ref.watch(profileRepositoryProvider)),
);
```

### Alternative Considered
- **Bloc:** More boilerplate, overkill for this app size
- **Provider:** Less type-safe than Riverpod
- **GetX:** Not recommended (global state, unclear reactivity)

---

## 4. HTTP Client & API Adapter

### Chosen Solution: **dio** package

### Justification
- **Interceptors:** Built-in support for auth tokens, retry logic, logging
- **Error Handling:** Centralized error handling with interceptors
- **Request/Response Transformation:** Easy to add global transformations
- **Timeout Configuration:** Per-request or global timeouts
- **FormData Support:** For file uploads (profile pictures, etc.)
- **Cancel Tokens:** Ability to cancel in-flight requests
- **HTTP/2 Support:** Better performance on modern servers
- **Testing:** Easy to mock with dio_mock_adapter

### Implementation Pattern

#### API Client (Singleton)
```dart
// lib/data/sources/remote/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  // Add interceptors
  dio.interceptors.addAll([
    ref.watch(authInterceptorProvider),
    ref.watch(logInterceptorProvider),
    ref.watch(retryInterceptorProvider),
  ]);

  return dio;
});
```

#### Auth Interceptor (Bearer Token)
```dart
// lib/data/sources/remote/dio_interceptors.dart
class AuthInterceptor extends Interceptor {
  final SecureStorage _secureStorage;

  AuthInterceptor(this._secureStorage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _secureStorage.read(key: 'auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired, attempt refresh or logout
      // ... refresh logic ...
    }
    handler.next(err);
  }
}
```

#### Retry Interceptor (Exponential Backoff)
```dart
class RetryInterceptor extends Interceptor {
  final int maxRetries = 3;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err) && err.requestOptions.extra['retryCount'] < maxRetries) {
      final retryCount = (err.requestOptions.extra['retryCount'] ?? 0) + 1;
      err.requestOptions.extra['retryCount'] = retryCount;

      // Exponential backoff: 1s, 2s, 4s
      await Future.delayed(Duration(seconds: pow(2, retryCount - 1).toInt()));

      try {
        final response = await Dio().fetch(err.requestOptions);
        handler.resolve(response);
      } catch (e) {
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        (err.response?.statusCode ?? 0) >= 500;
  }
}
```

#### Example API Service
```dart
// lib/data/sources/remote/quran_api.dart
class QuranApi {
  final Dio _dio;

  QuranApi(this._dio);

  Future<List<QuranSurah>> getSurahs({String lang = 'ar'}) async {
    final response = await _dio.get(
      '/content/quran/surahs',
      queryParameters: {'lang': lang},
    );
    return (response.data['surahs'] as List)
        .map((json) => QuranSurah.fromJson(json))
        .toList();
  }

  Future<QuranSurah> getSurah(int id, {String lang = 'ar'}) async {
    final response = await _dio.get(
      '/content/quran/surah/$id',
      queryParameters: {'lang': lang},
    );
    return QuranSurah.fromJson(response.data);
  }
}
```

### WebSocket Client
```dart
// lib/data/sources/remote/websocket_client.dart
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketClient {
  WebSocketChannel? _channel;
  final String _wsUrl;
  final SecureStorage _storage;
  Stream<dynamic>? _stream;

  Stream<NavUpdate> get navigationStream =>
      _stream!.map((data) => NavUpdate.fromJson(jsonDecode(data)));

  Future<void> connect() async {
    final token = await _storage.read(key: 'auth_token');
    _channel = WebSocketChannel.connect(
      Uri.parse('$_wsUrl?token=$token'),
    );
    _stream = _channel!.stream.asBroadcastStream();
  }

  void send(NavUpdate update) {
    _channel?.sink.add(jsonEncode(update.toJson()));
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
```

---

## 5. Theming & Styling

### Theme Architecture

#### Color Palette (from HTML templates)
```dart
// lib/core/theme/app_colors.dart
class AppColors {
  // Primary
  static const primary = Color(0xFF169C4C);  // #169c4c

  // Light theme
  static const backgroundLight = Color(0xFFF6F8F7);  // #f6f8f7
  static const textLight = Color(0xFF112118);         // #112118
  static const subtleLight = Color(0xFFE8F3EC);       // #e8f3ec
  static const placeholderLight = Color(0xFF50956C);  // #50956c

  // Dark theme
  static const backgroundDark = Color(0xFF112118);    // #112118
  static const textDark = Color(0xFFF6F8F7);          // #f6f8f7
  static const subtleDark = Color(0xFF1A3224);        // #1a3224
  static const placeholderDark = Color(0xFFA3C9B3);   // #a3c9b3

  // Semantic colors
  static const success = Color(0xFF10B981);
  static const error = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF3B82F6);
}
```

#### Typography (Inter font)
```dart
// lib/core/theme/app_text_styles.dart
class AppTextStyles {
  static const String fontFamily = 'Inter';

  // Headings
  static const h1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    height: 1.2,
  );

  static const h2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    height: 1.3,
  );

  static const h3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  // Body
  static const bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  // Labels
  static const labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );
}
```

#### ThemeData
```dart
// lib/core/theme/app_theme.dart
class AppTheme {
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: AppColors.primary,
      background: AppColors.backgroundLight,
      surface: AppColors.subtleLight,
      onPrimary: Colors.white,
      onBackground: AppColors.textLight,
      onSurface: AppColors.textLight,
    ),
    scaffoldBackgroundColor: AppColors.backgroundLight,
    fontFamily: AppTextStyles.fontFamily,
    textTheme: TextTheme(
      displayLarge: AppTextStyles.h1.copyWith(color: AppColors.textLight),
      displayMedium: AppTextStyles.h2.copyWith(color: AppColors.textLight),
      displaySmall: AppTextStyles.h3.copyWith(color: AppColors.textLight),
      bodyLarge: AppTextStyles.bodyLarge.copyWith(color: AppColors.textLight),
      bodyMedium: AppTextStyles.bodyMedium.copyWith(color: AppColors.textLight),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.subtleLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.dark(
      primary: AppColors.primary,
      background: AppColors.backgroundDark,
      surface: AppColors.subtleDark,
      onPrimary: Colors.white,
      onBackground: AppColors.textDark,
      onSurface: AppColors.textDark,
    ),
    scaffoldBackgroundColor: AppColors.backgroundDark,
    fontFamily: AppTextStyles.fontFamily,
    // ... similar to lightTheme but with dark colors
  );
}
```

---

## 6. Navigation Strategy

### Chosen Approach: **GoRouter** (Navigator 2.0)

### Justification
- **Declarative Routing:** URL-based navigation (deep linking ready)
- **Type Safety:** Route parameters are type-safe
- **Nested Navigation:** Bottom nav with nested routes
- **Guards:** Built-in redirect logic for auth guards
- **Deep Linking:** Web and mobile deep link support out of the box
- **State Restoration:** Automatic state restoration on app restart

### Route Structure
```dart
// lib/core/routes/app_router.dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isOnLoginPage = state.location == '/login';

      if (!isLoggedIn && !isOnLoginPage) return '/login';
      if (isLoggedIn && isOnLoginPage) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const MainScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/email-verification',
        builder: (context, state) => const EmailVerificationScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/qibla',
            builder: (context, state) => const QiblaScreen(),
          ),
          GoRoute(
            path: '/quran',
            builder: (context, state) => const QuranScreen(),
            routes: [
              GoRoute(
                path: 'surah/:id',
                builder: (context, state) {
                  final id = int.parse(state.pathParameters['id']!);
                  return SurahDetailScreen(surahId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/salat',
            builder: (context, state) => const PrayerTimesScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileSetupScreen(),
      ),
      GoRoute(
        path: '/consent',
        builder: (context, state) => const ConsentScreen(),
      ),
      GoRoute(
        path: '/guidance',
        builder: (context, state) => const GuidanceScreen(),
        routes: [
          GoRoute(
            path: 'step/:stepId',
            builder: (context, state) {
              final stepId = int.parse(state.pathParameters['stepId']!);
              return StepDetailScreen(stepId: stepId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/navigation',
        builder: (context, state) => const MapScreen(),
      ),
    ],
  );
});
```

---

## 7. Error Handling & Logging

### Error Handling Strategy

#### Custom Exceptions
```dart
// lib/core/errors/exceptions.dart
class ServerException implements Exception {
  final String message;
  final int? statusCode;
  ServerException({required this.message, this.statusCode});
}

class NetworkException implements Exception {
  final String message;
  NetworkException({required this.message});
}

class CacheException implements Exception {
  final String message;
  CacheException({required this.message});
}

class AuthException implements Exception {
  final String message;
  AuthException({required this.message});
}
```

#### Failure Classes (for Repository layer)
```dart
// lib/core/errors/failures.dart
abstract class Failure {
  final String message;
  const Failure(this.message);
}

class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}
```

#### Error Widget
```dart
// lib/presentation/widgets/common/error_widget.dart
class CustomErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const CustomErrorWidget({
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ],
      ),
    );
  }
}
```

### Logging Strategy

#### Logger Utility
```dart
// lib/core/utils/logger.dart
import 'package:logger/logger.dart';

class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 50,
      colors: true,
      printEmojis: true,
    ),
  );

  static void d(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.d(message, error: error, stackTrace: stackTrace);
  }

  static void i(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  static void w(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  static void e(String message, [dynamic error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }
}
```

#### Analytics Hooks
```dart
// lib/services/analytics_service.dart
class AnalyticsService {
  void logScreenView(String screenName) {
    // Hook for Firebase Analytics, Mixpanel, etc.
    AppLogger.i('Screen View: $screenName');
  }

  void logEvent(String eventName, Map<String, dynamic> parameters) {
    AppLogger.i('Event: $eventName', parameters);
  }

  void logError(String error, StackTrace? stackTrace) {
    // Hook for Crashlytics, Sentry, etc.
    AppLogger.e('Error: $error', null, stackTrace);
  }
}
```

---

## 8. Testing Plan

### Testing Pyramid
```
           /\
          /  \  Integration Tests (10%)
         /____\
        /      \ Widget Tests (30%)
       /________\
      /          \ Unit Tests (60%)
     /__________  \
```

### Unit Tests
**Target:** 60% of tests
**Focus:** Business logic, models, repositories, usecases

#### Example: Model Test
```dart
// test/unit/models/quran_test.dart
void main() {
  group('QuranSurah', () {
    test('should correctly parse from JSON', () {
      final json = {
        'id': 1,
        'name': 'الفاتحة',
        'transliteration': 'Al-Fatihah',
        'translation': 'The Opening',
        'type': 'makkiyyah',
        'ayah_count': 7,
      };

      final surah = QuranSurah.fromJson(json);

      expect(surah.id, 1);
      expect(surah.name, 'الفاتحة');
      expect(surah.ayahCount, 7);
    });

    test('should correctly convert to JSON', () {
      final surah = QuranSurah(
        id: 1,
        name: 'الفاتحة',
        transliteration: 'Al-Fatihah',
        translation: 'The Opening',
        type: 'makkiyyah',
        ayahCount: 7,
      );

      final json = surah.toJson();

      expect(json['id'], 1);
      expect(json['name'], 'الفاتحة');
    });
  });
}
```

#### Example: Repository Test (Mocked)
```dart
// test/unit/repositories/quran_repository_test.dart
void main() {
  late QuranRepository repository;
  late MockQuranApi mockApi;
  late MockHiveStorage mockCache;

  setUp(() {
    mockApi = MockQuranApi();
    mockCache = MockHiveStorage();
    repository = QuranRepository(api: mockApi, cache: mockCache);
  });

  group('getSurahs', () {
    test('should return surahs from API when online', () async {
      when(mockApi.getSurahs(lang: 'ar'))
          .thenAnswer((_) async => [mockSurah1, mockSurah2]);

      final result = await repository.getSurahs(lang: 'ar');

      expect(result.length, 2);
      verify(mockApi.getSurahs(lang: 'ar')).called(1);
    });

    test('should return cached surahs when offline', () async {
      when(mockApi.getSurahs(lang: 'ar'))
          .thenThrow(NetworkException('No internet'));
      when(mockCache.getSurahs())
          .thenAnswer((_) async => [mockSurah1]);

      final result = await repository.getSurahs(lang: 'ar');

      expect(result.length, 1);
      verify(mockCache.getSurahs()).called(1);
    });
  });
}
```

### Widget Tests
**Target:** 30% of tests
**Focus:** UI components, screens, user interactions

#### Example: Button Widget Test
```dart
// test/widget/widgets/custom_button_test.dart
void main() {
  testWidgets('CustomButton displays text and responds to tap', (tester) async {
    var tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomButton(
            text: 'Start Umrah',
            onPressed: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Start Umrah'), findsOneWidget);

    await tester.tap(find.byType(CustomButton));
    await tester.pump();

    expect(tapped, true);
  });
}
```

### Integration Tests
**Target:** 10% of tests
**Focus:** End-to-end flows, critical user journeys

#### Example: Login Flow Test
```dart
// test/integration/login_flow_test.dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('User can login and see home screen', (tester) async {
    await tester.pumpWidget(const MyApp());

    // Start on splash screen
    expect(find.byType(SplashScreen), findsOneWidget);

    await tester.pumpAndSettle();

    // Navigate to login
    expect(find.byType(LoginScreen), findsOneWidget);

    // Enter credentials
    await tester.enterText(find.byKey(const Key('email_field')), 'test@example.com');
    await tester.enterText(find.byKey(const Key('password_field')), 'password123');

    // Tap login button
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Should navigate to home screen
    expect(find.byType(HomeScreen), findsOneWidget);
  });
}
```

### CI Integration
**GitHub Actions Workflow:** Run tests on every PR
```yaml
# .github/workflows/flutter_test.yml
name: Flutter Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.x'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - run: flutter test integration_test/
```

---

## 9. Prioritized Implementation Steps

### Priority Levels
- **P0 (Critical):** Must-have for MVP
- **P1 (High):** Important but can be deferred slightly
- **P2 (Medium):** Nice-to-have, can be post-MVP
- **P3 (Low):** Future enhancements

### Complexity Levels
- **Low:** 1-2 days
- **Medium:** 3-5 days
- **High:** 1-2 weeks

---

| Step | Priority | Complexity | Description | Dependencies |
|------|----------|------------|-------------|--------------|
| 1. Scaffold Flutter project | P0 | Low | Run `flutter create`, add base dependencies | None |
| 2. Setup folder structure | P0 | Low | Create lib/ folders per architecture | Step 1 |
| 3. Configure theming | P0 | Low | Implement ThemeData, colors, text styles | Step 2 |
| 4. Create API client (Dio) | P0 | Medium | Setup Dio with interceptors (auth, retry, logging) | Step 2 |
| 5. Implement secure storage | P0 | Low | Setup flutter_secure_storage for tokens | Step 2 |
| 6. Create data models | P0 | Medium | JSON serializable models for Profile, Quran, etc. | Step 2 |
| 7. Implement auth (Supabase) | P0 | High | Login, signup, email verification, token refresh | Steps 4, 5 |
| 8. Create splash screen | P0 | Low | Animated splash with logo | Step 3 |
| 9. Create onboarding/main screen | P0 | Low | Language selection, landing page | Step 3 |
| 10. Create login/signup screens | P0 | Medium | Email/password forms, validation | Steps 3, 7 |
| 11. Implement bottom navigation | P0 | Low | BottomNavigationBar with 4 tabs | Steps 3, 16 |
| 12. Create home screen | P0 | Medium | Location chip, "Start Umrah" button | Steps 3, 11 |
| 13. Implement profile setup | P1 | Medium | Multi-step form, accessibility toggles | Steps 4, 6, 7 |
| 14. Create Qibla screen | P0 | High | Compass widget, calculate direction, AR button (stub) | Steps 4, 22 |
| 15. Implement Quran reader | P0 | High | Surah list, detail view, search, audio (stub) | Steps 4, 6 |
| 16. Implement routing (GoRouter) | P0 | Medium | Define all routes, auth guards | Steps 7, 11 |
| 17. Create prayer times screen | P0 | Medium | Fetch times, Hijri date, display cards | Steps 4, 6 |
| 18. Implement consent management | P1 | Medium | Toggle consents, save to backend | Steps 4, 6, 7 |
| 19. Create guidance screens | P1 | High | Step-by-step instructions, progress tracking | Steps 4, 6 |
| 20. Implement offline bundle | P1 | High | Download navigation graph, cache locally | Steps 4, 6, 21 |
| 21. Setup local cache (Hive) | P1 | Medium | Cache Quran data, navigation bundle | Step 2 |
| 22. Implement location service | P0 | Medium | GPS, permissions, real-time location | Step 2 |
| 23. Create map screen | P2 | High | Display map, floor selector, position marker | Steps 4, 20, 22, 24 |
| 24. Implement WebSocket client | P2 | High | Connect, send nav updates, receive corrections | Steps 4, 5, 7 |
| 25. Implement AI voice assistant | P3 | High | Voice token, realtime session, WebSocket audio | Steps 4, 7, 24 |
| 26. Add unit tests | P0 | High | Test models, repositories, usecases | All implementation steps |
| 27. Add widget tests | P1 | Medium | Test screens and widgets | Step 26 |
| 28. Add integration tests | P1 | Medium | Test login flow, Quran browsing | Steps 26, 27 |
| 29. Setup CI/CD | P1 | Low | GitHub Actions for tests, linting | Step 26 |
| 30. Create README & docs | P1 | Low | How to run, env vars, architecture | All steps |

---

## 10. Risk Areas

### High Risk
1. **WebSocket Navigation**
   - **Risk:** Complex real-time protocol, connection stability
   - **Mitigation:** Start with REST fallback (`/nav/snapshot`), add WebSocket later; exponential backoff reconnection
   - **Complexity:** High

2. **Qibla Compass Accuracy**
   - **Risk:** Device compass sensor unreliability, magnetic interference
   - **Mitigation:** Use accelerometer + magnetometer fusion; show accuracy indicator; fallback to map-based direction
   - **Complexity:** High

3. **Offline Data Sync**
   - **Risk:** Large Quran database (114 surahs, 6000+ ayahs), navigation graph
   - **Mitigation:** Download on WiFi only prompt; compress data; progressive download
   - **Complexity:** Medium

4. **Authentication Token Refresh**
   - **Risk:** Supabase token expiration handling, silent refresh
   - **Mitigation:** Use `supabase_flutter` SDK (handles refresh automatically); test expiration scenarios
   - **Complexity:** Medium

### Medium Risk
5. **Multi-Language Support (i18n)**
   - **Risk:** Arabic RTL layout, 10+ languages
   - **Mitigation:** Use `intl` package; test RTL thoroughly; prioritize AR/EN/FR for MVP
   - **Complexity:** Medium

6. **Audio Streaming (Quran reciters)**
   - **Risk:** Large audio files, buffering, playback controls
   - **Mitigation:** Use `just_audio` package; stream from CDN; show buffering indicator
   - **Complexity:** Medium

### Low Risk
7. **Dark Mode Toggle**
   - **Risk:** Inconsistent theming across screens
   - **Mitigation:** Use ThemeData consistently; test all screens in both modes
   - **Complexity:** Low

8. **Form Validation**
   - **Risk:** Edge cases in profile setup (phone formats, date validation)
   - **Mitigation:** Use `validators` package; unit test all validators
   - **Complexity:** Low

---

## 11. Dependencies (pubspec.yaml)

See separate file: `pubspec_suggested.yaml` (attached below)

---

**End of Migration Plan**
