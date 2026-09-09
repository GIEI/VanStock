import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/auth_models.dart';
import 'auth_providers.dart';
import 'core_providers.dart';

export 'core_providers.dart'
    show
        unauthenticatedStreamProvider,
        biometricServiceProvider,
        biometricAvailableProvider,
        biometricEnabledProvider;

sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class Authenticated extends AuthState {
  final AuthUser user;
  const Authenticated(this.user);
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    final sub = ref
        .watch(unauthenticatedStreamProvider)
        .stream
        .listen((_) => logout());
    ref.onDispose(sub.cancel);
    final featureSub = ref
        .watch(featureDisabledStreamProvider)
        .stream
        .listen((_) => _loadCurrentUser());
    ref.onDispose(featureSub.cancel);

    state = const AuthInitial();
    _loadCurrentUser();
    return state;
  }

  /// Returns true on success (token saved, state NOT yet Authenticated).
  /// Caller must invoke [completeLogin] to finalize.
  Future<bool> login(String email, String password) async {
    state = const AuthLoading();
    final result = await ref
        .read(authRepositoryProvider)
        .login(LoginRequest(email: email, password: password));

    final response = result.getOrNull();
    if (response != null) {
      await ref.read(dioClientProvider).updateAuthToken(response.token);
      _pendingUser = response.user;
      return true;
    } else {
      result.whenFailure((failure) {
        state = AuthError(failure.toString());
      });
      return false;
    }
  }

  AuthUser? _pendingUser;

  void completeLogin() {
    final user = _pendingUser;
    if (user != null) {
      _pendingUser = null;
      state = Authenticated(user);
    }
  }

  Future<void> biometricLogin(String localizedReason) async {
    final biometric = ref.read(biometricServiceProvider);
    print('[BIO] isEnabled=${biometric.isEnabled()}');
    final available = await biometric.isAvailable();
    print('[BIO] isAvailable=$available');
    final ok = await biometric.authenticate(localizedReason);
    print('[BIO] authenticate=$ok');
    if (!ok) return;
    final creds = await biometric.getCredentials();
    print('[BIO] creds=${creds != null ? 'ok' : 'null'}');
    if (creds == null) return;
    final success = await login(creds.email, creds.password);
    print('[BIO] loginSuccess=$success');
    if (success) completeLogin();
  }

  Future<void> logout() async {
    state = const AuthLoading();
    await ref.read(dioClientProvider).clearAuthToken();
    state = const AuthInitial();
  }

  Future<void> _loadCurrentUser() async {
    final result = await ref.read(authRepositoryProvider).me();

    result.whenSuccess((user) {
      state = Authenticated(user);
    });

    result.whenFailure((_) {
      // If token is invalid or expired, user stays in AuthInitial
      state = const AuthInitial();
    });
  }
}

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authNotifierProvider) is Authenticated;
});

final currentUserProvider = Provider<AuthUser?>((ref) {
  final state = ref.watch(authNotifierProvider);
  return switch (state) {
    Authenticated(:final user) => user,
    _ => null,
  };
});
