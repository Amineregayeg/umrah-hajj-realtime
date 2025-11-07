import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/providers/auth_provider.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/signup_screen.dart';

// Placeholder screens (will be implemented in Phase D.5)
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FlutterLogo(size: 100),
            SizedBox(height: 24),
            Text(
              'Umrah & Hajj Guide',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

class PlaceholderScreen extends StatelessWidget {
  final String title;

  const PlaceholderScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text('$title Screen\n(Coming soon)'),
      ),
    );
  }
}

// Router provider with auth guard
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;

      final isGoingToLogin = state.matchedLocation == '/login';
      final isGoingToSignup = state.matchedLocation == '/signup';
      final isGoingToSplash = state.matchedLocation == '/splash';

      // Show splash while checking auth state
      if (isLoading && !isGoingToSplash) {
        return '/splash';
      }

      // Redirect to login if not authenticated and trying to access protected routes
      if (!isAuthenticated && !isLoading && !isGoingToLogin && !isGoingToSignup) {
        return '/login';
      }

      // Redirect to home if authenticated and trying to access auth screens
      if (isAuthenticated && (isGoingToLogin || isGoingToSignup || isGoingToSplash)) {
        return '/home';
      }

      return null; // No redirect needed
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignUpScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const PlaceholderScreen(title: 'Home'),
      ),
      GoRoute(
        path: '/qibla',
        builder: (context, state) => const PlaceholderScreen(title: 'Qibla'),
      ),
      GoRoute(
        path: '/quran',
        builder: (context, state) => const PlaceholderScreen(title: 'Quran'),
      ),
      GoRoute(
        path: '/salat',
        builder: (context, state) =>
            const PlaceholderScreen(title: 'Prayer Times'),
      ),
    ],
  );
});
