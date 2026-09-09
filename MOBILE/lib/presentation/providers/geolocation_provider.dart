import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/geolocation_service.dart';

final geolocationServiceProvider = Provider((ref) {
  return GeolocationService();
});

/// Provider per ottenere la posizione corrente
final currentLocationProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final geolocationService = ref.watch(geolocationServiceProvider);
  return geolocationService.getCurrentLocation();
});

/// Provider per ottenere la posizione con timeout
final currentLocationWithTimeoutProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final geolocationService = ref.watch(geolocationServiceProvider);
  return geolocationService.getLocationWithTimeout();
});
