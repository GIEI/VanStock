/// Configurazione globale dell'app.
///
/// Il backend viene scelto in fase di build tramite `--dart-define`.
///
/// Inserisci l'URL COMPLETO: schema + host + porta + suffisso `/api`.
/// Esempi:
///   'http://192.168.1.112:3000/api'   // LAN / sviluppo
///   'https://api.miodominio.it/api'   // produzione (dominio + HTTPS)
class AppConfig {
  AppConfig._();

  /// Esempio: --dart-define=BACKEND_BASE_URL=https://app.example.com/api
  static const String backendBaseUrl = String.fromEnvironment(
    'BACKEND_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );
}
