import 'package:dartz/dartz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../core/utils/logger.dart';
import '../sources/local/secure_storage.dart';

/// Repository for handling authentication operations
/// Uses Supabase Auth for user management and JWT tokens
class AuthRepository {
  final SupabaseClient _supabaseClient;
  final SecureStorage _secureStorage;

  AuthRepository({
    required SupabaseClient? supabaseClient,
    required SecureStorage secureStorage,
  })  : _supabaseClient = supabaseClient!,
        _secureStorage = secureStorage;

  /// Get current user from Supabase session
  User? get currentUser => _supabaseClient.auth.currentUser;

  /// Check if user is authenticated
  bool get isAuthenticated => currentUser != null;

  /// Sign in with email and password
  Future<Either<Failure, User>> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      AppLogger.i('Attempting sign in for email: $email');

      final response = await _supabaseClient.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user == null) {
        return const Left(AuthFailure('Sign in failed: No user returned'));
      }

      // Store tokens
      final session = response.session;
      if (session != null) {
        await _secureStorage.setAuthToken(session.accessToken);
        await _secureStorage.setRefreshToken(session.refreshToken ?? '');
        AppLogger.i('Tokens stored successfully');
      }

      AppLogger.i('Sign in successful for user: ${response.user!.id}');
      return Right(response.user!);
    } on AuthException catch (e) {
      AppLogger.e('Auth error during sign in: ${e.message}');
      return Left(AuthFailure(e.message));
    } catch (e) {
      AppLogger.e('Unexpected error during sign in: $e');
      return Left(UnexpectedFailure('Sign in failed: $e'));
    }
  }

  /// Sign up with email and password
  Future<Either<Failure, User>> signUpWithEmailPassword({
    required String email,
    required String password,
    String? fullName,
  }) async {
    try {
      AppLogger.i('Attempting sign up for email: $email');

      final response = await _supabaseClient.auth.signUp(
        email: email,
        password: password,
        data: {
          if (fullName != null) 'full_name': fullName,
        },
      );

      if (response.user == null) {
        return const Left(AuthFailure('Sign up failed: No user returned'));
      }

      // Store tokens if available
      final session = response.session;
      if (session != null) {
        await _secureStorage.setAuthToken(session.accessToken);
        await _secureStorage.setRefreshToken(session.refreshToken ?? '');
        AppLogger.i('Tokens stored successfully');
      }

      AppLogger.i('Sign up successful for user: ${response.user!.id}');
      return Right(response.user!);
    } on AuthException catch (e) {
      AppLogger.e('Auth error during sign up: ${e.message}');
      return Left(AuthFailure(e.message));
    } catch (e) {
      AppLogger.e('Unexpected error during sign up: $e');
      return Left(UnexpectedFailure('Sign up failed: $e'));
    }
  }

  /// Sign out current user
  Future<Either<Failure, void>> signOut() async {
    try {
      AppLogger.i('Attempting sign out');

      await _supabaseClient.auth.signOut();
      await _secureStorage.clearAuthData();

      AppLogger.i('Sign out successful');
      return const Right(null);
    } on AuthException catch (e) {
      AppLogger.e('Auth error during sign out: ${e.message}');
      return Left(AuthFailure(e.message));
    } catch (e) {
      AppLogger.e('Unexpected error during sign out: $e');
      return Left(UnexpectedFailure('Sign out failed: $e'));
    }
  }

  /// Send password reset email
  Future<Either<Failure, void>> resetPassword({
    required String email,
  }) async {
    try {
      AppLogger.i('Sending password reset email to: $email');

      await _supabaseClient.auth.resetPasswordForEmail(email);

      AppLogger.i('Password reset email sent successfully');
      return const Right(null);
    } on AuthException catch (e) {
      AppLogger.e('Auth error during password reset: ${e.message}');
      return Left(AuthFailure(e.message));
    } catch (e) {
      AppLogger.e('Unexpected error during password reset: $e');
      return Left(UnexpectedFailure('Password reset failed: $e'));
    }
  }

  /// Refresh current session
  Future<Either<Failure, void>> refreshSession() async {
    try {
      AppLogger.i('Refreshing session');

      final response = await _supabaseClient.auth.refreshSession();
      final session = response.session;

      if (session != null) {
        await _secureStorage.setAuthToken(session.accessToken);
        await _secureStorage.setRefreshToken(session.refreshToken ?? '');
        AppLogger.i('Session refreshed successfully');
        return const Right(null);
      }

      return const Left(AuthFailure('Session refresh failed: No session returned'));
    } on AuthException catch (e) {
      AppLogger.e('Auth error during session refresh: ${e.message}');
      return Left(AuthFailure(e.message));
    } catch (e) {
      AppLogger.e('Unexpected error during session refresh: $e');
      return Left(UnexpectedFailure('Session refresh failed: $e'));
    }
  }

  /// Get stored auth token
  Future<String?> getAuthToken() async {
    return await _secureStorage.getAuthToken();
  }

  /// Listen to auth state changes
  Stream<AuthState> get authStateChanges => _supabaseClient.auth.onAuthStateChange;

  /// Auto-login with stored session
  Future<Either<Failure, User?>> autoLogin() async {
    try {
      AppLogger.i('Attempting auto-login');

      final token = await _secureStorage.getAuthToken();
      if (token == null) {
        AppLogger.i('No stored token found');
        return const Right(null);
      }

      // Check if current session is valid
      final currentSession = _supabaseClient.auth.currentSession;
      if (currentSession != null) {
        AppLogger.i('Auto-login successful with existing session');
        return Right(currentSession.user);
      }

      // Try to refresh session
      final refreshResult = await refreshSession();
      return refreshResult.fold(
        (failure) {
          AppLogger.w('Auto-login failed: session refresh failed');
          return const Right(null);
        },
        (_) {
          final user = _supabaseClient.auth.currentUser;
          AppLogger.i('Auto-login successful after refresh');
          return Right(user);
        },
      );
    } catch (e) {
      AppLogger.e('Unexpected error during auto-login: $e');
      return const Right(null); // Don't fail auto-login, just return null
    }
  }
}
