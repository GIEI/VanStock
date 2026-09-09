import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import 'auth_interceptor.dart';

class DioClient {
  late final Dio _dio;
  late final Logger _logger;
  final SharedPreferences _prefs;

  DioClient(
    this._prefs, {
    required void Function() onUnauthenticated,
    required void Function() onFeatureDisabled,
  }) {
    _logger = Logger();
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: AppConstants.connectionTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        contentType: Headers.jsonContentType,
        responseType: ResponseType.json,
      ),
    );

    // Add interceptors
    _dio.interceptors.addAll([
      LoggingInterceptor(_logger),
      AuthInterceptor(
        _prefs,
        onUnauthenticated: onUnauthenticated,
        onFeatureDisabled: onFeatureDisabled,
      ),
    ]);
  }

  Dio get dio => _dio;

  /// Update the stored auth token
  Future<bool> updateAuthToken(String token) =>
      _prefs.setString(AppConstants.tokenKey, token);

  /// Clear the stored auth token
  Future<bool> clearAuthToken() => _prefs.remove(AppConstants.tokenKey);

  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException {
      rethrow;
    }
  }

  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException {
      rethrow;
    }
  }

  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException {
      rethrow;
    }
  }

  /// PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException {
      rethrow;
    }
  }

  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException {
      rethrow;
    }
  }
}

/// Custom logging interceptor
class LoggingInterceptor extends Interceptor {
  final Logger logger;

  LoggingInterceptor(this.logger);

  static const _sensitiveKeys = {
    'password',
    'pwd',
    'pass',
    'newpassword',
    'oldpassword',
    'currentpassword',
    'confirmpassword',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'apikey',
    'api_key',
    'secret',
  };

  static const _redacted = '***REDACTED***';

  dynamic _sanitize(dynamic data) {
    if (data is Map) {
      return data.map((key, value) {
        final normalized = key.toString().toLowerCase().replaceAll('_', '');
        if (_sensitiveKeys.contains(normalized)) {
          return MapEntry(key, _redacted);
        }
        return MapEntry(key, _sanitize(value));
      });
    }
    if (data is List) {
      return data.map(_sanitize).toList();
    }
    return data;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    logger.d('→ ${options.method} ${options.uri}');
    if (options.data != null) {
      logger.d('  Body: ${_sanitize(options.data)}');
    }
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    logger.d('← ${response.statusCode} ${response.requestOptions.uri}');
    if (response.data != null) {
      logger.d('  Response: ${_sanitize(response.data)}');
    }
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    logger.e('✗ ERROR: ${err.message}');
    if (err.response?.data != null) {
      logger.e('  Response body: ${_sanitize(err.response?.data)}');
    }
    super.onError(err, handler);
  }
}
