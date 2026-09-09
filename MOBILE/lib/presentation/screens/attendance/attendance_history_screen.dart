import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/utils/date_time_utils.dart';
import '../../../data/models/attendance_v2_models.dart';
import '../../providers/attendance_v2_providers.dart';

class AttendanceHistoryScreen extends ConsumerStatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  ConsumerState<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState
    extends ConsumerState<AttendanceHistoryScreen> {
  late int _month;
  late int _year;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = now.month;
    _year = now.year;
  }

  void _changeMonth(int delta) {
    setState(() {
      var newMonth = _month + delta;
      var newYear = _year;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      } else if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
      _month = newMonth;
      _year = newYear;
    });
  }

  String _monthLabel() {
    return '${'attendance.month_$_month'.tr()} $_year';
  }

  @override
  Widget build(BuildContext context) {
    final daysAsync =
        ref.watch(myDaysProvider((month: _month, year: _year)));

    return Scaffold(
      appBar: AppBar(title: Text('attendance.history_title'.tr())),
      body: Column(
        children: [
          _MonthSelector(
            label: _monthLabel(),
            onPrev: () => _changeMonth(-1),
            onNext: () => _changeMonth(1),
          ),
          Expanded(
            child: daysAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(child: Text(err.toString())),
              data: (days) {
                if (days.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'attendance.no_history'.tr(),
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: days.length,
                  itemBuilder: (context, i) => _DayCard(day: days[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MonthSelector extends StatelessWidget {
  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  const _MonthSelector({
    required this.label,
    required this.onPrev,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      child: Row(
        children: [
          IconButton(onPressed: onPrev, icon: const Icon(Icons.chevron_left)),
          Expanded(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ),
          IconButton(onPressed: onNext, icon: const Icon(Icons.chevron_right)),
        ],
      ),
    );
  }
}

class _DayCard extends ConsumerWidget {
  final AttendanceDay day;
  const _DayCard({required this.day});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (statusColor, statusLabel) = switch (day.status) {
      'closed' => (Colors.green.shade700, 'attendance.day_closed'.tr()),
      'open' => (Colors.blue.shade700, 'attendance.day_open'.tr()),
      'anomalous' => (Colors.red.shade700, 'attendance.day_anomalous'.tr()),
      _ => (Colors.grey.shade700, day.status),
    };

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ExpansionTile(
        leading: Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: statusColor,
            shape: BoxShape.circle,
          ),
        ),
        title: Text(
          formatUtcStringToRome(day.date, format: 'EEE dd/MM/yyyy'),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          'attendance.day_summary'.tr(args: [
            _formatMin(day.workedMinutes),
            _formatMin(day.breakMinutes),
            statusLabel,
          ]),
        ),
        trailing: day.anomaliesCount > 0
            ? Chip(
                label: Text('${day.anomaliesCount}'),
                backgroundColor: Colors.red.shade100,
                visualDensity: VisualDensity.compact,
                avatar: Icon(Icons.warning_amber, color: Colors.red.shade700, size: 16),
              )
            : null,
        children: [_DayEventsList(date: day.date)],
      ),
    );
  }

  String _formatMin(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h${m.toString().padLeft(2, '0')}';
  }
}

class _DayEventsList extends ConsumerWidget {
  final String date;
  const _DayEventsList({required this.date});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Compute date range covering the entire day
    final dt = DateTime.tryParse(date);
    if (dt == null) return const SizedBox.shrink();
    final from = DateTime(dt.year, dt.month, dt.day).toUtc().toIso8601String();
    final to = DateTime(dt.year, dt.month, dt.day, 23, 59, 59)
        .toUtc()
        .toIso8601String();

    final eventsAsync =
        ref.watch(myEventsProvider((from: from, to: to)));

    return eventsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
      error: (err, _) => Padding(
        padding: const EdgeInsets.all(16),
        child: Text(err.toString(), style: const TextStyle(color: Colors.red)),
      ),
      data: (events) {
        if (events.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text('attendance.no_events_today'.tr()),
          );
        }
        // Show events in chronological order (events come desc)
        final ordered = events.reversed.toList();
        return Column(
          children: ordered.map((e) => _EventTile(event: e)).toList(),
        );
      },
    );
  }
}

class _EventTile extends StatelessWidget {
  final AttendanceEvent event;
  const _EventTile({required this.event});

  @override
  Widget build(BuildContext context) {
    final time = formatUtcStringToRome(event.occurredAt, format: 'HH:mm');
    final (icon, color, label) = switch (event.action) {
      AttendanceAction.CHECK_IN => (
          Icons.login,
          Colors.green.shade600,
          'attendance.action_check_in'.tr(),
        ),
      AttendanceAction.CHECK_OUT => (
          Icons.logout,
          Colors.red.shade600,
          'attendance.action_check_out'.tr(),
        ),
      AttendanceAction.BREAK_START => (
          Icons.coffee_outlined,
          Colors.orange.shade700,
          'attendance.action_break_start'.tr(),
        ),
      AttendanceAction.BREAK_END => (
          Icons.play_arrow_rounded,
          Colors.blue.shade600,
          'attendance.action_break_end'.tr(),
        ),
    };

    final isAnomaly = event.anomalyType != null ||
        event.resultingState == 'PENDING_REVIEW';
    final isManual = event.source == 'admin';

    return ListTile(
      dense: true,
      leading: Icon(icon, color: color),
      title: Row(
        children: [
          Text(time, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Text(label),
          if (isManual) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.purple.shade100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'M',
                style: TextStyle(
                  color: Colors.purple.shade900,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
      subtitle: isAnomaly
          ? Text(
              event.anomalyType ?? 'PENDING_REVIEW',
              style: TextStyle(color: Colors.red.shade700, fontSize: 11),
            )
          : null,
    );
  }
}
