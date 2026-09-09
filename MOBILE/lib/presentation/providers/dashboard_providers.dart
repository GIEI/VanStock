import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/common_models.dart';
import '../../data/models/inventory_models.dart';
import '../../core/errors/result.dart';
import 'inventory_providers.dart';
import 'job_providers.dart';
import 'auth_providers.dart';

final dashboardStatsProvider =
    FutureProvider<DashboardStats>((ref) async {
  final result = await ref.watch(inventoryRepositoryProvider).getDashboardStats();
  return result.getOrNull() ??
      (throw Exception('Failed to load dashboard stats'));
});

final recentMovementsProvider = FutureProvider<List<Movement>>((ref) async {
  final now = DateTime.now();
  final thirtyDaysAgo = now.subtract(const Duration(days: 30));

  final fromDate = '${thirtyDaysAgo.year}-${thirtyDaysAgo.month.toString().padLeft(2, '0')}-${thirtyDaysAgo.day.toString().padLeft(2, '0')}T00:00:00Z';
  final toDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}T23:59:59Z';

  final result = await ref.watch(inventoryRepositoryProvider).getMovements(
    limit: 50,
    from: fromDate,
    to: toDate,
  );

  return switch (result) {
    Success<List<Movement>>(data: final movements) => movements,
    Failure<List<Movement>>(failure: final failure) =>
      throw Exception('Failed to load movements: ${failure.toString()}'),
  };
});

final dashboardAlertsProvider =
    FutureProvider<List<DashboardAlert>>((ref) async {
  final result = await ref.watch(inventoryRepositoryProvider).getDashboardAlerts();
  return result.getOrNull() ?? [];
});

final jobsTodayCountProvider = FutureProvider<int>((ref) async {
  final now = DateTime.now();
  final today = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

  // Get current user ID from auth
  final currentUser = await ref.watch(currentUserProvider.future);
  final currentUserId = currentUser?.id;

  if (currentUserId == null) return 0;

  final result = await ref.watch(jobRepositoryProvider).getJobs();
  final jobs = result.getOrNull()?.data ?? [];

  return jobs.where((job) {
    // Only count jobs assigned to current user
    final isAssignedToUser = job.assignedTo == currentUserId;
    // Only count jobs that are not completed or cancelled
    final isOpen = job.status != 'completato' && job.status != 'annullato';
    // Only count jobs scheduled for today
    final isToday = job.scheduledDate?.startsWith(today) == true;
    return isAssignedToUser && isOpen && isToday;
  }).toList().length;
});
