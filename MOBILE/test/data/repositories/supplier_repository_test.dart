import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/supplier_datasource.dart';
import 'package:van_stock/data/models/report_and_supplier_models.dart';
import 'package:van_stock/data/repositories/supplier_repository.dart';
import 'package:van_stock/core/errors/result.dart';

// Mock implementation
class MockSupplierRemoteDatasource implements SupplierRemoteDatasource {
  final Map<String, dynamic> _data = {};

  void setupGetSuppliers(Result<List<Supplier>> result) {
    _data['getSuppliers'] = result;
  }

  void setupCreateSupplier(Result<Supplier> result) {
    _data['createSupplier'] = result;
  }

  void setupGetPurchaseOrders(Result<List<PurchaseOrder>> result) {
    _data['getPurchaseOrders'] = result;
  }

  void setupGetPurchaseOrder(Result<PurchaseOrder> result) {
    _data['getPurchaseOrder'] = result;
  }

  void setupCreatePurchaseOrder(Result<PurchaseOrder> result) {
    _data['createPurchaseOrder'] = result;
  }

  void setupSendPurchaseOrder(Result<PurchaseOrder> result) {
    _data['sendPurchaseOrder'] = result;
  }

  void setupReceivePurchaseOrder(Result<PurchaseOrder> result) {
    _data['receivePurchaseOrder'] = result;
  }

  void setupGetSuggestedProducts(Result<List<SuggestedProduct>> result) {
    _data['getSuggestedProducts'] = result;
  }

