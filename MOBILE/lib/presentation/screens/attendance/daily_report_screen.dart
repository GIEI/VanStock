import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/errors/result.dart';
import '../../../data/models/report_and_supplier_models.dart';
import '../../providers/report_providers.dart';

class DailyReportScreen extends ConsumerStatefulWidget {
  const DailyReportScreen({super.key});

  @override
  ConsumerState<DailyReportScreen> createState() => _DailyReportScreenState();
}

class _DailyReportScreenState extends ConsumerState<DailyReportScreen> {
  DateTime selectedDate = DateTime.now();
  final notesController = TextEditingController();
  bool submitting = false;

  @override
  void dispose() {
    notesController.dispose();
    super.dispose();
  }

  String get _dateStr {
    final y = selectedDate.year.toString().padLeft(4, '0');
    final m = selectedDate.month.toString().padLeft(2, '0');
    final d = selectedDate.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime(now.year - 1),
      lastDate: now,
    );
    if (picked != null) setState(() => selectedDate = picked);
  }

  Future<void> _submit() async {
    setState(() => submitting = true);
    final dto = CreateReportDto(
      reportDate: _dateStr,
      notes: notesController.text.trim().isEmpty ? null : notesController.text.trim(),
    );
    final result = await ref.read(reportRepositoryProvider).createReport(dto);
    if (!mounted) return;
    setState(() => submitting = false);

    if (result is Success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('attendance.daily_report_success'.tr())),
      );
      Navigator.of(context).pop();
    } else if (result is Failure) {
      final f = (result as Failure).failure;
      final String msg = f?.message?.toString() ?? f.toString();
      final isDup = msg.toLowerCase().contains('already') || msg.contains('già');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isDup
            ? 'attendance.daily_report_already_exists'.tr()
            : msg)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('attendance.daily_report_title'.tr())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('attendance.daily_report_date'.tr(),
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                InkWell(
                  onTap: submitting ? null : _pickDate,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    child: Text(_dateStr),
                  ),
                ),
                const SizedBox(height: 20),
                Text('attendance.daily_report_notes'.tr(),
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  enabled: !submitting,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: submitting ? null : _submit,
                  icon: submitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send),
                  label: Text('attendance.daily_report_submit'.tr()),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
