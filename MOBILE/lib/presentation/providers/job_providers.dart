import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/job_datasource.dart';
import '../../data/repositories/job_repository.dart';
import '../../data/models/job_models.dart';
import '../../data/models/common_models.dart';
import '../../data/services/firebase_messaging_service.dart';
import 'core_providers.dart';
import 'auth_providers.dart';
import '../router/app_router.dart';

final jobRemoteDatasourceProvider = Provider((ref) {
  return JobRemoteDatasource(ref.watch(dioClientProvider));
});

final jobRepositoryProvider = Provider((ref) {
  return JobRepository(ref.watch(jobRemoteDatasourceProvider));
});

final firebaseMessagingServiceProvider = FutureProvider((ref) async {
  final router = ref.watch(routerProvider);
  final service = FirebaseMessagingService();
  await service.initialize(ref.watch(dioClientProvider), router);
  return service;
});

// Register FCM token to backend after user authenticates
final fcmTokenRegistrationProvider = FutureProvider((ref) async {
  // Wait for Firebase Messaging to initialize
  await ref.watch(firebaseMessagingServiceProvider.future);
  // Wait for user to authenticate
  final user = await ref.watch(currentUserProvider.future);
  if (user != null) {
    // User is authenticated, get the token and register it
    final service = FirebaseMessagingService();
    final token = await service.getToken();
    if (token != null) {
      // Try to register the token now that user is authenticated
      await ref.watch(dioClientProvider).post(
        '/push/fcm-token',
        data: {'token': token},
      );
    }
  }
  return null;
});

final jobsListProvider = FutureProvider<PagedResponse<Job>>((ref) async {
  final result = await ref.watch(jobRepositoryProvider).getJobs();
  return result.getOrNull() ??
      (throw Exception('Failed to load jobs'));
});

final jobDetailProvider = FutureProvider.family<Job, int>((ref, jobId) async {
  final result = await ref.watch(jobRepositoryProvider).getJob(jobId);
  return result.getOrNull() ??
      (throw Exception('Failed to load job'));
});

final jobMessagesProvider = FutureProvider.family<List<JobMessage>, int>((ref, jobId) async {
  final result = await ref.watch(jobRepositoryProvider).getMessages(jobId);
  return result.getOrNull() ?? [];
});

final sendMessageProvider = FutureProvider.family<JobMessage, (int, String)>((ref, args) async {
  final (jobId, content) = args;
  final dto = SendMessageDto(content: content);
  final result = await ref.watch(jobRepositoryProvider).sendMessage(jobId, dto);
  return result.getOrNull() ?? (throw Exception('Failed to send message'));
});
