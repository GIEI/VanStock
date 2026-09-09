import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/supplier_datasource.dart';
import '../../data/repositories/supplier_repository.dart';
import 'core_providers.dart';

final supplierRemoteDatasourceProvider = Provider((ref) {
  return SupplierRemoteDatasource(ref.watch(dioClientProvider));
});

final supplierRepositoryProvider = Provider((ref) {
  return SupplierRepository(ref.watch(supplierRemoteDatasourceProvider));
});
