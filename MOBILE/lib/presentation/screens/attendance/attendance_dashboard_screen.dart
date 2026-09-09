import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/attendance_v2_models.dart';
import '../../providers/attendance_v2_providers.dart';

class AttendanceDashboardScreen extends ConsumerWidget {
  const AttendanceDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(currentAttendanceStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('attendance.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'attendance.history_title'.tr(),
            onPressed: () => context.push('/attendance/history'),
          ),
          IconButton(
            icon: const Icon(Icons.assignment_late_outlined),
            tooltip: 'attendance.requests_title'.tr(),
            onPressed: () => context.push('/attendance/override-request'),
          ),
          IconButton(
            icon: const Icon(Icons.event_busy),
            tooltip: 'attendance.absences_title'.tr(),
            onPressed: () => context.push('/attendance/absences'),
          ),
          IconButton(
            icon: const Icon(Icons.assignment_outlined),
            tooltip: 'attendance.daily_report_title'.tr(),
            onPressed: () => context.push('/attendance/daily-report'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(currentAttendanceStateProvider.future),
        child: stateAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => _ErrorView(
            message: err.toString(),
            onRetry: () => ref.invalidate(currentAttendanceStateProvider),
          ),
          data: (state) {
            if (state == null) {
              return _ErrorView(
                message: 'attendance.error_loading_state'.tr(),
                onRetry: () =>
                    ref.invalidate(currentAttendanceStateProvider),
              );
            }
            return _DashboardBody(state: state);
          },
        ),
      ),
    );
  }
}

class _DashboardBody extends ConsumerWidget {
  final UserAttendanceState state;
  const _DashboardBody({required this.state});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (state.hasOpenAnomalies) const _AnomalyBanner(),
        _StatusCard(state: state),
        const SizedBox(height: 16),
        if (state.lastEvent != null) _LastEventChip(event: state.lastEvent!),
        const SizedBox(height: 16),
        _StatRow(state: state),
        const SizedBox(height: 24),
        _ActionButtons(state: state),
      ],
    );
  }
}

class _StatusCard extends StatelessWidget {
  final UserAttendanceState state;
  const _StatusCard({required this.state});

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = switch (state.state) {
      AttendanceState.IN => (
          Colors.green.shade600,
          Icons.check_circle_outline,
          'attendance.you_are_in'.tr(),
        ),
      AttendanceState.OUT => (
          Colors.grey.shade600,
          Icons.logout,
          'attendance.you_are_out'.tr(),
        ),
      AttendanceState.BREAK => (
          Colors.orange.shade700,
          Icons.coffee_outlined,
          'attendance.you_are_on_break'.tr(),
        ),
      AttendanceState.PENDING_REVIEW => (
          Colors.red.shade700,
          Icons.warning_amber,
          'attendance.state_pending_review'.tr(),
        ),
      AttendanceState.LOCKED => (
          Colors.purple.shade700,
          Icons.lock_outline,
          'attendance.state_locked'.tr(),
        ),
    };

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color, width: 2),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 48),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'attendance.current_state'.tr(),
                  style: TextStyle(color: color.withValues(alpha: 0.7)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LastEventChip extends StatelessWidget {
  final AttendanceEvent event;
  const _LastEventChip({required this.event});

  String _actionLabel() {
    return switch (event.action) {
      AttendanceAction.CHECK_IN => 'attendance.action_check_in'.tr(),
      AttendanceAction.CHECK_OUT => 'attendance.action_check_out'.tr(),
      AttendanceAction.BREAK_START => 'attendance.action_break_start'.tr(),
      AttendanceAction.BREAK_END => 'attendance.action_break_end'.tr(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final time = formatUtcStringToRome(event.occurredAt, format: 'dd/MM HH:mm');
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Icon(Icons.access_time, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'attendance.last_event_label'.tr(args: [_actionLabel(), time]),
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final UserAttendanceState state;
  const _StatRow({required this.state});

  String _format(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatTile(
            icon: Icons.work_outline,
            label: 'attendance.worked_today'.tr(),
            value: _format(state.workedMinutesToday),
            color: Colors.green.shade700,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatTile(
            icon: Icons.coffee,
            label: 'attendance.break_today'.tr(),
            value: _format(state.breakMinutesToday),
            color: Colors.orange.shade700,
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButtons extends StatelessWidget {
  final UserAttendanceState state;
  const _ActionButtons({required this.state});

  void _scan(BuildContext context, AttendanceAction intent) {
    context.push('/attendance/scan', extra: intent);
  }

  @override
  Widget build(BuildContext context) {
    final available = state.availableActions;

    if (available.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.shade300),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_amber, color: Colors.red.shade700),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'attendance.contact_admin'.tr(),
                style: TextStyle(color: Colors.red.shade900),
              ),
            ),
          ],
        ),
      );
    }

    // Single primary action (OUT or BREAK states)
    if (available.length == 1) {
      final action = available.first;
      return _BigActionButton(
        label: _actionLabel(action),
        icon: _actionIcon(action),
        color: _actionColor(action),
        onPressed: () => _scan(context, action),
      );
    }

    // Disambiguation: IN state → CHECK_OUT or BREAK_START
    return Row(
      children: available.map((action) {
        return Expanded(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: action == available.first ? 0 : 6,
            ),
            child: _BigActionButton(
              label: _actionLabel(action),
              icon: _actionIcon(action),
              color: _actionColor(action),
              onPressed: () => _scan(context, action),
            ),
          ),
        );
      }).toList(),
    );
  }

  String _actionLabel(AttendanceAction action) {
    return switch (action) {
      AttendanceAction.CHECK_IN => 'attendance.btn_enter'.tr(),
      AttendanceAction.CHECK_OUT => 'attendance.btn_exit'.tr(),
      AttendanceAction.BREAK_START => 'attendance.btn_break_start'.tr(),
      AttendanceAction.BREAK_END => 'attendance.btn_break_end'.tr(),
    };
  }

  IconData _actionIcon(AttendanceAction action) {
    return switch (action) {
      AttendanceAction.CHECK_IN => Icons.login,
      AttendanceAction.CHECK_OUT => Icons.logout,
      AttendanceAction.BREAK_START => Icons.coffee_outlined,
      AttendanceAction.BREAK_END => Icons.play_arrow_rounded,
    };
  }

  Color _actionColor(AttendanceAction action) {
    return switch (action) {
      AttendanceAction.CHECK_IN => Colors.green.shade600,
      AttendanceAction.CHECK_OUT => Colors.red.shade600,
      AttendanceAction.BREAK_START => Colors.orange.shade700,
      AttendanceAction.BREAK_END => Colors.blue.shade600,
    };
  }
}

class _BigActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _BigActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 2,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 36),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _AnomalyBanner extends StatelessWidget {
  const _AnomalyBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.red.shade300),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'attendance.anomaly_banner'.tr(),
              style: TextStyle(color: Colors.red.shade900, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Icon(Icons.error_outline, size: 64, color: Colors.grey.shade400),
        const SizedBox(height: 16),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: Text('common.retry'.tr()),
          ),
        ),
      ],
    );
  }
}
