import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/attendance_v2_models.dart';
import '../../providers/attendance_v2_providers.dart';

class OverrideRequestScreen extends ConsumerStatefulWidget {
  const OverrideRequestScreen({super.key});

  @override
  ConsumerState<OverrideRequestScreen> createState() =>
      _OverrideRequestScreenState();
}

class _OverrideRequestScreenState
    extends ConsumerState<OverrideRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  AttendanceAction _action = AttendanceAction.CHECK_IN;
  DateTime _date = DateTime.now();
  TimeOfDay _time = TimeOfDay.now();
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time,
    );
    if (picked != null) setState(() => _time = picked);
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final dt = DateTime(
      _date.year,
      _date.month,
      _date.day,
      _time.hour,
      _time.minute,
    );
    ref.read(overrideRequestProvider.notifier).submit(
          requestedAction: _action,
          requestedAt: dt,
          reason: _reasonController.text.trim(),
        );
  }

  String _actionLabel(AttendanceAction a) {
    return switch (a) {
      AttendanceAction.CHECK_IN => 'attendance.action_check_in'.tr(),
      AttendanceAction.CHECK_OUT => 'attendance.action_check_out'.tr(),
      AttendanceAction.BREAK_START => 'attendance.action_break_start'.tr(),
      AttendanceAction.BREAK_END => 'attendance.action_break_end'.tr(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(overrideRequestProvider);
    final myRequestsAsync = ref.watch(myOverrideRequestsProvider);

    ref.listen(overrideRequestProvider, (prev, next) {
      if (next is OverrideSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('attendance.request_submitted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        _reasonController.clear();
        ref.read(overrideRequestProvider.notifier).reset();
      } else if (next is OverrideError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: Colors.red,
          ),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(title: Text('attendance.requests_title'.tr())),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'attendance.request_form_title'.tr(),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<AttendanceAction>(
                  initialValue: _action,
                  decoration: InputDecoration(
                    labelText: 'attendance.requested_action'.tr(),
                    border: const OutlineInputBorder(),
                  ),
                  items: AttendanceAction.values
                      .map((a) => DropdownMenuItem(
                            value: a,
                            child: Text(_actionLabel(a)),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _action = v ?? _action),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickDate,
                        icon: const Icon(Icons.calendar_today),
                        label: Text(
                          '${_date.day.toString().padLeft(2, '0')}/'
                          '${_date.month.toString().padLeft(2, '0')}/'
                          '${_date.year}',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickTime,
                        icon: const Icon(Icons.access_time),
                        label: Text(_time.format(context)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _reasonController,
                  decoration: InputDecoration(
                    labelText: 'attendance.reason_label'.tr(),
                    hintText: 'attendance.reason_hint'.tr(),
                    border: const OutlineInputBorder(),
                  ),
                  minLines: 3,
                  maxLines: 5,
                  validator: (v) {
                    if (v == null || v.trim().length < 10) {
                      return 'attendance.reason_min_length'.tr();
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: submitState is OverrideSubmitting ? null : _submit,
                  icon: submitState is OverrideSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                  label: Text('common.submit'.tr()),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 12),
          Text(
            'attendance.my_requests'.tr(),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          myRequestsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Text(err.toString()),
            data: (requests) {
              if (requests.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'attendance.no_requests'.tr(),
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                );
              }
              return Column(
                children: requests.map((r) => _RequestCard(request: r)).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final OverrideRequestV2 request;
  const _RequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final (statusColor, statusLabel) = switch (request.status) {
      'pending' => (Colors.orange.shade700, 'attendance.status_pending'.tr()),
      'approved' => (Colors.green.shade700, 'attendance.status_approved'.tr()),
      'rejected' => (Colors.red.shade700, 'attendance.status_rejected'.tr()),
      _ => (Colors.grey.shade700, request.status),
    };

    final actionLabel = switch (request.requestedAction) {
      'CHECK_IN' => 'attendance.action_check_in'.tr(),
      'CHECK_OUT' => 'attendance.action_check_out'.tr(),
      'BREAK_START' => 'attendance.action_break_start'.tr(),
      'BREAK_END' => 'attendance.action_break_end'.tr(),
      _ => request.requestedAction,
    };

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    actionLabel,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              formatUtcStringToRome(request.requestedAt,
                  format: 'dd/MM/yyyy HH:mm'),
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 6),
            Text(request.reason, style: const TextStyle(fontSize: 13)),
            if (request.reviewNotes != null) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${'attendance.review_notes_label'.tr()}: ${request.reviewNotes}',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
