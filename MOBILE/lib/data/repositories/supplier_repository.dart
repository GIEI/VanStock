import '../datasources/remote/supplier_datasource.dart';
import '../models/report_and_supplier_models.dart';
import '../../core/errors/result.dart';

class SupplierRepository {
  final SupplierRemoteDatasource _remoteDatasource;

  SupplierRepository(this._remoteDatasource);

  Future<Result<List<Supplier>>> getSuppliers() =>
      _remoteDatasource.getSuppliers();

  Future<Result<Supplier>> createSupplier(CreateSupplierDto dto) =>
      _remoteDatasource.createSupplier(dto);

  Future<Result<List<PurchaseOrder>>> getPurchaseOrders({
    String? status,
  }) =>
      _remoteDatasource.getPurchaseOrders(status: status);

  Future<Result<PurchaseOrder>> getPurchaseOrder(int id) =>
      _remoteDatasource.getPurchaseOrder(id);

  Future<Result<PurchaseOrder>> createPurchaseOrder(
    CreatePurchaseOrderDto dto,
  ) =>
      _remoteDatasource.createPurchaseOrder(dto);

  Future<Result<PurchaseOrder>> sendPurchaseOrder(int id) =>
      _remoteDatasource.sendPurchaseOrder(id);

  Future<Result<PurchaseOrder>> receivePurchaseOrder(
    int id,
    ReceiveOrderBody body,
  ) =>
      _remoteDatasource.receivePurchaseOrder(id, body);

  Future<Result<List<SuggestedProduct>>> getSuggestedProducts() =>
      _remoteDatasource.getSuggestedProducts();
}
