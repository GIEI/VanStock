import 'package:dio/dio.dart';
import 'dart:io';
import '../../models/job_models.dart';
import '../../models/common_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class JobRemoteDatasource {
  final DioClient _dio;

  JobRemoteDatasource(this._dio);

  Future<Result<PagedResponse<Job>>> getJobs({
    String? status,
    int? assignedTo,
    String? date,
    int page = 1,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        '/jobs',
        queryParameters: {
          'status': status,
          'assigned_to': assignedTo,
          'date': date,
          'page': page,
        }..removeWhere((_, v) => v == null),
      );

      // Handle both array and PagedResponse formats
      if (response.data is List) {
        final jobs = (response.data as List)
            .map((e) => Job.fromJson(e as Map<String, dynamic>))
            .toList();
        return Success(PagedResponse(
          data: jobs,
          total: jobs.length,
          page: page,
          limit: jobs.length,
        ));
      }

      return Success(PagedResponse.fromJson(
        response.data as Map<String, dynamic>,
        (json) => Job.fromJson(json as Map<String, dynamic>),
      ));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Job>> getJob(int id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/jobs/$id');
      return Success(Job.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      print('🔴 JobRemoteDatasource.getJob error: $e');
      return Failure(failures.UnknownFailure(message: e.toString()));
    }
  }

  Future<Result<Job>> createJob(CreateJobDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/jobs',
        data: dto.toJson(),
      );
      return Success(Job.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Job>> updateJob(int id, Map<String, dynamic> body) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/jobs/$id/status',
        data: body,
      );
      return Success(Job.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<JobMessage>>> getMessages(int jobId) async {
    try {
      final response =
          await _dio.get<List<dynamic>>('/jobs/$jobId/messages');
      final messages = (response.data ?? [])
          .map((e) => JobMessage.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(messages);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<JobMessage>> sendMessage(
    int jobId,
    SendMessageDto dto,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/jobs/$jobId/messages',
        data: dto.toJson(),
      );
      return Success(JobMessage.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Job>> signJob(
    int jobId,
    SignJobBody body, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    try {
      final bodyData = body.toJson();
      if (latitude != null) bodyData['latitude'] = latitude;
      if (longitude != null) bodyData['longitude'] = longitude;
      if (locationAddress != null) bodyData['location_address'] = locationAddress;

      final response = await _dio.post<Map<String, dynamic>>(
        '/jobs/$jobId/sign',
        data: bodyData,
      );
      return Success(Job.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Job>> startWork(
    int jobId, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (latitude != null) body['latitude'] = latitude;
      if (longitude != null) body['longitude'] = longitude;
      if (locationAddress != null) body['location_address'] = locationAddress;

      final response = await _dio.patch<Map<String, dynamic>>(
        '/jobs/$jobId/start',
        data: body.isNotEmpty ? body : null,
      );
      return Success(Job.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<JobPhoto>> uploadPhoto(
    int jobId,
    String type,
    File file, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ),
      });
      final queryParams = {'type': type};
      if (latitude != null) queryParams['latitude'] = latitude.toString();
      if (longitude != null) queryParams['longitude'] = longitude.toString();
      if (locationAddress != null) queryParams['location_address'] = locationAddress;

      final response = await _dio.post<Map<String, dynamic>>(
        '/jobs/$jobId/photos',
        queryParameters: queryParams,
        data: formData,
        options: Options(
          sendTimeout: const Duration(seconds: 120),
          receiveTimeout: const Duration(seconds: 120),
        ),
      );
      return Success(JobPhoto.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<void>> deletePhoto(int jobId, int photoId) async {
    try {
      await _dio.delete('/jobs/$jobId/photos/$photoId');
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
