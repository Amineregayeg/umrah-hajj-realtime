import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/failures.dart';
import '../../core/utils/logger.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/sources/local/secure_storage.dart';

/// Provider for Supabase client
final supabaseClientProvider = Provider<SupabaseClient?>((ref) {
  try {
    return Supabase.instance.client;
  } catch (e) {
    // Supabase not initialized - return null
    return null;
  }
});

/// Provider for SecureStorage
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

/// Provider for AuthRepository
final authRepositoryProvider = Provider<AuthRepository?>((ref) {
  final supabaseClient = ref.watch(supabaseClientProvider);
  final secureStorage = ref.watch(secureStorageProvider);

  // Return null if Supabase is not initialized
  if (supabaseClient == null) {
    return null;
  }

  return AuthRepository(
    supabaseClient: supabaseClient,
    secureStorage: secureStorage,
  );
});

/// Auth state model
class AuthState {
  final User? user;
  final bool isLoading;
  final bool isAuthenticated;
  final Failure? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    bool? isAuthenticated,
    Failure? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error,
    );
  }

  // Create initial state
  factory AuthState.initial() {
    return const AuthState(
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    );
  }

  // Create authenticated state
  factory AuthState.authenticated(User user) {
    return AuthState(
      user: user,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    );
  }

  // Create unauthenticated state
  factory AuthState.unauthenticated() {
    return const AuthState(
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    );
  }

  // Create loading state
  factory AuthState.loading() {
    return const AuthState(
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    );
  }

  // Create error state
  factory AuthState.error(Failure failure) {
    return AuthState(
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: failure,
    );
  }
}

/// Auth state notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository? _authRepository;

  AuthNotifier(this._authRepository) : super(AuthState.initial()) {
    if (_authRepository != null) {
      // Attempt auto-login on initialization
      _autoLogin();

      // Listen to auth state changes from Supabase
      _listenToAuthChanges();
    } else {
      // Supabase not initialized - stay unauthenticated
      AppLogger.w('AuthNotifier: Supabase not initialized - auth disabled');
      state = AuthState.unauthenticated();
    }
  }

  /// Attempt auto-login with stored session
  Future<void> _autoLogin() async {
    if (_authRepository == null) return;

    state = AuthState.loading();

    final result = await _authRepository!.autoLogin();

    result.fold(
      (failure) {
        AppLogger.e('Auto-login failed: ${failure.message}');
        state = AuthState.unauthenticated();
      },
      (user) {
        if (user != null) {
          AppLogger.i('Auto-login successful');
          state = AuthState.authenticated(user);
        } else {
          AppLogger.i('No stored session found');
          state = AuthState.unauthenticated();
        }
      },
    );
  }

  /// Listen to Supabase auth state changes
  void _listenToAuthChanges() {
    if (_authRepository == null) return;

    _authRepository!.authStateChanges.listen((authState) {
      final user = authState.session?.user;

      if (user != null) {
        AppLogger.i('Auth state changed: User signed in');
        state = AuthState.authenticated(user);
      } else {
        AppLogger.i('Auth state changed: User signed out');
        state = AuthState.unauthenticated();
      }
    });
  }

  /// Sign in with email and password
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    if (_authRepository == null) {
      state = AuthState.error(const AuthFailure('Authentication not available'));
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    final result = await _authRepository!.signInWithEmailPassword(
      email: email,
      password: password,
    );

    result.fold(
      (failure) {
        AppLogger.e('Sign in failed: ${failure.message}');
        state = AuthState.error(failure);
      },
      (user) {
        AppLogger.i('Sign in successful');
        state = AuthState.authenticated(user);
      },
    );
  }

  /// Sign up with email and password
  Future<void> signUp({
    required String email,
    required String password,
    String? fullName,
  }) async {
    if (_authRepository == null) {
      state = AuthState.error(const AuthFailure('Authentication not available'));
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    final result = await _authRepository!.signUpWithEmailPassword(
      email: email,
      password: password,
      fullName: fullName,
    );

    result.fold(
      (failure) {
        AppLogger.e('Sign up failed: ${failure.message}');
        state = AuthState.error(failure);
      },
      (user) {
        AppLogger.i('Sign up successful');
        state = AuthState.authenticated(user);
      },
    );
  }

  /// Sign out current user
  Future<void> signOut() async {
    if (_authRepository == null) {
      state = AuthState.unauthenticated();
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    final result = await _authRepository!.signOut();

    result.fold(
      (failure) {
        AppLogger.e('Sign out failed: ${failure.message}');
        state = state.copyWith(isLoading: false, error: failure);
      },
      (_) {
        AppLogger.i('Sign out successful');
        state = AuthState.unauthenticated();
      },
    );
  }

  /// Send password reset email
  Future<void> resetPassword(String email) async {
    if (_authRepository == null) {
      state = state.copyWith(
        isLoading: false,
        error: const AuthFailure('Authentication not available'),
      );
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    final result = await _authRepository!.resetPassword(email: email);

    result.fold(
      (failure) {
        AppLogger.e('Password reset failed: ${failure.message}');
        state = state.copyWith(isLoading: false, error: failure);
      },
      (_) {
        AppLogger.i('Password reset email sent');
        state = state.copyWith(isLoading: false);
      },
    );
  }

  /// Clear error state
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Provider for auth state notifier
final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});

/// Convenience provider to get current user
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.user;
});

/// Convenience provider to check if authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.isAuthenticated;
});
