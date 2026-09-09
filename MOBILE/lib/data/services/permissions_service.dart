import 'package:geolocator/geolocator.dart';
import 'package:logger/logger.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionsService {
  final _logger = Logger();

  /// Request all permissions at app startup (in sequence with delays)
  Future<void> requestAllPermissionsAtStartup() async {
    try {
      _logger.i('⏳ Requesting all permissions at startup (in sequence)');

      // Request permissions one by one with delays to avoid conflicts on Android
      _logger.i('📷 Requesting camera permission...');
      await requestCameraPermission();
      await Future.delayed(const Duration(milliseconds: 500));

      _logger.i('🎤 Requesting microphone permission...');
      await requestMicrophonePermission();
      await Future.delayed(const Duration(milliseconds: 500));

      _logger.i('🔔 Requesting notification permission...');
      await requestNotificationPermission();
      await Future.delayed(const Duration(milliseconds: 500));

      _logger.i('📍 Requesting location permission...');
      await requestLocationPermission();

      _logger.i('✅ All permission requests completed');
    } catch (e) {
      _logger.e('❌ Error requesting permissions: $e');
    }
  }

  /// Request camera permission
  Future<PermissionStatus> requestCameraPermission() async {
    try {
      final status = await Permission.camera.request();
      _logger.i('Camera permission: ${status.name.toUpperCase()}');
      return status;
    } catch (e) {
      _logger.e('❌ Error requesting camera permission: $e');
      return PermissionStatus.denied;
    }
  }

  /// Request microphone permission
  Future<PermissionStatus> requestMicrophonePermission() async {
    try {
      final status = await Permission.microphone.request();
      _logger.i('Microphone permission: ${status.name.toUpperCase()}');
      return status;
    } catch (e) {
      _logger.e('❌ Error requesting microphone permission: $e');
      return PermissionStatus.denied;
    }
  }

  /// Request notification permission
  Future<PermissionStatus> requestNotificationPermission() async {
    try {
      final status = await Permission.notification.request();
      _logger.i('Notification permission: ${status.name.toUpperCase()}');
      return status;
    } catch (e) {
      _logger.e('❌ Error requesting notification permission: $e');
      return PermissionStatus.denied;
    }
  }

  /// Request location permission
  Future<bool> requestLocationPermission() async {
    try {
      _logger.d('Requesting location permission');
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final result = await Geolocator.requestPermission();
        _logger.d('Location permission: ${result.toString()}');
        return result == LocationPermission.whileInUse || result == LocationPermission.always;
      }
      return permission == LocationPermission.whileInUse || permission == LocationPermission.always;
    } catch (e) {
      _logger.e('Error requesting location permission: $e');
      return false;
    }
  }

  /// Check if all critical permissions are granted
  Future<bool> areAllPermissionsGranted() async {
    try {
      final camera = await Permission.camera.isGranted;
      final microphone = await Permission.microphone.isGranted;
      final notification = await Permission.notification.isGranted;

      final location = await Geolocator.checkPermission();
      final locationGranted = location == LocationPermission.whileInUse || location == LocationPermission.always;

      return camera && microphone && notification && locationGranted;
    } catch (e) {
      _logger.e('Error checking permissions: $e');
      return false;
    }
  }
}
