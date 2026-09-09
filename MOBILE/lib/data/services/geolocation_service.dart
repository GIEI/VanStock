import 'package:geolocator/geolocator.dart';
import 'package:logger/logger.dart';

class GeolocationService {
  final _logger = Logger();

  /// Request location permission from the user
  Future<bool> requestLocationPermission() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final result = await Geolocator.requestPermission();
        return result == LocationPermission.whileInUse || result == LocationPermission.always;
      }
      return permission == LocationPermission.whileInUse || permission == LocationPermission.always;
    } catch (e) {
      _logger.e('Error requesting location permission: $e');
      return false;
    }
  }

  /// Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (e) {
      _logger.e('Error checking location service: $e');
      return false;
    }
  }

  /// Get current location
  /// Returns a map with latitude, longitude, and address
  Future<Map<String, dynamic>?> getCurrentLocation() async {
    try {
      // Check if location service is enabled
      final isEnabled = await isLocationServiceEnabled();
      if (!isEnabled) {
        _logger.w('Location service is not enabled');
        return null;
      }

      // Check and request permission if needed
      final hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        _logger.w('Location permission not granted');
        return null;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      return {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'timestamp': position.timestamp.toIso8601String(),
      };
    } catch (e) {
      _logger.e('Error in getCurrentLocation: $e');
      return null;
    }
  }

  /// Get location with timeout
  Future<Map<String, dynamic>?> getLocationWithTimeout({Duration timeout = const Duration(seconds: 15)}) async {
    try {
      return await getCurrentLocation().timeout(
        timeout,
        onTimeout: () {
          _logger.w('Location request timed out');
          return null;
        },
      );
    } catch (e) {
      _logger.e('Error in getLocationWithTimeout: $e');
      return null;
    }
  }
}
