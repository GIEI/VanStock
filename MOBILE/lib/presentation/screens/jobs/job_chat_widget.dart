import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import '../../../core/utils/date_time_utils.dart';
import '../../providers/auth_providers.dart';
import '../../providers/job_providers.dart';

class JobChatWidget extends ConsumerStatefulWidget {
  final int jobId;

  const JobChatWidget({
    required this.jobId,
    super.key,
  });

  @override
  ConsumerState<JobChatWidget> createState() => _JobChatWidgetState();
}

class _JobChatWidgetState extends ConsumerState<JobChatWidget> with WidgetsBindingObserver {
  late TextEditingController _messageController;
  bool _sending = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    WidgetsBinding.instance.addObserver(this);
    _startPolling();
  }

  void _startPolling() {
    _refreshTimer?.cancel();
    // Polling messaggi ogni 15s. Si ferma quando l'app va in background.
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      ref.invalidate(jobMessagesProvider(widget.jobId));
    });
  }

  void _stopPolling() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _startPolling();
    } else {
      _stopPolling();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopPolling();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(jobMessagesProvider(widget.jobId));
    final currentUserAsync = ref.watch(currentUserProvider);

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text('jobs.chat_title'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                ref.invalidate(jobMessagesProvider(widget.jobId));
              },
            ),
          ],
        ),
        Expanded(
          child: messagesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, st) {
              print('❌ Error loading messages: $err');
              print('Stack trace: $st');
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('${'common.error'.tr()}: $err'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(jobMessagesProvider(widget.jobId)),
                      child: Text('common.retry'.tr()),
                    ),
                  ],
                ),
              );
            },
            data: (messages) {
              return currentUserAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, _) => const SizedBox.shrink(),
                data: (user) {
                  return messages.isEmpty
                      ? Center(
                          child: Text(
                            'jobs.no_messages'.tr(),
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                        )
                      : ListView.builder(
                          reverse: true,
                          itemCount: messages.length,
                          itemBuilder: (context, index) {
                            final message = messages[messages.length - 1 - index];
                            final isMe = user?.id == message.senderId;
                            return _ChatMessageBubble(
                              message: message,
                              isMe: isMe,
                            );
                          },
                        );
                },
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        _ChatInputBar(
          controller: _messageController,
          sending: _sending,
          onSend: () async {
            final content = _messageController.text.trim();
            if (content.isEmpty) return;

            setState(() => _sending = true);
            try {
              await ref.read(sendMessageProvider((widget.jobId, content)).future);
              _messageController.clear();
              ref.invalidate(jobMessagesProvider(widget.jobId));
            } finally {
              setState(() => _sending = false);
            }
          },
        ),
      ],
    );
  }
}

class _ChatMessageBubble extends StatelessWidget {
  final dynamic message;
  final bool isMe;

  const _ChatMessageBubble({
    required this.message,
    required this.isMe,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isMe
              ? Colors.blue[100]
              : Colors.grey[300],
          borderRadius: BorderRadius.circular(12),
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe && message.senderName != null)
              Text(
                message.senderName ?? '',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Colors.blue[700],
                  fontWeight: FontWeight.bold,
                ),
              ),
            if (message.type == 'text' && message.content != null)
              Text(
                message.content,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            if (message.type == 'audio')
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.mic, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    'jobs.voice_message'.tr(),
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            const SizedBox(height: 4),
            Text(
              formatUtcStringToRome(message.createdAt?.toString(), format: 'dd/MM/yyyy HH:mm'),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatInputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  const _ChatInputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (context, value, child) {
          final isEmpty = value.text.trim().isEmpty;
          return Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  enabled: !sending,
                  maxLines: 3,
                  minLines: 1,
                  decoration: InputDecoration(
                    hintText: 'jobs.message_hint'.tr(),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: sending || isEmpty ? null : onSend,
                icon: sending
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          );
        },
      ),
    );
  }
}
