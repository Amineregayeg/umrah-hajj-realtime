import 'package:dio/dio.dart';
import '../../../../config/app_config.dart';
import '../../../../core/utils/logger.dart';

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (AppConfig.isDevelopment) {
      AppLogger.d('→ ${options.method} ${options.uri}');
      AppLogger.d('Headers: ${options.headers}');
      if (options.data != null) {
        AppLogger.d('Body: ${options.data}');
      }
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (AppConfig.isDevelopment) {
      AppLogger.i(
        '← ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.uri}',
      );
      AppLogger.d('Response: ${response.data}');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLogger.e(
      '✗ ${err.requestOptions.method} ${err.requestOptions.uri}',
      err,
      err.stackTrace,
    );
    if (err.response != null) {
      AppLogger.e('Error response: ${err.response?.data}');
    }
    handler.next(err);
  }
}
