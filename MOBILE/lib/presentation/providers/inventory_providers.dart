import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/inventory_datasource.dart';
import '../../data/repositories/inventory_repository.dart';
import '../../data/models/inventory_models.dart';
import '../../data/models/common_models.dart';
import '../../core/errors/result.dart';
import 'core_providers.dart';

final inventoryRemoteDatasourceProvider = Provider((ref) {
  return InventoryRemoteDatasource(ref.watch(dioClientProvider));
});

final inventoryRepositoryProvider = Provider((ref) {
  return InventoryRepository(ref.watch(inventoryRemoteDatasourceProvider));
});

typedef ProductsFilter = ({bool lowStock, int? locationId});

final productsListProvider = FutureProvider.family<PagedResponse<Product>, ProductsFilter>((ref, filter) async {
  final result = await ref.watch(inventoryRepositoryProvider).getProducts(
    lowStock: filter.lowStock ? true : null,
    locationId: filter.locationId,
  );
  return result.getOrNull() ??
      (throw Exception('Failed to load products'));
});

final locationsProvider = FutureProvider<List<Location>>((ref) async {
  final result = await ref.watch(inventoryRepositoryProvider).getLocations();
  return result.getOrNull() ?? [];
});

final categoriesProvider = FutureProvider<List<String>>((ref) async {
  final result = await ref.watch(inventoryRepositoryProvider).getCategories();
  return switch (result) {
    Success<List<String>>(data: final data) => ['All', ...data],
    Failure<List<String>>(failure: final failure) => throw failure,
  };
});

final productDetailProvider = FutureProvider.family<Product, int>((ref, productId) async {
  final result = await ref.watch(inventoryRepositoryProvider).getProduct(productId);
  return result.getOrNull() ??
      (throw Exception('Failed to load product'));
});

final vansProvider = FutureProvider<List<Location>>((ref) async {
  final result = await ref.watch(inventoryRepositoryProvider).getLocations();
  return switch (result) {
    Success<List<Location>>(data: final locations) =>
      locations.where((l) => l.type.toLowerCase() == 'van').toList(),
    Failure<List<Location>>(failure: final failure) => throw failure,
  };
});

final movementsProvider = FutureProvider.family<List<Movement>, ({int? locationId, DateTime dateFilter})>((
  ref,
  params,
) async {
  final dateStr = params.dateFilter.toIso8601String().split('T')[0];
  
  final result = await ref.watch(inventoryRepositoryProvider).getMovements(
    locationId: params.locationId,
    from: '${dateStr}T00:00:00Z',
    to: '${dateStr}T23:59:59Z',
  );
  
  final allMovements = switch (result) {
    Success<List<Movement>>(data: final movements) => movements,
    Failure<List<Movement>>(failure: final failure) => throw failure,
  };

  if (params.locationId == null) {
    return allMovements;
  }

  return allMovements
      .where((m) => m.fromLocationId == params.locationId || m.toLocationId == params.locationId)
      .toList();
});
