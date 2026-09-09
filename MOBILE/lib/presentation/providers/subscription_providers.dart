import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/subscription_datasource.dart';
import '../../data/repositories/subscriptions_repository.dart';
import '../../data/models/subscription_models.dart';
import 'core_providers.dart';
import 'auth_providers.dart';

final subscriptionRemoteDatasourceProvider = Provider((ref) {
  return SubscriptionRemoteDatasource(ref.watch(dioClientProvider));
});

final subscriptionsRepositoryProvider = Provider((ref) {
  return SubscriptionsRepository(ref.watch(subscriptionRemoteDatasourceProvider));
});

/// Returns the company seat usage only when the current user is admin or
/// superadmin. For 'user' role returns null without making a request.
final mySeatUsageProvider = FutureProvider<SeatUsage?>((ref) async {
  final user = await ref.watch(currentUserProvider.future);
  if (user == null) return null;
  if (user.role != 'admin' && user.role != 'superadmin') return null;

  final repo = ref.watch(subscriptionsRepositoryProvider);
  final result = await repo.getMyUsage();
  return result.getOrNull();
});
