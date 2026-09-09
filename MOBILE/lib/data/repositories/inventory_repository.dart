import '../datasources/remote/inventory_datasource.dart';
import '../models/inventory_models.dart';
import '../models/common_models.dart';
import '../../core/errors/result.dart';

class InventoryRepository {
  final InventoryRemoteDatasource _remoteDatasource;

  InventoryRepository(this._remoteDatasource);

  Future<Result<List<Location>>> getLocations() =>
      _remoteDatasource.getLocations();

  Future<Result<Location>> createLocation(CreateLocationDto dto) =>
      _remoteDatasource.createLocation(dto);

  Future<Result<PagedResponse<Product>>> getProducts({
    String? search,
    int? locationId,
    bool? lowStock,
    String? locationType,
    int page = 1,
    int limit = 50,
  }) => _remoteDatasource.getProducts(
    search: search,
    locationId: locationId,
    lowStock: lowStock,
    locationType: locationType,
    page: page,
    limit: limit,
  );

  Future<Result<Product>> getProduct(int id) =>
      _remoteDatasource.getProduct(id);

  Future<Result<Movement>> createMovement(CreateMovementDto dto) =>
      _remoteDatasource.createMovement(dto);

  Future<Result<void>> deleteMovement(int id) =>
      _remoteDatasource.deleteMovement(id);

  Future<Result<List<Movement>>> getMovements({
    int? productId,
    int? locationId,
    String? type,
    String? from,
    String? to,
    int limit = 500,
  }) => _remoteDatasource.getMovements(
    productId: productId,
    locationId: locationId,
    type: type,
    from: from,
    to: to,
    limit: limit,
  );

  Future<Result<DashboardStats>> getDashboardStats() =>
      _remoteDatasource.getDashboardStats();

  Future<Result<List<DashboardAlert>>> getDashboardAlerts() =>
      _remoteDatasource.getDashboardAlerts();
  Future<Result<List<String>>> getCategories() =>
      _remoteDatasource.getCategories();
}
