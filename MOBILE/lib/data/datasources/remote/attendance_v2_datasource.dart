import 'package:dio/dio.dart';
import '../../models/attendance_v2_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class AttendanceV2RemoteDatasource {
  final DioClient _dio;

  AttendanceV2RemoteDatasource(this._dio);

  Future<Result<UserAttendanceState>> getCurrentState() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/attendance-v2/state',
      );
      return Success(UserAttendanceState.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<ScanResponse>> scanQr(ScanRequestBody body) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/attendance-v2/scan',
        data: body.toJson(),
      );
      return Success(ScanResponse.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<AttendanceEvent>>> getEvents({
    String? dateFrom,
    String? dateTo,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/attendance-v2/events',
        queryParameters: {
          'date_from': ?dateFrom,
          'date_to': ?dateTo,
        },
      );
      final events = (response.data ?? [])
          .map((e) => AttendanceEvent.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(events);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<AttendanceDay>>> getDays({int? month, int? year}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/attendance-v2/days',
        queryParameters: {
          'month': ?month,
          'year': ?year,
        },
      );
      final days = (response.data ?? [])
          .map((e) => AttendanceDay.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(days);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<OverrideRequestV2>> createOverrideRequest(
    OverrideRequestBodyV2 body,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/attendance-v2/override-requests',
        data: body.toJson(),
      );
      return Success(OverrideRequestV2.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<OverrideRequestV2>>> getMyOverrideRequests() async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/attendance-v2/override-requests',
      );
      final requests = (response.data ?? [])
          .map((e) => OverrideRequestV2.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(requests);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<UserAbsence>> createAbsence({
    required int userId,
    required String absenceDate,
    String? reason,
    String? notes,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/user-absences/$userId',
        data: {
          'absence_date': absenceDate,
          'reason': ?reason,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
      return Success(UserAbsence.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<UserAbsence>>> getMyAbsences(int userId) async {
    try {
      final response = await _dio.get<List<dynamic>>('/user-absences/$userId');
      final absences = (response.data ?? [])
          .map((e) => UserAbsence.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(absences);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  failures.Failure _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return failures.NetworkFailure();
    }
    if (e.response?.statusCode == 401) {
      final path = e.requestOptions.path;
      if (path.contains('/attendance-v2/scan')) {
        String message = 'QR Code scaduto o non valido. Riprova con quello aggiornato.';
        if (e.response?.data is Map<String, dynamic>) {
          final data = e.response!.data as Map<String, dynamic>;
          message = data['error']?.toString() ??
              data['message']?.toString() ??
              message;
        }
        return failures.ServerFailure(
          message: message,
          statusCode: 401,
        );
      }
      return failures.AuthenticationFailure();
    }
    if (e.response?.statusCode != null) {
      String message = 'Errore del server';
      if (e.response?.data is Map<String, dynamic>) {
        final data = e.response!.data as Map<String, dynamic>;
        message = data['error']?.toString() ??
            data['message']?.toString() ??
            message;
      } else if (e.response?.data is String) {
        message = e.response!.data as String;
      }
      return failures.ServerFailure(
        message: message,
        statusCode: e.response?.statusCode,
      );
    }
    return failures.UnknownFailure(
      message: e.message ?? 'Errore sconosciuto',
    );
  }
}
