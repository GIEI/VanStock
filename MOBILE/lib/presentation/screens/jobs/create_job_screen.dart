import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../data/models/job_models.dart';
import '../../providers/job_providers.dart';

class CreateJobScreen extends ConsumerStatefulWidget {
  const CreateJobScreen({super.key});

  @override
  ConsumerState<CreateJobScreen> createState() => _CreateJobScreenState();
}

class _CreateJobScreenState extends ConsumerState<CreateJobScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _addressController;
  late final TextEditingController _dateController;
  late final TextEditingController _scheduledTimeCustomController;
  String _selectedPriority = 'normale';
  String _selectedScheduledTime = 'all_day';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descriptionController = TextEditingController();
    _addressController = TextEditingController();
    _dateController = TextEditingController();
    _scheduledTimeCustomController = TextEditingController();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _dateController.dispose();
    _scheduledTimeCustomController.dispose();
    super.dispose();
  }

  Future<void> _createJob() async {
    if (_titleController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('create_job.title_required'.tr())),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dto = CreateJobDto(
        title: _titleController.text,
        description: _descriptionController.text.isEmpty
            ? null
            : _descriptionController.text,
        address: _addressController.text.isEmpty ? null : _addressController.text,
        scheduledDate:
            _dateController.text.isEmpty ? null : _dateController.text,
        priority: _selectedPriority,
        scheduledTime: _selectedScheduledTime,
        scheduledTimeCustom: _selectedScheduledTime == 'custom' && _scheduledTimeCustomController.text.isNotEmpty
            ? _scheduledTimeCustomController.text
            : null,
      );

      final result =
          await ref.read(jobRepositoryProvider).createJob(dto);

      if (mounted) {
        result.whenSuccess((job) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('create_job.job_created'.tr())),
          );
          ref.invalidate(jobsListProvider);
          context.pop();
        });

        result.whenFailure((failure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${'common.error'.tr()}: $failure')),
          );
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('create_job.title'.tr()),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'create_job.title'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'create_job.title_label'.tr(),
                hintText: 'create_job.title_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'create_job.description_label'.tr(),
                hintText: 'create_job.description_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              maxLines: 3,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'create_job.address_label'.tr(),
                hintText: 'create_job.address_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _dateController,
              decoration: InputDecoration(
                labelText: 'create_job.scheduled_date_label'.tr(),
                hintText: 'create_job.scheduled_date_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 24),
            Text(
              'create_job.scheduled_date_label'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: DropdownButton<String>(
                value: _selectedPriority,
                isExpanded: true,
                underline: const SizedBox(),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                items: const ['normale', 'urgente', 'bassa']
                    .map(
                      (priority) => DropdownMenuItem(
                        value: priority,
                        child: Text(priority),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedPriority = value);
                  }
                },
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'create_job.custom_time_label'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: DropdownButton<String>(
                value: _selectedScheduledTime,
                isExpanded: true,
                underline: const SizedBox(),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                items: const ['all_day', 'morning', 'afternoon', 'custom']
                    .map(
                      (time) => DropdownMenuItem(
                        value: time,
                        child: Text(time),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedScheduledTime = value);
                  }
                },
              ),
            ),
            if (_selectedScheduledTime == 'custom') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _scheduledTimeCustomController,
                decoration: InputDecoration(
                  labelText: 'create_job.custom_time_label'.tr(),
                  hintText: 'create_job.custom_time_hint'.tr(),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                textInputAction: TextInputAction.done,
              ),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _createJob,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('create_job.create_button'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
