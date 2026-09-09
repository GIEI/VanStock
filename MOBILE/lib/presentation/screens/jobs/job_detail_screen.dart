import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;
import 'package:logger/logger.dart';
import 'package:camera/camera.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'dart:ui' as ui;
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/job_models.dart';
import '../../../data/models/inventory_models.dart';
import '../../../data/models/vehicle_models.dart';
import '../../../core/errors/result.dart';
import '../../providers/job_providers.dart';
import '../../providers/job_detail_providers.dart';
import '../../providers/vehicle_providers.dart';
import '../../providers/inventory_providers.dart';
import '../../providers/geolocation_provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/media_limits.dart';
import '../../providers/auth_providers.dart';
import 'job_chat_widget.dart';

class JobDetailScreen extends ConsumerWidget {
  final int jobId;

  const JobDetailScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(jobId));

    void refreshLists() {
      ref.invalidate(jobsListProvider);
    }

    return jobAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text('jobs.details_title'.tr())),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Scaffold(
        appBar: AppBar(title: Text('jobs.details_title'.tr())),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red.shade400),
              const SizedBox(height: 16),
              Text(
                'common.error'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(jobDetailProvider(jobId)),
                child: Text('common.retry'.tr()),
              ),
            ],
          ),
        ),
      ),
      data: (job) => Scaffold(
        appBar: AppBar(
          title: Text('jobs.details_title'.tr()),
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.invalidate(jobDetailProvider(jobId)),
              tooltip: 'jobs.refresh_tooltip'.tr(),
            ),
          ],
        ),
        body: SingleChildScrollView(
          child: Column(
            children: [
              _WorkflowStepsBar(job: job),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _JobHeaderCard(
                  job: job,
                  onJobUpdated: () {
                    ref.invalidate(jobDetailProvider(jobId));
                    refreshLists();
                  },
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _JobDetailsCard(job: job),
              ),
              if (job.clientName != null) ...[
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _ClientCard(job: job),
                ),
              ],
              if (job.vehicleBooking != null) ...[
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _VehicleBookingCard(vb: job.vehicleBooking!),
                ),
              ],
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _PhotosSection(
                  title: 'jobs.problem_photos'.tr(),
                  icon: Icons.broken_image,
                  iconColor: Colors.red,
                  photos: (job.photos ?? [])
                      .where((p) => p.type == 'problem')
                      .toList(),
                  photoType: 'problem',
                  jobId: jobId,
                  canAdd: job.startedAt != null && job.signedAt == null,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _MaterialsSection(job: job, jobId: jobId),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _PhotosSection(
                  title: 'jobs.repair_photos'.tr(),
                  icon: Icons.build,
                  iconColor: Colors.green,
                  photos: (job.photos ?? [])
                      .where((p) => p.type == 'repair')
                      .toList(),
                  photoType: 'repair',
                  jobId: jobId,
                  canAdd: job.startedAt != null && job.signedAt == null,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _ChatSection(jobId: jobId),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Workflow Steps Bar ──────────────────────────────────────────────────────

class _WorkflowStepsBar extends StatelessWidget {
  final Job job;

  const _WorkflowStepsBar({required this.job});

  @override
  Widget build(BuildContext context) {
    final steps = [
      (job.status != 'aperto', context.tr('jobs.accept_job'), Icons.thumb_up),
      (
        job.startedAt != null,
        context.tr('jobs.mark_arrived'),
        Icons.location_on,
      ),
      (
        job.status == 'completato',
        context.tr('common.confirm'),
        Icons.check_circle,
      ),
    ];

    return Container(
      color: Colors.grey.shade50,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(steps.length * 2 - 1, (index) {
              if (index.isEven) {
                final stepIndex = index ~/ 2;
                final (done, label, icon) = steps[stepIndex];
                return Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: done
                              ? Colors.blue.shade500
                              : Colors.grey.shade300,
                          boxShadow: [
                            if (done)
                              BoxShadow(
                                color: Colors.blue.shade500.withValues(
                                  alpha: 0.3,
                                ),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                          ],
                        ),
                        child: Icon(icon, size: 24, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 54,
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: done
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: done
                                ? Colors.blue.shade700
                                : Colors.grey.shade600,
                            height: 1.25,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              } else {
                final lineIndex = index ~/ 2;
                final prevStepDone = steps[lineIndex].$1;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Container(
                      height: 3,
                      decoration: BoxDecoration(
                        color: prevStepDone
                            ? Colors.blue.shade500
                            : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                );
              }
            }),
          ),
        ],
      ),
    );
  }
}

// ── Job Header Card ─────────────────────────────────────────────────────────

class _JobHeaderCard extends ConsumerWidget {
  final Job job;
  final VoidCallback onJobUpdated;

  const _JobHeaderCard({required this.job, required this.onJobUpdated});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'jobs.details_title'.tr(),
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(job.status).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _getStatusLabel(job.status),
                    style: TextStyle(
                      color: _getStatusColor(job.status),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (job.startedAt != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.access_time, size: 14, color: Colors.green),
                  const SizedBox(width: 6),
                  Text(
                    '${context.tr("jobs.mark_arrived")}: ${formatUtcStringToRome(job.startedAt, format: 'dd/MM/yyyy HH:mm')}',
                    style: const TextStyle(color: Colors.green, fontSize: 12),
                  ),
                ],
              ),
            ],
            if (job.completedAt != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    size: 14,
                    color: Colors.indigo,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${context.tr("jobs.job_completed")}: ${formatUtcStringToRome(job.completedAt, format: 'dd/MM/yyyy HH:mm')}',
                    style: const TextStyle(color: Colors.indigo, fontSize: 12),
                  ),
                ],
              ),
            ],
            if (job.productMissing == true) ...[
              const SizedBox(height: 12),
              Chip(
                avatar: const Icon(
                  Icons.warning_amber_rounded,
                  size: 16,
                  color: Colors.white,
                ),
                label: Text(
                  job.productMissingNote != null &&
                          job.productMissingNote!.isNotEmpty
                      ? '${('jobs.product_missing_chip'.tr())}: ${job.productMissingNote}'
                      : 'jobs.product_missing_chip'.tr(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                backgroundColor: Colors.orange,
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(horizontal: 4),
              ),
            ],
            const SizedBox(height: 16),
            Text(job.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            _ActionButtons(job: job, onJobUpdated: onJobUpdated),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'aperto':
      case 'pianificato':
        return Colors.orange;
      case 'in_corso':
        return Colors.blue;
      case 'completato':
        return Colors.indigo;
      case 'annullato':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'aperto':
      case 'pianificato':
        return 'jobs.filter_open'.tr();
      case 'in_corso':
        return 'jobs.filter_in_progress'.tr();
      case 'completato':
        return 'jobs.filter_completed'.tr();
      case 'annullato':
        return 'jobs.filter_cancelled'.tr();
      default:
        return status;
    }
  }
}

