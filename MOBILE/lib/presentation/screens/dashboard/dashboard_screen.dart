import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/subscription_models.dart';
import '../../providers/dashboard_providers.dart';
import '../../providers/subscription_providers.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardStatsProvider);
    final movementsAsync = ref.watch(recentMovementsProvider);
    final jobsTodayAsync = ref.watch(jobsTodayCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('dashboard.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(dashboardStatsProvider);
              ref.invalidate(recentMovementsProvider);
              ref.invalidate(jobsTodayCountProvider);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _SeatUsageBanner(usage: ref.watch(mySeatUsageProvider).value),
          Expanded(
            child: RefreshIndicator(
        onRefresh: () => Future.wait([
          ref.refresh(dashboardStatsProvider.future),
          ref.refresh(recentMovementsProvider.future),
          ref.refresh(jobsTodayCountProvider.future),
          ref.refresh(mySeatUsageProvider.future),
        ]),
        child: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'dashboard.failed_load'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(dashboardStatsProvider);
                  ref.invalidate(dashboardAlertsProvider);
                },
                child: Text('dashboard.retry_button'.tr()),
              ),
            ],
          ),
        ),
        data: (stats) => jobsTodayAsync.when(
          data: (jobsCount) => SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'dashboard.overview'.tr(),
                  style: Theme.of(context).textTheme.titleLarge,
                  ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _OverviewCard(
                      title: 'dashboard.jobs_for_today'.tr(),
                      value: jobsCount.toString(),
                      icon: Icons.assignment_outlined,
                      color: Colors.blue,
                      onTap: () => context.go('/jobs'),
                    ),
                    _OverviewCard(
                      title: 'dashboard.low_stock'.tr(),
                      value: stats.lowStockCount.toString(),
                      icon: Icons.warning_outlined,
                      color: Colors.orange,
                      onTap: () => context.go('/inventory'),
                    ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                'dashboard.recent_movements'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              movementsAsync.when(
                loading: () => const Center(
                  child: SizedBox(
                    height: 48,
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (_, _) => Text('dashboard.failed_movements'.tr()),
                data: (movements) {
                  if (movements.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'dashboard.no_recent_movements'.tr(),
                        style: const TextStyle(color: Colors.green),
                      ),
                    );
                  }
                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: movements.length,
                    itemBuilder: (context, index) {
                      final movement = movements[index];
                      final movementType = movement.type.toLowerCase().trim();

                      late Color bgColor;
                      late Color iconColor;
                      late IconData icon;

                      if (movementType.contains('carico') || movementType.contains('restock') || movementType.contains('load')) {
                        bgColor = Colors.green.shade100;
                        iconColor = Colors.green;
                        icon = Icons.add;
                      } else if (movementType.contains('scarico') || movementType.contains('unload')) {
                        bgColor = Colors.orange.shade100;
                        iconColor = Colors.orange;
                        icon = Icons.remove;
                      } else if (movementType.contains('trasferimento') || movementType.contains('transfer')) {
                        bgColor = Colors.blue.shade100;
                        iconColor = Colors.blue;
                        icon = Icons.compare_arrows;
                      } else {
                        bgColor = Colors.grey.shade100;
                        iconColor = Colors.grey;
                        icon = Icons.circle;
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: bgColor,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  icon,
                                  color: iconColor,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      movement.productName ?? 'common.unknown'.tr(),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    Text(
                                      '${movement.quantity.toStringAsFixed(1)} ${movement.unit ?? 'common.unit_default'.tr()} · ${movement.type}',
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                formatUtcStringToRome(movement.createdAt, format: 'dd/MM/yyyy'),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
          ),
          loading: () => const Center(
            child: SizedBox(
              height: 200,
              child: CircularProgressIndicator(),
            ),
          ),
          error: (_, _) => Center(
            child: Text('dashboard.failed_jobs_count'.tr()),
          ),
        ),
      ),
    ),
          ),
        ],
      ),
    );
  }
}

class _SeatUsageBanner extends StatelessWidget {
  final SeatUsage? usage;
  const _SeatUsageBanner({required this.usage});

  @override
  Widget build(BuildContext context) {
    final u = usage;
    if (u == null || (!u.isFull && !u.isWarning)) return const SizedBox.shrink();

    final color = u.isFull ? Colors.red.shade100 : Colors.orange.shade100;
    final textColor = u.isFull ? Colors.red.shade900 : Colors.orange.shade900;
    final icon = u.isFull ? Icons.lock : Icons.event_seat;
    final message = u.isFull
        ? 'dashboard.seats_limit_reached'.tr(namedArgs: {'used': '${u.usedSeats}', 'max': '${u.maxSeats}'})
        : 'dashboard.seats_warning'.tr(namedArgs: {'used': '${u.usedSeats}', 'max': '${u.maxSeats}'});

    return Container(
      width: double.infinity,
      color: color,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icon, color: textColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _OverviewCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 48, color: Colors.white),
              const SizedBox(height: 12),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
