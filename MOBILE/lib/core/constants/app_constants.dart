import '../config/app_config.dart';

class AppConstants {
  AppConstants._();

  // App Info
  static const String appName = 'VanStock';
  static const String appVersion = '1.0.0';

  // API Configuration
  // L'indirizzo del backend si cambia in lib/core/config/app_config.dart.
  static const String baseUrl = AppConfig.backendBaseUrl;
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user';
  static const String companyIdKey = 'company_id';

  // Pagination
  static const int pageSize = 20;

  // Error Messages
  static const String networkError = 'Network error. Please check your connection.';
  static const String serverError = 'Server error. Please try again later.';
  static const String unauthorizedError = 'Unauthorized. Please login again.';
  static const String unknownError = 'Unknown error occurred.';
}