// ── Action Buttons ──────────────────────────────────────────────────────────

class _ActionButtons extends ConsumerWidget {
  final Job job;
  final VoidCallback onJobUpdated;

  const _ActionButtons({required this.job, required this.onJobUpdated});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (job.status == 'aperto' || job.status == 'pianificato') ...[
          ElevatedButton.icon(
            onPressed: () => _showVanSelectionModal(context, ref),
            icon: const Icon(Icons.play_arrow),
            label: Text('jobs.accept_job'.tr()),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _rejectJob(context, ref),
            icon: const Icon(Icons.close),
            label: Text('jobs.reject_job'.tr()),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
        if (job.status == 'in_corso') ...[
          if (job.startedAt == null) ...[
            ElevatedButton.icon(
              onPressed: () => _markAsArrived(context, ref),
              icon: const Icon(Icons.my_location),
              label: Text('jobs.mark_arrived'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
            const SizedBox(height: 12),
          ],
          ElevatedButton.icon(
            onPressed: job.startedAt != null
                ? () => _completeJob(context, ref)
                : null,
            icon: const Icon(Icons.draw, color: Colors.white),
            label: Text(
              'jobs.sign_complete'.tr(),
              style: const TextStyle(color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: job.startedAt != null
                  ? Colors.purple.shade600
                  : Colors.grey.shade400,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ],
    );
  }

  void _showVanSelectionModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _VanSelectionModal(
        job: job,
        onConfirm:
            (
              vehicleId,
              startTime,
              endTime,
              productMissing,
              productMissingNote,
            ) async {
              Navigator.pop(sheetContext);
              await _submitAcceptJob(
                context,
                ref,
                vehicleId,
                startTime,
                endTime,
                productMissing: productMissing,
                productMissingNote: productMissingNote,
              );
            },
      ),
    );
  }

  Future<void> _submitAcceptJob(
    BuildContext context,
    WidgetRef ref,
    int vehicleId,
    String startTime,
    String endTime, {
    bool productMissing = false,
    String? productMissingNote,
  }) async {
    // Acquire geolocation
    final location = await ref
        .read(geolocationServiceProvider)
        .getCurrentLocation();

    final result = await ref
        .read(jobActionProvider)
        .acceptJob(
          job.id,
          vehicleId,
          startTime,
          endTime,
          latitude: location?['latitude'] as double?,
          longitude: location?['longitude'] as double?,
          locationAddress: null,
          productMissing: productMissing,
          productMissingNote: productMissingNote,
        );

    if (!context.mounted) return;

    switch (result) {
      case Success<Job>():
        ref.invalidate(jobDetailProvider(job.id));
        onJobUpdated();
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('jobs.job_accepted'.tr())));
      case Failure<Job>(:final failure):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'common.error'.tr()}: $failure')),
        );
    }
  }

  void _rejectJob(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('jobs.reject_dialog_title'.tr()),
        content: Text('jobs.reject_dialog_content'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);

              // Acquire geolocation
              final location = await ref
                  .read(geolocationServiceProvider)
                  .getCurrentLocation();

              final result = await ref
                  .read(jobActionProvider)
                  .rejectJob(
                    job.id,
                    latitude: location?['latitude'] as double?,
                    longitude: location?['longitude'] as double?,
                    locationAddress: null,
                  );

              if (!context.mounted) return;

              switch (result) {
                case Success<Job>():
                  ref.invalidate(jobDetailProvider(job.id));
                  onJobUpdated();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('jobs.job_rejected'.tr())),
                  );
                case Failure<Job>(:final failure):
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${'common.error'.tr()}: $failure')),
                  );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('jobs.reject_job'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _markAsArrived(BuildContext context, WidgetRef ref) async {
    // Acquire geolocation
    final location = await ref
        .read(geolocationServiceProvider)
        .getCurrentLocation();

    final result = await ref
        .read(jobActionProvider)
        .startWork(
          job.id,
          latitude: location?['latitude'] as double?,
          longitude: location?['longitude'] as double?,
          locationAddress: null,
        );

    if (!context.mounted) return;

    switch (result) {
      case Success<Job>():
        ref.invalidate(jobDetailProvider(job.id));
        onJobUpdated();
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('jobs.job_arrived'.tr())));
      case Failure<Job>(:final failure):
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'common.error'.tr()}: $failure')),
        );
    }
  }

  void _completeJob(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _SignaturePadDialog(
        jobId: job.id,
        onSignatureSaved: () {
          ref.invalidate(jobDetailProvider(job.id));
          onJobUpdated();
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('jobs.job_completed'.tr())));
        },
      ),
    );
  }
}

// ── Van Selection Modal ─────────────────────────────────────────────────────

class _VanSelectionModal extends ConsumerStatefulWidget {
  final Job job;
  final Function(
    int vehicleId,
    String startTime,
    String endTime,
    bool productMissing,
    String? productMissingNote,
  )
  onConfirm;

  const _VanSelectionModal({required this.job, required this.onConfirm});

  @override
  ConsumerState<_VanSelectionModal> createState() => _VanSelectionModalState();
}

class _VanSelectionModalState extends ConsumerState<_VanSelectionModal> {
  String? selectedStartTime;
  String? selectedEndTime;
  int? selectedVehicleId;
  bool hasSearched = false;
  bool _productMissing = false;
  String? _productMissingNote;

