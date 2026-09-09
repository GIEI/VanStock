import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricService {
  static const _emailKey = 'biometric_email';
  static const _passwordKey = 'biometric_password';
  static const _enabledKey = 'biometric_enabled';

  final LocalAuthentication _auth;
  final FlutterSecureStorage _storage;
  final SharedPreferences _prefs;

  const BiometricService(this._auth, this._storage, this._prefs);

  Future<bool> isAvailable() async {
    try {
      return await _auth.canCheckBiometrics && await _auth.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  bool isEnabled() => _prefs.getBool(_enabledKey) ?? false;

  Future<void> enable(String email, String password) async {
    await _storage.write(key: _emailKey, value: email);
    await _storage.write(key: _passwordKey, value: password);
    await _prefs.setBool(_enabledKey, true);
  }

  Future<void> disable() async {
    await _storage.delete(key: _emailKey);
    await _storage.delete(key: _passwordKey);
    await _prefs.setBool(_enabledKey, false);
  }

  Future<({String email, String password})?> getCredentials() async {
    final email = await _storage.read(key: _emailKey);
    final password = await _storage.read(key: _passwordKey);
    if (email == null || password == null) return null;
    return (email: email, password: password);
  }

  Future<bool> authenticate(String localizedReason) async {
    try {
      return await _auth.authenticate(
        localizedReason: localizedReason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: false,
        ),
      );
    } on PlatformException catch (e) {
      print('[BIO] PlatformException: ${e.code} ${e.message}');
      return false;
    }
  }
}
