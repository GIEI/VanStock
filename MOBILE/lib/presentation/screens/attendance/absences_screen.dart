import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/attendance_v2_providers.dart';
import '../../../data/models/attendance_v2_models.dart';

class AbsencesScreen extends ConsumerStatefulWidget {
  const AbsencesScreen({super.key});

  @override
  ConsumerState<AbsencesScreen> createState() => _AbsencesScreenState();
}

class _AbsencesScreenState extends ConsumerState<AbsencesScreen> {
  DateTime _date = DateTime.now();
  String? _reason;
  final _notesController = TextEditingController();

  static const _reasons = ['vacation', 'sick_leave', 'personal', 'other'];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  void _submit() {
    final dateStr =
        '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
    ref.read(absenceNotifierProvider.notifier).submit(
          absenceDate: dateStr,
          reason: _reason,
          notes: _notesController.text.trim().isEmpty
              ? null
              : _notesController.text.trim(),
        );
  }

  String _reasonLabel(String r) => switch (r) {
        'vacation' => 'attendance.absence_type_vacation'.tr(),
        'sick_leave' => 'attendance.absence_type_sick'.tr(),
        'personal' => 'attendance.absence_type_personal'.tr(),
        _ => 'attendance.absence_type_other'.tr(),
      };

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(absenceNotifierProvider);
    final absencesAsync = ref.watch(myAbsencesProvider);

    ref.listen(absenceNotifierProvider, (_, next) {
      if (next is AbsenceSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('attendance.absence_submitted'.tr()),
          backgroundColor: Colors.green,
        ));
        setState(() {
          _date = DateTime.now();
          _reason = null;
        });
        _notesController.clear();
        ref.read(absenceNotifierProvider.notifier).reset();
      } else if (next is AbsenceError) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(next.message),
          backgroundColor: Colors.red,
        ));
      }
    });

    return Scaffold(
      appBar: AppBar(title: Text('attendance.absences_title'.tr())),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'attendance.add_absence'.tr(),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today),
            label: Text(
              '${_date.day.toString().padLeft(2, '0')}/'
              '${_date.month.toString().padLeft(2, '0')}/'
              '${_date.year}',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String?>(
            initialValue: _reason,
            decoration: InputDecoration(
              labelText: 'attendance.absence_reason_label'.tr(),
              border: const OutlineInputBorder(),
            ),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text('attendance.absence_type_other'.tr()),
              ),
              ..._reasons.map((r) => DropdownMenuItem(
                    value: r,
                    child: Text(_reasonLabel(r)),
                  )),
            ],
            onChanged: (v) => setState(() => _reason = v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesController,
            decoration: InputDecoration(
              labelText: 'attendance.absence_notes_label'.tr(),
              hintText: 'attendance.absence_notes_hint'.tr(),
              border: const OutlineInputBorder(),
            ),
            minLines: 2,
            maxLines: 4,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: submitState is AbsenceSubmitting ? null : _submit,
            icon: submitState is AbsenceSubmitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            label: Text('common.submit'.tr()),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 12),
          Text(
            'attendance.absences_title'.tr(),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          absencesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Text(err.toString()),
            data: (absences) {
              if (absences.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'attendance.no_absences'.tr(),
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                );
              }
              return Column(
                children: absences.map((a) => _AbsenceCard(absence: a, reasonLabel: _reasonLabel)).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AbsenceCard extends StatelessWidget {
  final UserAbsence absence;
  final String Function(String) reasonLabel;

  const _AbsenceCard({required this.absence, required this.reasonLabel});

  @override
  Widget build(BuildContext context) {
    final datePart = absence.absenceDate.split('T').first;
    final parts = datePart.split('-');
    final dateStr = parts.length == 3
        ? '${parts[2]}/${parts[1]}/${parts[0]}'
        : datePart;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.event_busy, size: 18),
                const SizedBox(width: 8),
                Text(
                  dateStr,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (absence.reason != null) ...[
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      reasonLabel(absence.reason!),
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (absence.notes != null && absence.notes!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(absence.notes!, style: const TextStyle(fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }
}
