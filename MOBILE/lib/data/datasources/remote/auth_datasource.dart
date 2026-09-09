import 'package:dio/dio.dart';
import '../../models/auth_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class AuthRemoteDatasource {
  final DioClient _dio;

  AuthRemoteDatasource(this._dio);

  Future<Result<LoginResponse>> login(LoginRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: request.toJson(),
      );
      return Success(LoginResponse.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<AuthUser>> me() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      return Success(AuthUser.fromJson(response.data!));
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
