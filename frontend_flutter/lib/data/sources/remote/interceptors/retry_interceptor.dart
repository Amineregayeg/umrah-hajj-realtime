import 'dart:math';
import 'package:dio/dio.dart';
import '../../../../core/utils/logger.dart';

class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;

  RetryInterceptor(this._dio, {this.maxRetries = 3});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err)) {
      final retryCount = (err.requestOptions.extra['retryCount'] as int?) ?? 0;

      if (retryCount < maxRetries) {
        err.requestOptions.extra['retryCount'] = retryCount + 1;

        // Exponential backoff: 1s, 2s, 4s
        final delaySeconds = pow(2, retryCount).toInt();
        AppLogger.w(
          'Retrying request (${retryCount + 1}/$maxRetries) after ${delaySeconds}s: ${err.requestOptions.uri}',
        );

        await Future.delayed(Duration(seconds: delaySeconds));

        try {
          final response = await _dio.fetch(err.requestOptions);
          handler.resolve(response);
        } catch (e) {
          if (e is DioException) {
            handler.next(e);
          } else {
            handler.next(err);
          }
        }
      } else {
        AppLogger.e('Max retries ($maxRetries) reached for: ${err.requestOptions.uri}');
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }

  bool _shouldRetry(DioException err) {
    // Retry on network errors or 5xx server errors
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response?.statusCode != null && err.response!.statusCode! >= 500);
  }
}
