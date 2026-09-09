import 'package:dio/dio.dart';
import '../../models/report_and_supplier_models.dart';
import '../../../core/errors/failures.dart' as failures;
import '../../../core/errors/result.dart';
import '../../../core/network/dio_client.dart';

class SupplierRemoteDatasource {
  final DioClient _dio;

  SupplierRemoteDatasource(this._dio);

  Future<Result<List<Supplier>>> getSuppliers() async {
    try {
      final response = await _dio.get<List<dynamic>>('/suppliers');
      final suppliers = (response.data ?? [])
          .map((e) => Supplier.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(suppliers);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<Supplier>> createSupplier(CreateSupplierDto dto) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/suppliers',
        data: dto.toJson(),
      );
      return Success(Supplier.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<PurchaseOrder>>> getPurchaseOrders({
    String? status,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/purchase-orders',
        queryParameters: {
          'status': status,
        }..removeWhere((_, v) => v == null),
      );
      final orders = (response.data ?? [])
          .map((e) => PurchaseOrder.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(orders);
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<PurchaseOrder>> getPurchaseOrder(int id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/purchase-orders/$id',
      );
      return Success(PurchaseOrder.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<PurchaseOrder>> createPurchaseOrder(
    CreatePurchaseOrderDto dto,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/purchase-orders',
        data: dto.toJson(),
      );
      return Success(PurchaseOrder.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<PurchaseOrder>> sendPurchaseOrder(int id) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/purchase-orders/$id/send',
      );
      return Success(PurchaseOrder.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<PurchaseOrder>> receivePurchaseOrder(
    int id,
    ReceiveOrderBody body,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/purchase-orders/$id/receive',
        data: body.toJson(),
      );
      return Success(PurchaseOrder.fromJson(response.data!));
    } on DioException catch (e) {
      return Failure(_mapDioError(e));
    } catch (e) {
      return Failure(failures.UnknownFailure());
    }
  }

  Future<Result<List<SuggestedProduct>>> getSuggestedProducts() async {
    try {
      final response =
          await _dio.get<List<dynamic>>('/purchase-orders/suggested-products');
      final products = (response.data ?? [])
          .map((e) => SuggestedProduct.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(products);
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
