import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/job_models.dart';
import '../../providers/job_providers.dart';

class JobsScreen extends ConsumerStatefulWidget {
  const JobsScreen({super.key});

  @override
  ConsumerState<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends ConsumerState<JobsScreen> with WidgetsBindingObserver {
  static const String _statusAll = 'All';
  static const String _statusOpen = 'Open';
  static const String _statusInProgress = 'In progress';
  static const String _statusCompleted = 'Completed';
  static const String _statusCancelled = 'Cancelled';

  String selectedStatus = _statusAll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Refresh the list when screen is first shown
    Future.microtask(() => ref.invalidate(jobsListProvider));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      // Refresh data when app comes back to foreground
      ref.invalidate(jobsListProvider);
    }
  }

  String _mapStatusToUI(String? backendStatus) {
    if (backendStatus == null) return '';
    return switch (backendStatus.toLowerCase()) {
      'pianificato' || 'aperto' => _statusOpen,
      'in_corso' => _statusInProgress,
      'completato' => _statusCompleted,
      'annullato' => _statusCancelled,
      _ => backendStatus,
    };
  }

  String _getTranslationKey(String status) {
    return switch (status) {
      _statusAll => 'jobs.filter_all',
      _statusOpen => 'jobs.filter_open',
      _statusInProgress => 'jobs.filter_in_progress',
      _statusCompleted => 'jobs.filter_completed',
      _statusCancelled => 'jobs.filter_cancelled',
      _ => status,
    };
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('jobs.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(jobsListProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _TabButton(
                  label: _getTranslationKey(_statusAll).tr(),
                  selected: selectedStatus == _statusAll,
                  onTap: () => setState(() => selectedStatus = _statusAll),
                ),
                const SizedBox(width: 8),
                _TabButton(
                  label: _getTranslationKey(_statusOpen).tr(),
                  selected: selectedStatus == _statusOpen,
                  onTap: () => setState(() => selectedStatus = _statusOpen),
                ),
                const SizedBox(width: 8),
                _TabButton(
                  label: _getTranslationKey(_statusInProgress).tr(),
                  selected: selectedStatus == _statusInProgress,
                  onTap: () => setState(() => selectedStatus = _statusInProgress),
                ),
                const SizedBox(width: 8),
                _TabButton(
                  label: _getTranslationKey(_statusCompleted).tr(),
                  selected: selectedStatus == _statusCompleted,
                  onTap: () => setState(() => selectedStatus = _statusCompleted),
                ),
                const SizedBox(width: 8),
                _TabButton(
                  label: _getTranslationKey(_statusCancelled).tr(),
                  selected: selectedStatus == _statusCancelled,
                  onTap: () => setState(() => selectedStatus = _statusCancelled),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(jobsListProvider.future),
              child: jobsAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.red.shade400,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'jobs.failed_load'.tr(),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(jobsListProvider),
                        child: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                ),
                data: (response) {
                  final jobs = response.data;

                  final filteredJobs = selectedStatus == 'All'
                      ? jobs
                      : jobs
                          .where((job) =>
                              _mapStatusToUI(job.status) == selectedStatus)
                          .toList();

                  // Sort by scheduledDate descending (most recent first)
                  filteredJobs.sort((a, b) {
                    final dateA = a.scheduledDate != null ? DateTime.tryParse(a.scheduledDate!) : null;
                    final dateB = b.scheduledDate != null ? DateTime.tryParse(b.scheduledDate!) : null;
                    if (dateA == null || dateB == null) return 0;
                    return dateB.compareTo(dateA); // descending
                  });

                  if (filteredJobs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.assignment_outlined,
                            size: 64,
                            color: Colors.grey.shade400,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'jobs.no_jobs'.tr(),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: filteredJobs.length,
                    itemBuilder: (context, index) {
                      final job = filteredJobs[index];
                      return _JobCard(
                        job: job,
                        onTap: () => context.push('/jobs/${job.id}'),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Colors.blue : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: selected ? null : Border.all(color: Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.blue,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final Job job;
  final VoidCallback? onTap;

  const _JobCard({required this.job, this.onTap});

  Color _getStatusColor(String status) {
    return switch (status) {
      'completato' => Colors.green,
      'in_corso' => Colors.blue,
      'pianificato' || 'aperto' => Colors.orange,
      'annullato' => Colors.red,
      _ => Colors.grey,
    };
  }

  String _getStatusLabel(String status) {
    return switch (status) {
      'completato' => 'jobs.filter_completed'.tr(),
      'in_corso' => 'jobs.filter_in_progress'.tr(),
      'pianificato' || 'aperto' => 'jobs.filter_open'.tr(),
      'annullato' => 'jobs.filter_cancelled'.tr(),
      _ => status,
    };
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      job.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getStatusColor(job.status).withAlpha(50),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      _getStatusLabel(job.status),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _getStatusColor(job.status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (job.clientName != null) ...[
                Row(
                  children: [
                    Icon(Icons.person_outline, size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Text(
                      job.clientName!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              if (job.scheduledDate != null) ...[
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Text(
                      formatUtcStringToRome(job.scheduledDate, format: 'dd/MM/yyyy'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              if (job.address != null) ...[
                Row(
                  children: [
                    Icon(Icons.location_on_outlined,
                        size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        job.address!,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