  @override
  Future<Result<List<Supplier>>> getSuppliers() async {
    return _data['getSuppliers'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Supplier>> createSupplier(CreateSupplierDto dto) async {
    return _data['createSupplier'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<List<PurchaseOrder>>> getPurchaseOrders({String? status}) async {
    return _data['getPurchaseOrders'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<PurchaseOrder>> getPurchaseOrder(int id) async {
    return _data['getPurchaseOrder'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<PurchaseOrder>> createPurchaseOrder(
    CreatePurchaseOrderDto dto,
  ) async {
    return _data['createPurchaseOrder'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<PurchaseOrder>> sendPurchaseOrder(int id) async {
    return _data['sendPurchaseOrder'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<PurchaseOrder>> receivePurchaseOrder(
    int id,
    ReceiveOrderBody body,
  ) async {
    return _data['receivePurchaseOrder'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<List<SuggestedProduct>>> getSuggestedProducts() async {
    return _data['getSuggestedProducts'] ?? Failure('Not mocked');
  }
}

void main() {
  late MockSupplierRemoteDatasource mockDatasource;
  late SupplierRepository repository;

  setUp(() {
    mockDatasource = MockSupplierRemoteDatasource();
    repository = SupplierRepository(mockDatasource);
  });

  group('SupplierRepository', () {
    group('getSuppliers', () {
      test('returns Success with list of suppliers when datasource succeeds',
          () async {
        // Arrange
        final suppliers = [
          Supplier(
            id: 1,
            name: 'ABC Supplies',
            contactName: 'John Smith',
            phone: '+1-555-0123',
            email: 'contact@abc.com',
            website: 'www.abc.com',
            address: '123 Business St',
            notes: 'Reliable supplier',
            deliveryDays: 3,
            productCount: 45,
            createdAt: '2026-04-19',
          ),
          Supplier(
            id: 2,
            name: 'XYZ Logistics',
            contactName: 'Jane Doe',
            phone: '+1-555-0456',
            email: 'info@xyz.com',
            website: 'www.xyz.com',
            address: '456 Trade Ave',
            notes: null,
            deliveryDays: 5,
            productCount: 60,
            createdAt: '2026-04-19',
          ),
        ];

        mockDatasource.setupGetSuppliers(Success(suppliers));

        // Act
        final result = await repository.getSuppliers();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((sups) {
          expect(sups.length, 2);
          expect(sups[0].name, 'ABC Supplies');
          expect(sups[1].name, 'XYZ Logistics');
          expect(sups[0].deliveryDays, 3);
        });
      });

      test('returns Success with empty list when no suppliers', () async {
        // Arrange
        mockDatasource.setupGetSuppliers(Success([]));

        // Act
        final result = await repository.getSuppliers();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((sups) {
          expect(sups.isEmpty, true);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetSuppliers(Failure('Database error'));

        // Act
        final result = await repository.getSuppliers();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Database error');
        });
      });
    });

    group('createSupplier', () {
      test('returns Success with created Supplier when datasource succeeds',
          () async {
        // Arrange
        final dto = CreateSupplierDto(
          name: 'New Supplier',
          contactName: 'Bob Wilson',
          phone: '+1-555-0789',
          email: 'bob@newsupplier.com',
          website: 'www.newsupplier.com',
          address: '789 Commerce Blvd',
          notes: 'New partnership',
          deliveryDays: 4,
        );

        final supplier = Supplier(
          id: 3,
          name: 'New Supplier',
          contactName: 'Bob Wilson',
          phone: '+1-555-0789',
          email: 'bob@newsupplier.com',
          website: 'www.newsupplier.com',
          address: '789 Commerce Blvd',
          notes: 'New partnership',
          deliveryDays: 4,
          productCount: 0,
          createdAt: '2026-04-19',
        );

        mockDatasource.setupCreateSupplier(Success(supplier));

        // Act
        final result = await repository.createSupplier(dto);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((sup) {
          expect(sup.id, 3);
          expect(sup.name, 'New Supplier');
          expect(sup.contactName, 'Bob Wilson');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        final dto = CreateSupplierDto(
          name: 'Duplicate Supplier',
          contactName: null,
          phone: null,
          email: null,
          website: null,
          address: null,
          notes: null,
          deliveryDays: null,
        );

        mockDatasource.setupCreateSupplier(Failure('Supplier already exists'));

        // Act
        final result = await repository.createSupplier(dto);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Supplier already exists');
        });
      });
    });

    group('getPurchaseOrders', () {
      test(
          'returns Success with list of purchase orders when datasource succeeds',
          () async {
        // Arrange
        final orders = [
          PurchaseOrder(
            id: 1,
            supplierId: 1,
            supplierName: 'ABC Supplies',
            status: 'draft',
            notes: 'Initial order',
            orderedAt: null,
            receivedAt: null,
            createdBy: 'admin',
            createdAt: '2026-04-19',
            itemCount: 5,
            totalValue: 2500.0,
            items: null,
          ),
          PurchaseOrder(
            id: 2,
            supplierId: 2,
            supplierName: 'XYZ Logistics',
            status: 'sent',
            notes: null,
            orderedAt: '2026-04-18',
            receivedAt: null,
            createdBy: 'admin',
            createdAt: '2026-04-18',
            itemCount: 3,
            totalValue: 1500.0,
            items: null,
          ),
        ];

        mockDatasource.setupGetPurchaseOrders(Success(orders));

        // Act
        final result = await repository.getPurchaseOrders();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ords) {
          expect(ords.length, 2);
          expect(ords[0].status, 'draft');
          expect(ords[1].status, 'sent');
        });
      });

      test('returns Success with filtered orders by status', () async {
        // Arrange
        final orders = [
          PurchaseOrder(
            id: 1,
            supplierId: 1,
            supplierName: 'ABC Supplies',
            status: 'draft',
            notes: 'Initial order',
            orderedAt: null,
            receivedAt: null,
            createdBy: 'admin',
            createdAt: '2026-04-19',
            itemCount: 5,
            totalValue: 2500.0,
            items: null,
          ),
        ];

        mockDatasource.setupGetPurchaseOrders(Success(orders));

        // Act
        final result = await repository.getPurchaseOrders(status: 'draft');

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ords) {
          expect(ords.length, 1);
          expect(ords[0].status, 'draft');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetPurchaseOrders(Failure('Network error'));

        // Act
        final result = await repository.getPurchaseOrders();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Network error');
        });
      });
    });

    group('getPurchaseOrder', () {
      test('returns Success with PurchaseOrder when datasource succeeds',
          () async {
        // Arrange
        final order = PurchaseOrder(
          id: 1,
          supplierId: 1,
          supplierName: 'ABC Supplies',
          status: 'draft',
          notes: 'Initial order',
          orderedAt: null,
          receivedAt: null,
          createdBy: 'admin',
          createdAt: '2026-04-19',
          itemCount: 5,
          totalValue: 2500.0,
          items: null,
        );

        mockDatasource.setupGetPurchaseOrder(Success(order));

        // Act
        final result = await repository.getPurchaseOrder(1);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ord) {
          expect(ord.id, 1);
          expect(ord.supplierName, 'ABC Supplies');
          expect(ord.status, 'draft');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetPurchaseOrder(Failure('Order not found'));

        // Act
        final result = await repository.getPurchaseOrder(999);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Order not found');
        });
      });
    });

    group('createPurchaseOrder', () {
      test('returns Success with created PurchaseOrder when datasource succeeds',
          () async {
        // Arrange
        final items = [
          CreatePurchaseOrderItemDto(
            productId: 1,
            quantityOrdered: 100,
            unitPrice: 10.0,
            trackLots: false,
          ),
        ];

        final dto = CreatePurchaseOrderDto(
          supplierId: 1,
          notes: 'Test order',
          items: items,
        );

        final order = PurchaseOrder(
          id: 1,
          supplierId: 1,
          supplierName: 'ABC Supplies',
          status: 'draft',
          notes: 'Test order',
          orderedAt: null,
          receivedAt: null,
          createdBy: 'admin',
          createdAt: '2026-04-19',
          itemCount: 1,
          totalValue: 1000.0,
          items: null,
        );

        mockDatasource.setupCreatePurchaseOrder(Success(order));

        // Act
        final result = await repository.createPurchaseOrder(dto);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ord) {
          expect(ord.id, 1);
          expect(ord.status, 'draft');
          expect(ord.itemCount, 1);
        });
      });
    });

    group('sendPurchaseOrder', () {
      test('returns Success with sent PurchaseOrder when datasource succeeds',
          () async {
        // Arrange
        final order = PurchaseOrder(
          id: 1,
          supplierId: 1,
          supplierName: 'ABC Supplies',
          status: 'sent',
          notes: 'Order sent',
          orderedAt: '2026-04-19',
          receivedAt: null,
          createdBy: 'admin',
          createdAt: '2026-04-19',
          itemCount: 5,
          totalValue: 2500.0,
          items: null,
        );

        mockDatasource.setupSendPurchaseOrder(Success(order));

        // Act
        final result = await repository.sendPurchaseOrder(1);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ord) {
          expect(ord.status, 'sent');
          expect(ord.orderedAt, '2026-04-19');
        });
      });
    });

    group('receivePurchaseOrder', () {
      test('returns Success with received PurchaseOrder when datasource succeeds',
          () async {
        // Arrange
        final body = ReceiveOrderBody(
          locationId: 1,
          lotEntries: const [],
        );

        final order = PurchaseOrder(
          id: 1,
          supplierId: 1,
          supplierName: 'ABC Supplies',
          status: 'received',
          notes: 'Order received',
          orderedAt: '2026-04-18',
          receivedAt: '2026-04-19',
          createdBy: 'admin',
          createdAt: '2026-04-18',
          itemCount: 5,
          totalValue: 2500.0,
          items: null,
        );

        mockDatasource.setupReceivePurchaseOrder(Success(order));

        // Act
        final result = await repository.receivePurchaseOrder(1, body);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((ord) {
          expect(ord.status, 'received');
          expect(ord.receivedAt, '2026-04-19');
        });
      });
    });

    group('getSuggestedProducts', () {
      test('returns Success with list of suggested products when datasource succeeds',
          () async {
        // Arrange
        final products = [
          SuggestedProduct(
            productId: 1,
            productName: 'Widget A',
            sku: 'WIDG-A',
            unit: 'pcs',
            currentQty: 10,
            minStock: 20,
            qtyToOrder: 100,
            supplierId: 1,
            supplierName: 'ABC Supplies',
            purchasePrice: 5.0,
          ),
          SuggestedProduct(
            productId: 2,
            productName: 'Widget B',
            sku: 'WIDG-B',
            unit: 'pcs',
            currentQty: 5,
            minStock: 15,
            qtyToOrder: 75,
            supplierId: 2,
            supplierName: 'XYZ Logistics',
            purchasePrice: 7.5,
          ),
        ];

        mockDatasource.setupGetSuggestedProducts(Success(products));

        // Act
        final result = await repository.getSuggestedProducts();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((prods) {
          expect(prods.length, 2);
          expect(prods[0].productName, 'Widget A');
          expect(prods[0].qtyToOrder, 100);
          expect(prods[1].productName, 'Widget B');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetSuggestedProducts(Failure('Service error'));

        // Act
        final result = await repository.getSuggestedProducts();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Service error');
        });
      });
    });
  });
}