  Future<String?> _showProductMissingNoteDialog(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text('jobs.product_missing_note_title'.tr()),
        content: TextField(
          controller: controller,
          maxLines: 3,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'jobs.product_missing_note_hint'.tr(),
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            child: Text('common.confirm'.tr()),
          ),
        ],
      ),
    );
  }

  List<String> _generateTimeSlots({
    String startHHMM = '07:00',
    String endHHMM = '20:00',
  }) {
    final times = <String>[];
    final s = startHHMM.split(':');
    final e = endHHMM.split(':');
    final startMins = int.parse(s[0]) * 60 + int.parse(s[1]);
    final endMins = int.parse(e[0]) * 60 + int.parse(e[1]);
    for (int t = (startMins ~/ 30) * 30; t <= endMins; t += 30) {
      final h = t ~/ 60;
      final m = t % 60;
      times.add(
        '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}',
      );
    }
    return times;
  }

  List<String> _getAvailableEndTimes(List<String> allTimeSlots) {
    if (selectedStartTime == null) return [];
    final startIndex = allTimeSlots.indexOf(selectedStartTime!);
    if (startIndex == -1) return [];
    return allTimeSlots.sublist(startIndex + 1);
  }

  bool _isValidTimeRange() {
    if (selectedStartTime == null || selectedEndTime == null) return true;
    final start = selectedStartTime!.split(':');
    final end = selectedEndTime!.split(':');
    final startMins = int.parse(start[0]) * 60 + int.parse(start[1]);
    final endMins = int.parse(end[0]) * 60 + int.parse(end[1]);
    return startMins < endMins;
  }

  @override
  Widget build(BuildContext context) {
    final jobDate = formatUtcStringToRome(
      widget.job.scheduledDate,
      format: 'yyyy-MM-dd',
    );

    // Only fetch vans if we have both start and end times
    final availableVansAsync =
        (hasSearched && selectedStartTime != null && selectedEndTime != null)
        ? ref.watch(
            availableVansProvider((
              date: jobDate,
              startTime: selectedStartTime!,
              endTime: selectedEndTime!,
              jobId: widget.job.id,
            )),
          )
        : null;

    final shifts = ref.watch(workShiftsProvider).asData?.value;
    final allTimeSlots = _generateTimeSlots(
      startHHMM: shifts?.start ?? '07:00',
      endHHMM: shifts?.end ?? '20:00',
    );
    final availableEndTimes = _getAvailableEndTimes(allTimeSlots);

    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'vehicles.detail_title'.tr(),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Text(
              'vehicles.start_time_label'.tr(),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            DropdownButton<String>(
              isExpanded: true,
              value: selectedStartTime,
              hint: Text('vehicles.time_hint'.tr()),
              items: allTimeSlots
                  .map(
                    (time) => DropdownMenuItem(value: time, child: Text(time)),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  selectedStartTime = value;
                  if (selectedEndTime != null && value != null) {
                    final start = value.split(':');
                    final end = selectedEndTime!.split(':');
                    final startMins =
                        int.parse(start[0]) * 60 + int.parse(start[1]);
                    final endMins = int.parse(end[0]) * 60 + int.parse(end[1]);
                    if (endMins <= startMins) {
                      selectedEndTime = null;
                    }
                  }
                  hasSearched = false;
                });
              },
            ),
            const SizedBox(height: 20),
            Text(
              'vehicles.end_time_label'.tr(),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            DropdownButton<String>(
              isExpanded: true,
              value: selectedEndTime,
              hint: Text('vehicles.time_hint'.tr()),
              items: availableEndTimes
                  .map(
                    (time) => DropdownMenuItem(value: time, child: Text(time)),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  selectedEndTime = value;
                  hasSearched = false;
                });
              },
            ),
            const SizedBox(height: 24),
            if (!_isValidTimeRange() &&
                selectedStartTime != null &&
                selectedEndTime != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'common.error'.tr(),
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ElevatedButton(
              onPressed:
                  (selectedStartTime != null &&
                      selectedEndTime != null &&
                      _isValidTimeRange())
                  ? () {
                      setState(() => hasSearched = true);
                    }
                  : null,
              child: Text('common.confirm'.tr()),
            ),
            const SizedBox(height: 24),
            if (availableVansAsync != null)
              availableVansAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Text('${'common.error'.tr()}: $error'),
                data: (response) {
                  final existingBooking = response.existingBooking;
                  final availableVans = response.available;
                  final mustUseVanId = response.mustUseVanId;

                  // When user has an existing booking, force selection of that van
                  if (existingBooking != null && mustUseVanId != null) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) {
                        setState(() => selectedVehicleId = mustUseVanId);
                      }
                    });
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        border: Border.all(color: Colors.blue),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'jobs.no_van_booked'.tr(),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(color: Colors.blue.shade200),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${existingBooking.vanName}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.blue,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        'common.edit'.tr(),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${'vehicles.plate'.tr()}: ${existingBooking.vanPlate}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${formatUtcStringToRome(existingBooking.date, format: 'dd/MM/yyyy')} ${formatUtcStringToRome(existingBooking.startTime, format: 'HH:mm')}-${formatUtcStringToRome(existingBooking.endTime, format: 'HH:mm')}',
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(color: Colors.blue),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'common.loading'.tr(),
                            style: const TextStyle(
                              fontStyle: FontStyle.italic,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  if (availableVans.isEmpty) {
                    return Text('jobs.no_van_booked'.tr());
                  }

                  return Column(
                    children: availableVans.map((location) {
                      final isOwned = location.owned == true;
                      final sufficient = location.isStockSufficient;
                      return Container(
                        decoration: BoxDecoration(
                          color: sufficient == true
                              ? Colors.green.shade50
                              : sufficient == false
                              ? Colors.red.shade50
                              : isOwned
                              ? Colors.blue.shade50
                              : null,
                          border: Border(
                            bottom: BorderSide(
                              color: sufficient == true
                                  ? Colors.green.shade200
                                  : sufficient == false
                                  ? Colors.red.shade200
                                  : Colors.grey.shade200,
                            ),
                          ),
                        ),
                        child: Theme(
                          data: Theme.of(
                            context,
                          ).copyWith(dividerColor: Colors.transparent),
                          child: ExpansionTile(
                            leading: Radio<int>(
                              value: location.id,
                              groupValue: selectedVehicleId,
                              onChanged: (value) =>
                                  setState(() => selectedVehicleId = value),
                            ),
                            title: Row(
                              children: [
                                Text(location.name),
                                if (isOwned) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.blue,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'common.yours'.tr(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                                if (sufficient != null) ...[
                                  const SizedBox(width: 8),
                                  Icon(
                                    sufficient
                                        ? Icons.check_circle
                                        : Icons.error_outline,
                                    color: sufficient
                                        ? Colors.green
                                        : Colors.red,
                                    size: 20,
                                  ),
                                ],
                              ],
                            ),
                            subtitle:
                                location.plate != null ||
                                    (sufficient == false &&
                                        location.missingMaterials.isNotEmpty)
                                ? Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if (location.plate != null)
                                        Text(
                                          '${'vehicles.plate'.tr()}: ${location.plate}',
                                        ),
                                      if (sufficient == false &&
                                          location.missingMaterials.isNotEmpty)
                                        Text(
                                          '${'jobs.missing_materials'.tr()}: ${location.missingMaterials.map((material) => material.productName).join(', ')}',
                                          style: TextStyle(
                                            color: Colors.red.shade800,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                    ],
                                  )
                                : null,
                            onExpansionChanged: (_) =>
                                setState(() => selectedVehicleId = location.id),
                            children: [
                              if (sufficient == false &&
                                  location.missingMaterials.isNotEmpty)
                                _MissingMaterialsList(
                                  materials: location.missingMaterials,
                                ),
                              _VanProductsList(vanId: location.id),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            const SizedBox(height: 16),
            CheckboxListTile(
              value: _productMissing,
              onChanged: (v) async {
                final checked = v ?? false;
                if (checked) {
                  final note = await _showProductMissingNoteDialog(context);
                  if (note != null) {
                    setState(() {
                      _productMissing = true;
                      _productMissingNote = note;
                    });
                  }
                } else {
                  setState(() {
                    _productMissing = false;
                    _productMissingNote = null;
                  });
                }
              },
              title: Text(
                'jobs.product_missing_label'.tr(),
                style: const TextStyle(fontSize: 14),
              ),
              subtitle: _productMissing && _productMissingNote != null
                  ? Text(
                      _productMissingNote!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.orange,
                      ),
                    )
                  : null,
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: Colors.orange,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('common.cancel'.tr()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed:
                        (hasSearched &&
                                selectedVehicleId != null &&
                                selectedStartTime != null &&
                                selectedEndTime != null ||
                            hasSearched &&
                                availableVansAsync?.maybeWhen(
                                      data: (r) => r.existingBooking != null,
                                      orElse: () => false,
                                    ) ==
                                    true)
                        ? () {
                            final vehicleId =
                                selectedVehicleId ??
                                availableVansAsync?.maybeWhen(
                                  data: (r) => r.existingBooking?.locationId,
                                  orElse: () => null,
                                ) ??
                                0;

                            if (vehicleId > 0 &&
                                selectedStartTime != null &&
                                selectedEndTime != null) {
                              widget.onConfirm(
                                vehicleId,
                                selectedStartTime!,
                                selectedEndTime!,
                                _productMissing,
                                _productMissingNote,
                              );
                            }
                          }
                        : null,
                    child: Text('common.confirm'.tr()),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MissingMaterialsList extends StatelessWidget {
  final List<MissingMaterial> materials;

  const _MissingMaterialsList({required this.materials});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'jobs.missing_materials'.tr(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.red.shade900,
            ),
          ),
          const SizedBox(height: 6),
          ...materials.map(
            (material) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                '${material.productName}: ${'jobs.missing_material_details'.tr(namedArgs: {'missing': _formatQuantity(material.quantityMissing), 'available': _formatQuantity(material.quantityAvailable), 'required': _formatQuantity(material.quantityRequired), 'unit': material.unit ?? ''})}',
                style: TextStyle(fontSize: 12, color: Colors.red.shade900),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatQuantity(double quantity) => quantity == quantity.roundToDouble()
    ? quantity.toInt().toString()
    : quantity.toString();

// ── Van Products List ───────────────────────────────────────────────────────

class _VanProductsList extends ConsumerWidget {
  final int vanId;

  const _VanProductsList({required this.vanId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(vanProductsProvider(vanId));
    return productsAsync.when(
      loading: () => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Text(
              'vehicles.van_contents_loading'.tr(),
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Text(
          '${'common.error'.tr()}: $e',
          style: TextStyle(fontSize: 12, color: Colors.red.shade600),
        ),
      ),
      data: (products) {
        if (products.isEmpty) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Chip(
              avatar: Icon(
                Icons.inventory_2_outlined,
                size: 16,
                color: Colors.grey.shade600,
              ),
              label: Text(
                'vehicles.van_empty'.tr(),
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
              backgroundColor: Colors.grey.shade100,
              side: BorderSide.none,
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'vehicles.van_contents'.tr(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 6),
              ...products.map(
                (p) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      Icon(Icons.circle, size: 5, color: Colors.grey.shade400),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          p.name,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      Text(
                        '${p.quantity.toStringAsFixed(p.quantity.truncateToDouble() == p.quantity ? 0 : 2)} ${p.unit ?? ''}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Job Details Card ────────────────────────────────────────────────────────

class _JobDetailsCard extends StatelessWidget {
  final Job job;

  const _JobDetailsCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'jobs.details_title'.tr(),
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (job.description != null) ...[
              Text(
                'create_job.description_label'.tr(),
                style: Theme.of(context).textTheme.labelSmall,
              ),
              const SizedBox(height: 4),
              Text(job.description!),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),
            ],
            _DetailRow(
              'create_job.scheduled_date_label'.tr(),
              formatUtcStringToRome(job.scheduledDate, format: 'dd/MM/yyyy') ??
                  'N/A',
            ),
            if (job.scheduledTime != null)
              _DetailRow(
                'create_job.custom_time_label'.tr(),
                _formatScheduledTime(
                  job.scheduledTime,
                  job.scheduledTimeCustom,
                ),
              ),
            _DetailRow('jobs.assigned_to'.tr(), job.assignedToName ?? 'N/A'),
            if (job.address != null)
              _DetailRow('create_job.address_label'.tr(), job.address!),
          ],
        ),
      ),
    );
  }

  String _formatScheduledTime(String? time, String? customTime) {
    if (time == null) return 'N/A';

    switch (time) {
      case 'morning':
        return '🌅 ${'jobs.time_morning'.tr()}';
      case 'afternoon':
        return '☀️ ${'jobs.time_afternoon'.tr()}';
      case 'all_day':
        return '📅 ${'jobs.time_all_day'.tr()}';
      case 'custom':
        return customTime != null
            ? '🕐 ${customTime.substring(0, 5)}'
            : 'jobs.time_custom'.tr();
      default:
        return time;
    }
  }
}

// ── Client Card ─────────────────────────────────────────────────────────────

class _ClientCard extends StatelessWidget {
  final Job job;

  const _ClientCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'jobs.customer'.tr(),
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _DetailRow(
              'create_product.name_label'.tr(),
              job.clientName ?? 'N/A',
            ),
            if (job.clientPhone != null)
              _DetailRow('jobs.client_phone'.tr(), job.clientPhone!),
            if (job.clientEmail != null)
              _DetailRow('auth.email_label'.tr(), job.clientEmail!),
            if (job.clientAddress != null)
              _DetailRow('create_job.address_label'.tr(), job.clientAddress!),
          ],
        ),
      ),
    );
  }
}

// ── Vehicle Booking Card ────────────────────────────────────────────────────

class _VehicleBookingCard extends StatelessWidget {
  final VehicleBooking vb;

  const _VehicleBookingCard({required this.vb});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        border: Border.all(color: Colors.green),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_shipping, color: Colors.green, size: 20),
              const SizedBox(width: 8),
              Text(
                'vehicles.detail_title'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${vb.vanName} (${vb.vanPlate})',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            '${formatUtcStringToRome(vb.date, format: 'dd/MM/yyyy')} • ${formatUtcStringToRome(vb.startTime, format: 'HH:mm')}-${formatUtcStringToRome(vb.endTime, format: 'HH:mm')}',
            style: TextStyle(color: Colors.green.shade700, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

// ── Photos Section ─────────────────────────────────────────────────────────

class _PhotosSection extends ConsumerStatefulWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final List<JobPhoto> photos;
  final String photoType;
  final int jobId;
  final bool canAdd;

  const _PhotosSection({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.photos,
    required this.photoType,
    required this.jobId,
    required this.canAdd,
  });

  @override
  ConsumerState<_PhotosSection> createState() => _PhotosSectionState();
}

class _PhotosSectionState extends ConsumerState<_PhotosSection> {
  bool _uploading = false;
  final _logger = Logger();

  @override
  void initState() {
    super.initState();
    _recoverLostCameraPhoto();
  }

  /// On Android, the system can kill the Flutter activity while the camera is
  /// open (especially outdoors where GPS + camera + screen drain memory).
  /// When the user presses OK, the activity is recreated and pickImage() returns
  /// null. retrieveLostData() recovers the captured photo from the new instance.
  Future<void> _recoverLostCameraPhoto() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final picker = ImagePicker();
      final lostData = await picker.retrieveLostData();
      if (lostData.isEmpty || lostData.file == null) return;
      _logger.i(
        'Recovered lost camera photo, uploading to ${widget.photoType}',
      );
      if (!mounted) return;
      setState(() => _uploading = true);
      try {
        await _uploadFile(File(lostData.file!.path), 'photo');
      } finally {
        if (mounted) setState(() => _uploading = false);
      }
    } catch (e) {
      _logger.e('Error recovering lost camera data: $e');
    }
  }

  String _getFullImageUrl(String url) {
    if (url.startsWith('http')) return url;
    final baseUrl = AppConstants.baseUrl.replaceAll('/api', '');
    return baseUrl + url;
  }

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    if (_uploading) return;
    setState(() => _uploading = true);
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(
        source: source,
        imageQuality: source == ImageSource.camera ? 75 : null,
      );
      if (file == null) {
        _logger.w(
          'pickImage returned null (Android activity may have been killed — will recover via retrieveLostData on next initState)',
        );
        return;
      }
      await _uploadFile(File(file.path), 'photo');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _recordAndUploadVideo() async {
    if (_uploading) return;
    setState(() => _uploading = true);
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('jobs.no_camera'.tr())));
        }
        return;
      }

      // Prefer rear camera
      final rearCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      if (!mounted) return;
      final result = await Navigator.push<File?>(
        context,
        MaterialPageRoute(
          builder: (context) => _VideoRecorderScreen(camera: rearCamera),
        ),
      );

      if (result != null && mounted) {
        await _uploadFile(result, 'video');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _uploadFile(File file, String mediaType) async {
    try {
      // Acquire geolocation with a short timeout so it doesn't delay the upload
      final location = await ref
          .read(geolocationServiceProvider)
          .getCurrentLocation()
          .timeout(const Duration(seconds: 8), onTimeout: () => null);

      final jobActionNotifier = ref.read(jobActionProvider);
      final result = await jobActionNotifier.uploadPhoto(
        widget.jobId,
        widget.photoType,
        file,
        latitude: location?['latitude'] as double?,
        longitude: location?['longitude'] as double?,
        locationAddress: null,
      );

      result.whenSuccess((_) {
        ref.invalidate(jobDetailProvider(widget.jobId));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'jobs.media_upload_success'.tr(
                  namedArgs: {'mediaType': mediaType},
                ),
              ),
            ),
          );
        }
      });

      result.whenFailure((failure) {
        if (mounted) {
          final msg = failure.toString().contains('MEDIA_LIMIT_EXCEEDED')
              ? 'jobs.media_limit_exceeded'.tr()
              : 'jobs.media_upload_failed'.tr(
                  namedArgs: {'failure': failure.toString()},
                );
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(msg)));
        }
      });
    } catch (e) {
      _logger.e('Unexpected error during photo upload: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'jobs.media_upload_failed'.tr(
                namedArgs: {'failure': e.toString()},
              ),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);
    final plan = userAsync.value?.planType;
    final limits = MediaLimits.forPlan(plan);

    final imageCount = widget.photos.where((p) => !p.isVideo).length;
    final videoCount = widget.photos.where((p) => p.isVideo).length;

    final canTakePhoto = widget.canAdd && imageCount < limits.image;
    final canTakeVideo =
        widget.canAdd && limits.video > 0 && videoCount < limits.video;
    final showVideoBtn = limits.video > 0;

    final counter = limits.isUnlimitedImage()
        ? 'jobs.photos_unlimited'.tr(namedArgs: {'count': '$imageCount'})
        : 'jobs.photos_limited'.tr(
            namedArgs: {'count': '$imageCount', 'max': '${limits.image}'},
          );
    final videoCounter = showVideoBtn
        ? (limits.isUnlimitedVideo()
              ? 'jobs.videos_unlimited'.tr(namedArgs: {'count': '$videoCount'})
              : 'jobs.videos_limited'.tr(
                  namedArgs: {'count': '$videoCount', 'max': '${limits.video}'},
                ))
        : '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(widget.icon, color: widget.iconColor, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  counter + videoCounter,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
                if (widget.canAdd) ...[
                  if (_uploading)
                    const Padding(
                      padding: EdgeInsets.only(left: 8),
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  else ...[
                    IconButton(
                      icon: const Icon(Icons.camera_alt),
                      iconSize: 20,
                      onPressed: canTakePhoto
                          ? () => _pickAndUploadPhoto(ImageSource.camera)
                          : null,
                      tooltip: canTakePhoto
                          ? 'jobs.take_photo_tooltip'.tr()
                          : 'jobs.photo_limit_reached'.tr(),
                    ),
                    if (showVideoBtn)
                      IconButton(
                        icon: const Icon(Icons.videocam),
                        iconSize: 20,
                        onPressed: canTakeVideo ? _recordAndUploadVideo : null,
                        tooltip: canTakeVideo
                            ? 'jobs.record_video_tooltip'.tr()
                            : 'jobs.video_limit_reached'.tr(),
                      ),
                  ],
                ],
              ],
            ),
            const SizedBox(height: 12),
            if (widget.photos.isEmpty)
              Text(
                'common.no_data'.tr(),
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Colors.grey),
              )
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: widget.photos.map((photo) {
                    final fullUrl = _getFullImageUrl(photo.url);
                    final isVideo =
                        fullUrl.endsWith('.mp4') ||
                        fullUrl.endsWith('.mov') ||
                        fullUrl.endsWith('.avi');
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => _MediaViewerScreen(
                              url: fullUrl,
                              photoId: photo.id,
                              jobId: widget.jobId,
                              onDelete: () {
                                Navigator.pop(context);
                                ref.invalidate(jobDetailProvider(widget.jobId));
                              },
                            ),
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: isVideo
                              ? Container(
                                  width: 80,
                                  height: 80,
                                  color: Colors.grey.shade800,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      Icon(
                                        Icons.videocam,
                                        size: 32,
                                        color: Colors.white,
                                      ),
                                      Positioned(
                                        bottom: 4,
                                        right: 4,
                                        child: Icon(
                                          Icons.play_circle,
                                          size: 20,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : Image.network(
                                  fullUrl,
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      width: 80,
                                      height: 80,
                                      color: Colors.grey.shade200,
                                      child: Column(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          const Icon(
                                            Icons.image_not_supported,
                                            size: 24,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'common.error'.tr(),
                                            style: Theme.of(
                                              context,
                                            ).textTheme.bodySmall,
                                            textAlign: TextAlign.center,
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Materials Section ───────────────────────────────────────────────────────

class _MaterialsSection extends ConsumerStatefulWidget {
  final Job job;
  final int jobId;

  const _MaterialsSection({required this.job, required this.jobId});

  @override
  ConsumerState<_MaterialsSection> createState() => _MaterialsSectionState();
}

class _MaterialsSectionState extends ConsumerState<_MaterialsSection> {
  final bool _adding = false;

  @override
  Widget build(BuildContext context) {
    final movements = widget.job.movements ?? [];
    final canAdd = widget.job.startedAt != null && widget.job.signedAt == null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.inventory_2, size: 20, color: Colors.blue),
                const SizedBox(width: 8),
                Text(
                  'jobs.add_material_dialog'.tr(),
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                if (canAdd && !_adding)
                  IconButton(
                    icon: const Icon(Icons.add),
                    iconSize: 20,
                    onPressed: () => _showAddMaterialDialog(context),
                    tooltip: 'jobs.add_material_tooltip'.tr(),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (movements.isEmpty)
              Text(
                'common.no_data'.tr(),
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Colors.grey),
              )
            else
              Column(
                children: movements
                    .map(
                      (mov) => _MovementRow(
                        movement: mov,
                        canDelete: canAdd,
                        onDelete: () => _deleteMovement(mov),
                      ),
                    )
                    .toList(),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteMovement(Movement mov) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('jobs.delete_material_title'.tr()),
        content: Text(
          'jobs.delete_material_confirm'.tr(
            namedArgs: {'name': mov.productName ?? ''},
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final repo = ref.read(inventoryRepositoryProvider);
    final result = await repo.deleteMovement(mov.id);
    if (!mounted) return;
    result.whenSuccess((_) {
      if (widget.job.vehicleBooking != null) {
        ref.invalidate(
          vanProductsProvider(widget.job.vehicleBooking!.locationId),
        );
      }
      ref.invalidate(jobDetailProvider(widget.jobId));
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('jobs.material_deleted'.tr())));
    });
    result.whenFailure((f) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('${'common.error'.tr()}: $f')));
    });
  }

  void _showAddMaterialDialog(BuildContext context) {
    if (widget.job.vehicleBooking == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('jobs.no_van_booked'.tr())));
      return;
    }

    final vanLocationId = widget.job.vehicleBooking!.locationId;
    ref.invalidate(vanProductsProvider(vanLocationId));

    showDialog(
      context: context,
      builder: (context) => _AddMaterialDialog(
        jobId: widget.jobId,
        vanLocationId: vanLocationId,
        jobTitle: widget.job.title,
        onMaterialAdded: () {
          ref.invalidate(vanProductsProvider(vanLocationId));
          ref.invalidate(jobDetailProvider(widget.jobId));
        },
      ),
    );
  }
}

class _MovementRow extends StatelessWidget {
  final Movement movement;
  final bool canDelete;
  final VoidCallback? onDelete;

  const _MovementRow({
    required this.movement,
    this.canDelete = false,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final (typeColor, typeLabel) = _getMovementTypeColor(movement.type);

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
                color: typeColor.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  typeLabel.isNotEmpty ? typeLabel[0] : '?',
                  style: TextStyle(
                    color: typeColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    movement.productName ?? 'Unknown',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                  Text(
                    '${movement.quantity} ${movement.unit ?? ''}',
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),
            if (canDelete && onDelete != null)
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                iconSize: 20,
                onPressed: onDelete,
                tooltip: 'common.delete'.tr(),
              ),
          ],
        ),
      ),
    );
  }

  (Color, String) _getMovementTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'carico':
        return (Colors.green, 'jobs.movement_load'.tr());
      case 'scarico':
        return (Colors.orange, 'jobs.movement_unload'.tr());
      case 'trasferimento':
        return (Colors.indigo, 'jobs.movement_transfer'.tr());
      default:
        return (Colors.grey, type);
    }
  }
}

