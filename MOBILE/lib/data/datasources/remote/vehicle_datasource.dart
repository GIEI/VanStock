import 'package:dio/dio.dart';
import '../../models/vehicle_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class VehicleRemoteDatasource {
  final DioClient _dio;

  VehicleRemoteDatasource(this._dio);

  Future<Result<List<VehicleBooking>>> getMyBookings({String? date}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/vehicle-bookings/my',
        queryParameters: {'date': date}..removeWhere((_, v) => v == null),
      );
      final bookings = (response.data ?? [])
          .map((e) => VehicleBooking.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(bookings);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<AvailableVansResponse>> getAvailableVans({
    required String date,
    required String startTime,
    required String endTime,
    int? jobId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/vehicle-bookings/available',
        queryParameters: {
          'date': date,
          'start_time': startTime,
          'end_time': endTime,
          if (jobId != null) 'job_id': jobId,
        },
      );
      return Success(AvailableVansResponse.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<VehicleBooking>> createBooking(
    CreateVehicleBookingDto dto,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/vehicle-bookings',
        data: dto.toJson(),
      );
      return Success(VehicleBooking.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<void>> deleteBooking(int id) async {
    try {
      await _dio.delete<void>('/vehicle-bookings/$id');
      return Success(null);
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
      return failures.AuthenticationFailure();
    }

    if (e.response?.statusCode != null) {
      final data = e.response?.data as Map<String, dynamic>?;
      final message = data?['error'] ?? data?['message'];
      return failures.ServerFailure(
        message: message as String? ?? 'Server error',
        statusCode: e.response?.statusCode,
      );
    }

    return failures.UnknownFailure(
      message: e.message ?? 'Unknown error occurred',
    );
  }
}
