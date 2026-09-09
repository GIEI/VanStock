import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:van_stock/core/network/auth_interceptor.dart';
import 'package:van_stock/core/constants/app_constants.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late bool loggedOut;
  late AuthInterceptor interceptor;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      AppConstants.tokenKey: 'session-token',
      AppConstants.userKey: 'some-user',
      AppConstants.companyIdKey: 'company-1',
    });
    prefs = await SharedPreferences.getInstance();
    loggedOut = false;
    interceptor = AuthInterceptor(prefs, onUnauthenticated: () {
      loggedOut = true;
    });
  });

  DioException build401(String path) {
    final options = RequestOptions(path: path);
    return DioException(
      requestOptions: options,
      response: Response(
        statusCode: 401,
        requestOptions: options,
      ),
    );
  }

  test('logs out on a genuine session-expired 401 (e.g. /attendance-v2/state)',
      () async {
    final err = build401('/attendance-v2/state');
    final handler = ErrorInterceptorHandler();

    interceptor.onError(err, handler);
    handler.future.then((_) {}, onError: (_) {});

    expect(loggedOut, isTrue);
    expect(prefs.getString(AppConstants.tokenKey), isNull);
  });

  test(
      'BUG: does NOT log out on a business-logic 401 from /attendance-v2/scan '
      '(expired/invalid QR token or blocked scan) — session must survive',
      () async {
    // The scan endpoint intentionally reuses HTTP 401 for domain errors
    // (see attendance_v2_datasource.dart, which already special-cases this
    // path to produce a friendly "QR Code scaduto o non valido" message).
    // AuthInterceptor must not treat this as a session-expired error,
    // otherwise the user is force-logged-out mid-scan.
    final err = build401('/attendance-v2/scan');
    final handler = ErrorInterceptorHandler();

    interceptor.onError(err, handler);
    handler.future.then((_) {}, onError: (_) {});

    expect(loggedOut, isFalse,
        reason:
            'Scanning a QR that yields a business-logic 401 must not log the user out');
    expect(prefs.getString(AppConstants.tokenKey), equals('session-token'),
        reason: 'Session token must be preserved so the user can retry the scan');
  });
}