// ── Detail Row ──────────────────────────────────────────────────────────────

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: Colors.grey),
          ),
          Text(value, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

// ── Signature Pad Dialog ────────────────────────────────────────────────────

class _SignaturePadDialog extends ConsumerStatefulWidget {
  final int jobId;
  final VoidCallback onSignatureSaved;

  const _SignaturePadDialog({
    required this.jobId,
    required this.onSignatureSaved,
  });

  @override
  ConsumerState<_SignaturePadDialog> createState() =>
      _SignaturePadDialogState();
}

class _SignaturePadDialogState extends ConsumerState<_SignaturePadDialog> {
  late final _SignaturePainter _painter;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _painter = _SignaturePainter();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'jobs.signature_title'.tr(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('jobs.signature_label'.tr()),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onPanDown: (details) {
                          setState(() {
                            _painter.addPoint(details.localPosition);
                          });
                        },
                        onPanUpdate: (details) {
                          setState(() {
                            _painter.addPoint(details.localPosition);
                          });
                        },
                        onPanEnd: (details) {
                          setState(() {
                            _painter.addPoint(null);
                          });
                        },
                        child: CustomPaint(
                          painter: _painter,
                          size: Size(
                            constraints.maxWidth,
                            constraints.maxHeight,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _isSubmitting
                          ? null
                          : () {
                              setState(() {
                                _painter.clear();
                              });
                            },
                      icon: const Icon(Icons.delete),
                      label: Text('jobs.clear_button'.tr()),
                    ),
                    ElevatedButton.icon(
                      onPressed: _isSubmitting ? null : _submitSignature,
                      icon: _isSubmitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.check),
                      label: Text(
                        _isSubmitting
                            ? 'jobs.saving_button'.tr()
                            : 'jobs.confirm_button'.tr(),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitSignature() async {
    if (_painter.points.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('jobs.signature_required'.tr())));
      return;
    }

    setState(() => _isSubmitting = true);

    // Convert signature to base64
    try {
      final signatureBase64 = await _painter.toBase64();

      // Acquire geolocation
      final location = await ref
          .read(geolocationServiceProvider)
          .getCurrentLocation();

      final result = await ref
          .read(jobActionProvider)
          .signJob(
            widget.jobId,
            signatureBase64,
            latitude: location?['latitude'] as double?,
            longitude: location?['longitude'] as double?,
            locationAddress: null,
          );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      switch (result) {
        case Success<Job>():
          Navigator.pop(context);
          widget.onSignatureSaved();
        case Failure<Job>(:final failure):
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${'common.error'.tr()}: $failure')),
          );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${'common.error'.tr()}: $e')));
      }
      return;
    }
  }
}

// ── Signature Painter ───────────────────────────────────────────────────────

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points = [];

  void addPoint(Offset? point) {
    points.add(point);
  }

  void clear() {
    points.clear();
  }

  Future<String> toBase64() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, const Rect.fromLTWH(0, 0, 300, 200));

    // Draw white background
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 300, 200),
      Paint()..color = Colors.white,
    );

    // Draw signature
    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }

    final picture = recorder.endRecording();
    final image = await picture.toImage(300, 200);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    final bytes = byteData!.buffer.asUint8List();
    return 'data:image/png;base64,${base64Encode(bytes)}';
  }

  @override
  void paint(Canvas canvas, Size size) {
    // Draw white background
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = Colors.white,
    );

    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) {
    return oldDelegate.points.length != points.length;
  }
}

