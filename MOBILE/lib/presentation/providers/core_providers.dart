import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/network/dio_client.dart';
import '../../core/services/biometric_service.dart';

/// Provider for SharedPreferences instance (overridden in main.dart)
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in main.dart',
  );
});

/// Fired by AuthInterceptor whenever the server returns 401.
/// AuthNotifier listens to this stream and triggers logout.
final unauthenticatedStreamProvider = Provider<StreamController<void>>((ref) {
  final controller = StreamController<void>.broadcast();
  ref.onDispose(controller.close);
  return controller;
});

final featureDisabledStreamProvider = Provider<StreamController<void>>((ref) {
  final controller = StreamController<void>.broadcast();
  ref.onDispose(controller.close);
  return controller;
});

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService(
    LocalAuthentication(),
    const FlutterSecureStorage(),
    ref.watch(sharedPreferencesProvider),
  );
});

final biometricAvailableProvider = FutureProvider<bool>((ref) {
  return ref.watch(biometricServiceProvider).isAvailable();
});

final biometricEnabledProvider = Provider<bool>((ref) {
  return ref.watch(biometricServiceProvider).isEnabled();
});

/// Provider globale per DioClient (Singleton)
final dioClientProvider = Provider<DioClient>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  final stream = ref.watch(unauthenticatedStreamProvider);
  final featureStream = ref.watch(featureDisabledStreamProvider);
  return DioClient(
    prefs,
    onUnauthenticated: () => stream.add(null),
    onFeatureDisabled: () => featureStream.add(null),
  );
});
