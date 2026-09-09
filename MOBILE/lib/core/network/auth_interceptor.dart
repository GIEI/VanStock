import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class AuthInterceptor extends Interceptor {
  final SharedPreferences _prefs;
  final void Function() onUnauthenticated;
  final void Function() onFeatureDisabled;

  AuthInterceptor(
    this._prefs, {
    required this.onUnauthenticated,
    required this.onFeatureDisabled,
  });

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _prefs.getString(AppConstants.tokenKey);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401 &&
        !err.requestOptions.path.contains('/attendance-v2/scan')) {
      _prefs.remove(AppConstants.tokenKey);
      _prefs.remove(AppConstants.userKey);
      _prefs.remove(AppConstants.companyIdKey);
      onUnauthenticated();
    }
    final body = err.response?.data;
    if (err.response?.statusCode == 403 &&
        body is Map &&
        body['code'] == 'FEATURE_NOT_ENABLED') {
      onFeatureDisabled();
    }
    handler.next(err);
  }
}