// ── Media Viewer Screen ─────────────────────────────────────────────────────

class _MediaViewerScreen extends ConsumerStatefulWidget {
  final String url;
  final int photoId;
  final int jobId;
  final VoidCallback onDelete;

  const _MediaViewerScreen({
    required this.url,
    required this.photoId,
    required this.jobId,
    required this.onDelete,
  });

  @override
  ConsumerState<_MediaViewerScreen> createState() => _MediaViewerScreenState();
}

class _MediaViewerScreenState extends ConsumerState<_MediaViewerScreen> {
  bool _isVideo = false;
  bool _isDeleting = false;
  late VideoPlayerController _videoController;
  late ChewieController _chewieController;
  bool _isInitialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _isVideo =
        widget.url.endsWith('.mp4') ||
        widget.url.endsWith('.mov') ||
        widget.url.endsWith('.avi');
    if (_isVideo) {
      _initializeVideo();
    }
  }

  Future<void> _initializeVideo() async {
    try {
      _videoController = VideoPlayerController.networkUrl(
        Uri.parse(widget.url),
      );
      await _videoController.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoController,
        autoPlay: true,
        looping: false,
        showControls: true,
        showOptions: false,
      );

      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = 'jobs.video_load_error'.tr(
            namedArgs: {'error': e.toString()},
          ),
        );
      }
    }
  }

  Future<void> _deleteMedia() async {
    setState(() => _isDeleting = true);
    try {
      final jobActionNotifier = ref.read(jobActionProvider);
      final result = await jobActionNotifier.deletePhoto(
        widget.jobId,
        widget.photoId,
      );

      result.whenSuccess((_) {
        widget.onDelete();
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('jobs.media_deleted'.tr())));
        }
      });

      result.whenFailure((failure) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${'common.error'.tr()}: $failure')),
          );
        }
      });
    } finally {
      if (mounted) setState(() => _isDeleting = false);
    }
  }

  @override
  void dispose() {
    if (_isVideo) {
      _chewieController.dispose();
      _videoController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete, color: Colors.red),
            onPressed: _isDeleting ? null : _deleteMedia,
          ),
        ],
      ),
      body: Center(
        child: _isVideo
            ? _error != null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.white),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    )
                  : _isInitialized
                  ? Chewie(controller: _chewieController)
                  : const CircularProgressIndicator()
            : Image.network(widget.url, fit: BoxFit.contain),
      ),
    );
  }
}

