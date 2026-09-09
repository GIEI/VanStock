import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/auth_datasource.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/models/auth_models.dart';
import 'core_providers.dart';

final authRemoteDatasourceProvider = Provider((ref) {
  return AuthRemoteDatasource(ref.watch(dioClientProvider));
});

final authRepositoryProvider = Provider((ref) {
  return AuthRepository(ref.watch(authRemoteDatasourceProvider));
});

final currentUserProvider = FutureProvider<AuthUser?>((ref) async {
  final repo = ref.watch(authRepositoryProvider);
  final result = await repo.me();
  return result.getOrNull();
});
