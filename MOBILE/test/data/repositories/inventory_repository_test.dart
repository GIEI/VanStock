import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/inventory_datasource.dart';
import 'package:van_stock/data/models/inventory_models.dart';
import 'package:van_stock/data/models/common_models.dart';
import 'package:van_stock/data/repositories/inventory_repository.dart';
import 'package:van_stock/core/errors/result.dart';

// Mock implementation
class MockInventoryRemoteDatasource implements InventoryRemoteDatasource {
  final Map<String, dynamic> _data = {};

  void setupGetLocations(Result<List<Location>> result) {
    _data['getLocations'] = result;
  }

  void setupGetProducts(Result<PagedResponse<Product>> result) {
    _data['getProducts'] = result;
  }

  void setupGetProduct(int id, Result<Product> result) {
    _data['getProduct_$id'] = result;
  }

  void setupGetDashboardStats(Result<DashboardStats> result) {
    _data['getDashboardStats'] = result;
  }

  void setupGetDashboardAlerts(Result<List<DashboardAlert>> result) {
    _data['getDashboardAlerts'] = result;
  }

  void setupGetCategories(Result<List<String>> result) {
    _data['getCategories'] = result;
  }

  @override
  Future<Result<List<Location>>> getLocations() async {
    return _data['getLocations'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Location>> createLocation(CreateLocationDto dto) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<PagedResponse<Product>>> getProducts({
    String? search,
    int? locationId,
    bool? lowStock,
    int page = 1,
  }) async {
    return _data['getProducts'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Product>> getProduct(int id) async {
    return _data['getProduct_$id'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Movement>> createMovement(CreateMovementDto dto) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<List<Movement>>> getMovements({
    int? productId,
    int? locationId,
    String? type,
    String? from,
    String? to,
    int limit = 500,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<List<String>>> getCategories() async {
    return _data['getCategories'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<DashboardStats>> getDashboardStats() async {
    return _data['getDashboardStats'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<List<DashboardAlert>>> getDashboardAlerts() async {
    return _data['getDashboardAlerts'] ?? Failure('Not mocked');
  }
}

void main() {
  late MockInventoryRemoteDatasource mockDatasource;
  late InventoryRepository repository;

  setUp(() {
    mockDatasource = MockInventoryRemoteDatasource();
    repository = InventoryRepository(mockDatasource);
  });

  group('InventoryRepository', () {
    group('getProducts', () {
      test('returns Success with PagedResponse when datasource succeeds',
          () async {
        // Arrange
        final mockProduct = Product(
          id: 1,
          name: 'Test Product',
          sku: 'SKU001',
          barcode: 'BC001',
          description: 'Test Description',
          quantity: 100,
          unit: 'pcs',
          minStock: 10,
          locationId: 1,
          locationName: 'Warehouse A',
          locationType: 'warehouse',
          category: 'Electronics',
          photoUrl: null,
          price: 99.99,
          notes: null,
          createdAt: '2026-04-19',
          stocks: null,
        );

        final pagedResponse = PagedResponse(
          data: [mockProduct],
          total: 1,
          page: 1,
          limit: 10,
        );
        mockDatasource.setupGetProducts(Success(pagedResponse));

        // Act
        final result = await repository.getProducts();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((response) {
          expect(response.data.length, 1);
          expect(response.data[0].id, 1);
          expect(response.data[0].name, 'Test Product');
          expect(response.data[0].quantity, 100);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetProducts(Failure('Connection error'));

        // Act
        final result = await repository.getProducts();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Connection error');
        });
      });
    });

    group('getLocations', () {
      test('returns Success with list of locations when datasource succeeds',
          () async {
        // Arrange
        final locations = [
          Location(
            id: 1,
            name: 'Warehouse A',
            type: 'warehouse',
            status: 'active',
            plate: null,
            description: 'Main warehouse',
            productCount: 150,
            totalItems: 5000,
            createdAt: '2026-04-19',
          ),
          Location(
            id: 2,
            name: 'Store B',
            type: 'store',
            status: 'active',
            plate: null,
            description: 'Retail store',
            productCount: 80,
            totalItems: 500,
            createdAt: '2026-04-19',
          ),
        ];

        mockDatasource.setupGetLocations(Success(locations));

        // Act
        final result = await repository.getLocations();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((locs) {
          expect(locs.length, 2);
          expect(locs[0].name, 'Warehouse A');
          expect(locs[1].name, 'Store B');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetLocations(Failure('API error'));

        // Act
        final result = await repository.getLocations();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'API error');
        });
      });
    });

    group('getDashboardStats', () {
      test('returns Success with DashboardStats when datasource succeeds',
          () async {
        // Arrange
        final stats = DashboardStats(
          totalProducts: 150,
          totalItems: 5000,
          totalValue: 15000.0,
          lowStockCount: 5,
          movementsToday: 12,
          totalMovements: 250,
          totalLocations: 3,
        );

        mockDatasource.setupGetDashboardStats(Success(stats));

        // Act
        final result = await repository.getDashboardStats();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((stat) {
          expect(stat.totalProducts, 150);
          expect(stat.totalValue, 15000.0);
          expect(stat.lowStockCount, 5);
          expect(stat.movementsToday, 12);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetDashboardStats(Failure('Database error'));

        // Act
        final result = await repository.getDashboardStats();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Database error');
        });
      });
    });

    group('getDashboardAlerts', () {
      test('returns Success with list of alerts when datasource succeeds',
          () async {
        // Arrange
        final alerts = [
          DashboardAlert(
            id: 1,
            name: 'Low Stock Alert',
            sku: 'SKU001',
            quantity: 5,
            minStock: 10,
            locationName: 'Warehouse A',
          ),
          DashboardAlert(
            id: 2,
            name: 'Critical Stock',
            sku: 'SKU002',
            quantity: 1,
            minStock: 5,
            locationName: 'Store B',
          ),
        ];

        mockDatasource.setupGetDashboardAlerts(Success(alerts));

        // Act
        final result = await repository.getDashboardAlerts();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((alts) {
          expect(alts.length, 2);
          expect(alts[0].name, 'Low Stock Alert');
          expect(alts[1].quantity, 1);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetDashboardAlerts(Failure('Service unavailable'));

        // Act
        final result = await repository.getDashboardAlerts();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Service unavailable');
        });
      });
    });
  });
}