// ── Video Recorder Screen ───────────────────────────────────────────────────

class _VideoRecorderScreen extends StatefulWidget {
  final CameraDescription camera;

  const _VideoRecorderScreen({required this.camera});

  @override
  State<_VideoRecorderScreen> createState() => _VideoRecorderScreenState();
}

class _VideoRecorderScreenState extends State<_VideoRecorderScreen> {
  late CameraController _controller;
  Timer? _timer;
  int _secondsElapsed = 0;
  bool _isRecording = false;
  bool _isInitialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _controller = CameraController(
        widget.camera,
        ResolutionPreset.high,
        enableAudio: true,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await _controller.initialize();
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = 'jobs.camera_error'.tr(namedArgs: {'error': '$e'}),
        );
      }
    }
  }

  Future<void> _startRecording() async {
    if (!_isInitialized || _isRecording) return;

    try {
      await _controller.startVideoRecording();
      setState(() {
        _isRecording = true;
        _secondsElapsed = 0;
      });

      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }

        setState(() => _secondsElapsed++);

        if (_secondsElapsed >= 5) {
          timer.cancel();
          _stopAndSave();
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${'common.error'.tr()}: $e')));
      }
    }
  }

  Future<void> _stopAndSave() async {
    try {
      _timer?.cancel();
      if (!_isRecording) return;

      final file = await _controller.stopVideoRecording();
      if (mounted) {
        setState(() => _isRecording = false);
        Navigator.pop(context, File(file.path));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${'common.error'.tr()}: $e')));
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    if (_isRecording) {
      _controller.stopVideoRecording().ignore();
    }
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(_error!),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.close'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return Scaffold(body: const Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          CameraPreview(_controller),
          // Timer
          Positioned(
            top: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${5 - _secondsElapsed}s',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          // Controls
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Cancel button
                  FloatingActionButton(
                    onPressed: () => Navigator.pop(context),
                    backgroundColor: Colors.red,
                    child: const Icon(Icons.close),
                  ),
                  const SizedBox(width: 40),
                  // Record/Stop button
                  if (!_isRecording)
                    FloatingActionButton(
                      onPressed: _startRecording,
                      backgroundColor: Colors.red,
                      child: const Icon(Icons.fiber_manual_record),
                    )
                  else
                    FloatingActionButton(
                      onPressed: _stopAndSave,
                      backgroundColor: Colors.green,
                      child: const Icon(Icons.stop),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Add Material Dialog ─────────────────────────────────────────────────────

class _AddMaterialDialog extends ConsumerStatefulWidget {
  final int jobId;
  final int vanLocationId;
  final String jobTitle;
  final VoidCallback onMaterialAdded;

  const _AddMaterialDialog({
    required this.jobId,
    required this.vanLocationId,
    required this.jobTitle,
    required this.onMaterialAdded,
  });

  @override
  ConsumerState<_AddMaterialDialog> createState() => _AddMaterialDialogState();
}

class _AddMaterialDialogState extends ConsumerState<_AddMaterialDialog> {
  Product? _selectedProduct;
  final _quantityController = TextEditingController();
  final String _movementType = 'scarico';
  bool _saving = false;

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(vanProductsProvider(widget.vanLocationId));

    return AlertDialog(
      title: Text('jobs.add_material_dialog'.tr()),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Product dropdown
            productsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Text('${'common.error'.tr()}: $error'),
              data: (products) => LayoutBuilder(
                builder: (context, constraints) => DropdownMenu<Product>(
                  width: constraints.maxWidth,
                  menuHeight: 320,
                  enableFilter: true,
                  enableSearch: true,
                  requestFocusOnTap: true,
                  initialSelection: _selectedProduct,
                  label: Text('jobs.search_material'.tr()),
                  leadingIcon: const Icon(Icons.inventory_2),
                  onSelected: (product) {
                    setState(() => _selectedProduct = product);
                  },
                  dropdownMenuEntries: products
                      .map(
                        (product) => DropdownMenuEntry(
                          value: product,
                          label: product.name,
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Quantity input — listen to controller locally to avoid full dialog rebuild on each keystroke
            ListenableBuilder(
              listenable: _quantityController,
              builder: (context, _) => TextField(
                controller: _quantityController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: 'create_product.quantity_label'.tr(),
                  hintText: _selectedProduct != null
                      ? 'jobs.max_quantity'.tr(
                          namedArgs: {'max': '${_selectedProduct!.quantity}'},
                        )
                      : '',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  prefixIcon: const Icon(Icons.numbers),
                  suffixText: _selectedProduct?.unit ?? '',
                  errorText: _getQuantityError(),
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('common.cancel'.tr()),
        ),
        ListenableBuilder(
          listenable: _quantityController,
          builder: (context, _) => ElevatedButton(
            onPressed: _isAddButtonEnabled() ? _saveMaterial : null,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text('create_product.add_button'.tr()),
          ),
        ),
      ],
    );
  }

  String? _getQuantityError() {
    if (_selectedProduct == null || _quantityController.text.isEmpty) {
      return null;
    }

    final quantity = double.tryParse(_quantityController.text);
    if (quantity == null) {
      return 'jobs.invalid_quantity'.tr();
    }

    if (quantity <= 0) {
      return 'jobs.quantity_min'.tr();
    }

    if (quantity > _selectedProduct!.quantity) {
      return 'jobs.quantity_exceeds'.tr(
        namedArgs: {'max': '${_selectedProduct!.quantity}'},
      );
    }

    return null;
  }

  bool _isAddButtonEnabled() {
    if (_selectedProduct == null ||
        _quantityController.text.isEmpty ||
        _saving) {
      return false;
    }

    final quantity = double.tryParse(_quantityController.text);
    if (quantity == null ||
        quantity <= 0 ||
        quantity > _selectedProduct!.quantity) {
      return false;
    }

    return true;
  }

  Future<void> _saveMaterial() async {
    if (_selectedProduct == null || !_isAddButtonEnabled()) return;

    setState(() => _saving = true);
    try {
      final quantity = double.tryParse(_quantityController.text) ?? 0;

      // Create movement DTO with product from dropdown and quantity
      final dto = CreateMovementDto(
        productId: _selectedProduct!.id,
        type: _movementType,
        quantity: quantity,
        fromLocationId: widget.vanLocationId,
        toLocationId: null,
        notes: 'Used in job: ${widget.jobTitle}',
        jobId: widget.jobId,
        createdBy: null,
        purchasePrice: null,
      );

      // Call inventory API to create the movement
      final inventoryRepository = ref.read(inventoryRepositoryProvider);
      final result = await inventoryRepository.createMovement(dto);

      if (mounted) {
        result.whenSuccess((_) {
          Navigator.pop(context);
          widget.onMaterialAdded();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '${'jobs.add_material_dialog'.tr()}: ${_selectedProduct!.name}',
              ),
            ),
          );
        });

        result.whenFailure((failure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${'common.error'.tr()}: $failure')),
          );
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${'common.error'.tr()}: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

// ── Chat Section ──────────────────────────────────────────────────────────────

class _ChatSection extends StatelessWidget {
  final int jobId;

  const _ChatSection({required this.jobId});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.chat_bubble_outline, size: 20),
                const SizedBox(width: 8),
                Text(
                  'jobs.chat_title'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(height: 300, child: JobChatWidget(jobId: jobId)),
          ],
        ),
      ),
    );
  }
}
