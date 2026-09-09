import 'package:riverpod/riverpod.dart';
import 'core_providers.dart';

const _kCurrencyKey = 'selected_currency';

const supportedCurrencies = [
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'RUB',
  'CNY',
];

class CurrencyNotifier extends Notifier<String> {
  @override
  String build() {
    final prefs = ref.read(sharedPreferencesProvider);
    return prefs.getString(_kCurrencyKey) ?? 'EUR';
  }

  Future<void> setCurrency(String currency) async {
    if (!supportedCurrencies.contains(currency)) {
      throw ArgumentError('Unsupported currency: $currency');
    }
    await ref.read(sharedPreferencesProvider).setString(_kCurrencyKey, currency);
    state = currency;
  }
}

final currencyProvider = NotifierProvider<CurrencyNotifier, String>(
  CurrencyNotifier.new,
);
