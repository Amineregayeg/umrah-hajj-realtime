import 'package:dio/dio.dart';
import '../../../../core/utils/logger.dart';
import '../../local/secure_storage.dart';

class AuthInterceptor extends Interceptor {
  final SecureStorage _secureStorage;

  AuthInterceptor(this._secureStorage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Get auth token from secure storage
    final token = await _secureStorage.getAuthToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
      AppLogger.d('Added auth token to request: ${options.uri}');
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Handle 401 Unauthorized errors
    if (err.response?.statusCode == 401) {
      AppLogger.w('Unauthorized error (401) - Token may be expired');

      // TODO: Implement token refresh logic here
      // For now, just clear the token and let the user re-authenticate
      await _secureStorage.clearAuthData();
    }

    handler.next(err);
  }
}
