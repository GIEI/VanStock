import 'package:dio/dio.dart';
import '../../models/inventory_models.dart';
import '../../models/common_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class InventoryRemoteDatasource {
  final DioClient _dio;

  InventoryRemoteDatasource(this._dio);

  Future<Result<List<Location>>> getLocations() async {
    try {
      final response = await _dio.get<dynamic>('/locations');
      if (response.data is! List) {
        throw Exception("Expected List but got ${response.data.runtimeType}");
      }
      final locations = (response.data as List)
          .map((e) => Location.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(locations);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure(message: 'Error: $e'));
    }
  }

  Future<Result<Location>> createLocation(CreateLocationDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/locations',
        data: dto.toJson(),
      );
      return Success(Location.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<PagedResponse<Product>>> getProducts({
    String? search,
    int? locationId,
    bool? lowStock,
    String? locationType,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        '/products',
        queryParameters: {
          'search': search,
          'location_id': locationId,
          'low_stock': lowStock,
          'location_type': locationType,
          'page': page,
          'limit': limit,
        }..removeWhere((_, v) => v == null),
      );

      // Handle both array and PagedResponse formats
      if (response.data is List) {
        final products = (response.data as List)
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList();
        return Success(
          PagedResponse(
            data: products,
            total: products.length,
            page: page,
            limit: products.length,
          ),
        );
      }

      return Success(
        PagedResponse.fromJson(
          response.data as Map<String, dynamic>,
          (json) => Product.fromJson(json as Map<String, dynamic>),
        ),
      );
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Product>> getProduct(int id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/products/$id');
      return Success(Product.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Movement>> createMovement(CreateMovementDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/movements',
        data: dto.toJson(),
      );
      return Success(Movement.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<void>> deleteMovement(int id) async {
    try {
      await _dio.delete('/movements/$id');
      return const Success(null);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<Movement>>> getMovements({
    int? productId,
    int? locationId,
    String? type,
    String? from,
    String? to,
    int limit = 500,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        '/movements',
        queryParameters: {
          'product_id': productId,
          'location_id': locationId,
          'type': type,
          'from': from,
          'to': to,
          'limit': limit,
        }..removeWhere((_, v) => v == null),
      );

      print('DEBUG: getMovements response type: ${response.data.runtimeType}');
      print('DEBUG: getMovements response: ${response.data}');

      // Handle both array and paged response formats
      List<dynamic> movementsList;
      if (response.data is List) {
        movementsList = response.data as List<dynamic>;
      } else if (response.data is Map<String, dynamic>) {
        final mapData = response.data as Map<String, dynamic>;
        if (mapData.containsKey('data')) {
          movementsList = mapData['data'] as List<dynamic>;
        } else {
          throw Exception("Expected 'data' field in paged response");
        }
      } else {
        throw Exception(
          "Expected List or Map but got ${response.data.runtimeType}",
        );
      }

      final movements = movementsList
          .map((e) => Movement.fromJson(e as Map<String, dynamic>))
          .toList();
      print('DEBUG: Parsed ${movements.length} movements');
      return Success(movements);
    } on DioException catch (e) {
      print('DEBUG: DioException in getMovements: $e');
      return Failure(_mapDioError(e));
    } catch (e) {
      print('DEBUG: Exception in getMovements: $e');
      return Failure(
        failures.UnknownFailure(message: 'Error fetching movements: $e'),
      );
    }
  }

  Future<Result<DashboardStats>> getDashboardStats() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/dashboard/stats');
      return Success(DashboardStats.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<DashboardAlert>>> getDashboardAlerts() async {
    try {
      final response = await _dio.get<List<dynamic>>('/dashboard/alerts');
      final alerts = (response.data ?? [])
          .map((e) => DashboardAlert.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(alerts);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<String>>> getCategories() async {
    try {
      final response = await _dio.get<dynamic>('/products/categories');

      if (response.data is List) {
        final categories = (response.data as List)
            .map((e) => e is Map ? (e['name'] ?? '').toString() : e.toString())
            .where((s) => s.isNotEmpty)
            .toList();
        return Success(categories);
      }

      return Success([]);
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
      String message = 'Server error';
      if (e.response?.data is Map<String, dynamic>) {
        final data = e.response!.data as Map<String, dynamic>;
        message =
            data['error']?.toString() ?? data['message']?.toString() ?? message;
      } else if (e.response?.data is String) {
        message = e.response!.data as String;
      }

      return failures.ServerFailure(
        message: message,
        statusCode: e.response?.statusCode,
      );
    }

    return failures.UnknownFailure(
      message: e.message ?? 'Unknown error occurred',
    );
  }
}
