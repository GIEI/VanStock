import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/attendance_v2_datasource.dart';
import 'package:van_stock/data/models/attendance_v2_models.dart';
import 'package:van_stock/core/errors/result.dart';
import 'package:van_stock/core/network/dio_client.dart';
import 'package:dio/dio.dart';

class MockDioClient implements DioClient {
  late dynamic _postResult;
  late dynamic _getResult;

  void setPostResult(dynamic result) {
    _postResult = result;
  }

  void setGetResult(dynamic result) {
    _getResult = result;
  }

  @override
  Dio get dio => throw UnimplementedError();

  @override
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    if (_postResult is Exception) {
      throw _postResult;
    }
    return _postResult;
  }

  @override
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    if (_getResult is Exception) {
      throw _getResult;
    }
    return _getResult;
  }

  @override
  Future<bool> updateAuthToken(String token) async => true;

  @override
  Future<bool> clearAuthToken() async => true;

  @override
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    throw UnimplementedError();
  }
}

void main() {
  late MockDioClient mockDioClient;
  late AttendanceV2RemoteDatasource datasource;

  setUp(() {
    mockDioClient = MockDioClient();
    datasource = AttendanceV2RemoteDatasource(mockDioClient);
  });

  group('AttendanceV2RemoteDatasource - scanQr', () {
    test('should successfully scan when user has no anomalies', () async {
      final scanBody = ScanRequestBody(
        token: 'valid-token',
        intent: 'CHECK_IN',
        requestId: 'req-123',
      );

      final mockResponse = Response(
        data: {
          'event': {
            'id': 1,
            'company_id': 1,
            'user_id': 1,
            'occurred_at': '2026-08-14T08:00:00Z',
            'detected_action': 'CHECK_IN',
            'resulting_state': 'IN',
            'previous_state': 'OUT',
            'source': 'mobile',
            'status': 'valid',
          },
          'new_state': 'IN',
          'message': 'Entrata registrata alle 08:00',
        },
        statusCode: 201,
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
      );

      mockDioClient.setPostResult(mockResponse);

      final result = await datasource.scanQr(scanBody);

      expect(result, isA<Success>());
      result.whenSuccess((response) {
        expect(response.event.id, equals(1));
        expect(response.newState, equals('IN'));
      });
    });

    test('should allow scan when user has open anomaly from previous day',
        () async {
      // BUG REPRODUCTION:
      // User clocked in yesterday but didn't clock out (incomplete timbratura).
      // The system flagged this as PENDING_REVIEW anomaly.
      // Today, user tries to scan QR to check in.
      // Expected: Should succeed without crashing or logging out.

      final scanBody = ScanRequestBody(
        token: 'valid-qr-token-today',
        intent: 'CHECK_IN',
        requestId: 'req-today-123',
      );

      // Simulate response where previous state is PENDING_REVIEW
      // (from yesterday's unclosed day)
      final mockResponse = Response(
        data: {
          'event': {
            'id': 2,
            'company_id': 1,
            'user_id': 1,
            'occurred_at': '2026-08-14T08:30:00Z',
            'detected_action': 'CHECK_IN',
            'resulting_state': 'IN',
            'previous_state': 'PENDING_REVIEW', // anomaly from yesterday
            'source': 'mobile',
            'status': 'valid',
            'anomaly_type': null,
          },
          'new_state': 'IN',
          'message': 'Entrata registrata alle 08:30',
          'anomaly_type': null,
        },
        statusCode: 201,
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
      );

      mockDioClient.setPostResult(mockResponse);

      final result = await datasource.scanQr(scanBody);

      // CRITICAL: Result should be Success, NOT Failure
      // This test should fail if the bug exists (server returns 401)
      expect(result, isA<Success>(),
          reason:
              'User should be able to scan even with pending anomaly from previous day');

      result.whenSuccess((response) {
        expect(response.event.id, equals(2));
        expect(response.newState, equals('IN'));
        expect(response.event.previousState, equals('PENDING_REVIEW'));
      });
    });

    test('should handle network error without crashing', () async {
      final scanBody = ScanRequestBody(
        token: 'valid-token',
        intent: 'CHECK_IN',
        requestId: 'req-error',
      );

      final dioException = DioException(
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
        type: DioExceptionType.unknown,
        error: Exception('Network error'),
      );

      mockDioClient.setPostResult(dioException);

      final result = await datasource.scanQr(scanBody);

      expect(result, isA<Failure>());
    });

    test('should handle expired QR token (401)', () async {
      final scanBody = ScanRequestBody(
        token: 'expired-qr-token',
        intent: 'CHECK_IN',
        requestId: 'req-401',
      );

      final dioException = DioException(
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
        response: Response(
          statusCode: 401,
          data: {'error': 'QR Code scaduto o non valido'},
          requestOptions: RequestOptions(path: '/attendance-v2/scan'),
        ),
      );

      mockDioClient.setPostResult(dioException);

      final result = await datasource.scanQr(scanBody);

      // This is expected to fail (401 is legitimate error)
      expect(result, isA<Failure>());
    });

    test('should handle server error (500) without treating as auth error',
        () async {
      final scanBody = ScanRequestBody(
        token: 'valid-token',
        intent: 'CHECK_IN',
        requestId: 'req-500',
      );

      final dioException = DioException(
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
        response: Response(
          statusCode: 500,
          data: {'error': 'Internal server error'},
          requestOptions: RequestOptions(path: '/attendance-v2/scan'),
        ),
      );

      mockDioClient.setPostResult(dioException);

      final result = await datasource.scanQr(scanBody);

      // Should be Failure, but NOT treated as 401 auth error
      // (which would trigger logout)
      expect(result, isA<Failure>());
    });

    test(
        'should handle malformed response (missing required fields) gracefully',
        () async {
      final scanBody = ScanRequestBody(
        token: 'valid-token',
        intent: 'CHECK_IN',
        requestId: 'req-malformed',
      );

      // Simulate malformed response missing 'event' field
      final mockResponse = Response(
        data: {
          'new_state': 'IN',
          'message': 'Entrata registrata',
          // 'event' field is missing - this would cause parsing error
        },
        statusCode: 201,
        requestOptions: RequestOptions(path: '/attendance-v2/scan'),
      );

      mockDioClient.setPostResult(mockResponse);

      final result = await datasource.scanQr(scanBody);

      // Should fail gracefully without crash
      expect(result, isA<Failure>());
    });
  });

  group('AttendanceV2RemoteDatasource - getCurrentState', () {
    test('should return state with open anomalies', () async {
      final mockResponse = Response(
        data: {
          'current_state': 'PENDING_REVIEW',
          'last_event': {
            'id': 1,
            'company_id': 1,
            'user_id': 1,
            'occurred_at': '2026-08-13T09:00:00Z',
            'detected_action': 'CHECK_IN',
            'resulting_state': 'PENDING_REVIEW',
            'previous_state': 'OUT',
            'source': 'admin',
            'status': 'valid',
            'anomaly_type': 'DAY_NEVER_CLOSED',
          },
          'worked_minutes_today': 0,
          'break_minutes_today': 0,
          'anomalies_today': 1,
          'has_open_anomalies': true,
          'valid_intents': ['CHECK_IN'],
        },
        statusCode: 200,
        requestOptions: RequestOptions(path: '/attendance-v2/state'),
      );

      mockDioClient.setGetResult(mockResponse);

      final result = await datasource.getCurrentState();

      expect(result, isA<Success>());
      result.whenSuccess((state) {
        expect(state.currentState, equals('PENDING_REVIEW'));
        expect(state.hasOpenAnomalies, equals(true));
        // User should still be able to check in despite anomaly
        expect(state.validIntents, contains('CHECK_IN'));
      });
    });
  });
}
