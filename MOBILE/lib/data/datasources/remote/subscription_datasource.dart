import 'package:dio/dio.dart';
import '../../models/subscription_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class SubscriptionRemoteDatasource {
  final DioClient _dio;

  SubscriptionRemoteDatasource(this._dio);

  Future<Result<SeatUsage>> getMyUsage() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/subscriptions/me');
      return Success(SeatUsage.fromJson(response.data!));
    } on DioException {
      return Failure(failures.UnknownFailure());
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }
}
