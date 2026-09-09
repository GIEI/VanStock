import 'package:dio/dio.dart';
import '../../models/report_and_supplier_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class ReportRemoteDatasource {
  final DioClient _dio;

  ReportRemoteDatasource(this._dio);

  Future<Result<List<DailyReport>>> getReports({
    String? date,
    int? userId,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/reports',
        queryParameters: {
          'date': date,
          'user_id': userId,
        }..removeWhere((_, v) => v == null),
      );
      final reports = (response.data ?? [])
          .map((e) => DailyReport.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(reports);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<DailyReport>> getReport(int id) async {
    try {
      final response =
          await _dio.get<Map<String, dynamic>>('/reports/$id');
      return Success(DailyReport.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<DailyReport>> createReport(CreateReportDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/reports',
        data: dto.toJson(),
      );
      return Success(DailyReport.fromJson(response.data!));
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
