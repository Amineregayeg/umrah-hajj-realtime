import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/providers/auth_provider.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/signup_screen.dart';
import '../../presentation/screens/home/home_screen.dart';
import '../../presentation/screens/qibla/qibla_screen.dart';

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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$title Screen',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text('(Coming soon in Phase D.5)'),
            const SizedBox(height: 32),
            const Text('Navigate to:', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Home'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/qibla'),
                  child: const Text('Qibla'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/quran'),
                  child: const Text('Quran'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/salat'),
                  child: const Text('Prayer Times'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Login'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/signup'),
                  child: const Text('Sign Up'),
                ),
                ElevatedButton(
                  onPressed: () => context.go('/splash'),
                  child: const Text('Splash'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Router provider - AUTH DISABLED FOR TESTING
final routerProvider = Provider<GoRouter>((ref) {
  // Commenting out auth state watching for testing
  // final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/home', // Changed to /home for easier testing
    debugLogDiagnostics: true,
    // AUTH GUARD DISABLED - All routes are accessible without login
    // redirect: (context, state) {
    //   final isAuthenticated = authState.isAuthenticated;
    //   final isLoading = authState.isLoading;
    //
    //   final isGoingToLogin = state.matchedLocation == '/login';
    //   final isGoingToSignup = state.matchedLocation == '/signup';
    //   final isGoingToSplash = state.matchedLocation == '/splash';
    //
    //   // Show splash while checking auth state
    //   if (isLoading && !isGoingToSplash) {
    //     return '/splash';
    //   }
    //
    //   // Redirect to login if not authenticated and trying to access protected routes
    //   if (!isAuthenticated && !isLoading && !isGoingToLogin && !isGoingToSignup) {
    //     return '/login';
    //   }
    //
    //   // Redirect to home if authenticated and trying to access auth screens
    //   if (isAuthenticated && (isGoingToLogin || isGoingToSignup || isGoingToSplash)) {
    //     return '/home';
    //   }
    //
    //   return null; // No redirect needed
    // },
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
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/qibla',
        builder: (context, state) => const QiblaScreen(),
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
      GoRoute(
        path: '/map',
        builder: (context, state) =>
            const PlaceholderScreen(title: 'Navigation'),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) =>
            const PlaceholderScreen(title: 'Profile'),
      ),
    ],
  );
});
