import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_state_provider.dart';
import '../providers/settings_provider.dart';

void showSettingsSheet(BuildContext context, WidgetRef ref) {
  showModalBottomSheet(
    context: context,
    builder: (context) => _SettingsSheet(ref: ref),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
  );
}

class _SettingsSheet extends ConsumerWidget {
  final WidgetRef ref;

  const _SettingsSheet({required this.ref});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedCurrency = ref.watch(currencyProvider);
    final biometricEnabled = ref.watch(biometricEnabledProvider);
    final biometricAvailable = ref.watch(biometricAvailableProvider).value ?? false;

    return SafeArea(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'settings.title'.tr(),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
            // Language option
            ListTile(
              leading: const Icon(Icons.language),
              title: Text('settings.language'.tr()),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.pop(context);
                _showLanguageSheet(context);
              },
            ),
            // Currency option
            ListTile(
              leading: const Icon(Icons.attach_money),
              title: Text('settings.currency'.tr()),
              trailing: Text(selectedCurrency),
              onTap: () {
                Navigator.pop(context);
                _showCurrencySheet(context, ref);
              },
            ),
            if (biometricAvailable && biometricEnabled)
              SwitchListTile(
                secondary: const Icon(Icons.fingerprint),
                title: Text('settings.biometric'.tr()),
                value: biometricEnabled,
                onChanged: (enabled) async {
                  if (!enabled) {
                    await ref.read(biometricServiceProvider).disable();
                    ref.invalidate(biometricEnabledProvider);
                  }
                },
              ),
            const Divider(),
            // Logout option
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: Text(
                'settings.logout'.tr(),
                style: const TextStyle(color: Colors.red),
              ),
              onTap: () {
                Navigator.pop(context);
                ref.read(authNotifierProvider.notifier).logout();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showLanguageSheet(BuildContext context) {
    final currentLocale = context.locale;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'settings.language'.tr(),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ),
              ...[
                ('it', 'languages.it'.tr()),
                ('en', 'languages.en'.tr()),
                ('es', 'languages.es'.tr()),
                ('fr', 'languages.fr'.tr()),
                ('ru', 'languages.ru'.tr()),
                ('ja', 'languages.ja'.tr()),
                ('zh', 'languages.zh'.tr()),
              ].map(
                (item) => RadioListTile<String>(
                  title: Text(item.$2),
                  value: item.$1,
                  groupValue: currentLocale.languageCode,
                  onChanged: (value) {
                    if (value != null) {
                      context.setLocale(Locale(value));
                      Navigator.pop(context);
                    }
                  },
                ),
              ),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
    );
  }

  void _showCurrencySheet(BuildContext context, WidgetRef ref) {
    final selectedCurrency = ref.read(currencyProvider);

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'settings.currency'.tr(),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
            ...[
              'EUR',
              'USD',
              'GBP',
              'JPY',
              'RUB',
              'CNY',
            ].map(
              (currency) => RadioListTile<String>(
                title: Text('currencies.$currency'.tr()),
                value: currency,
                groupValue: selectedCurrency,
                onChanged: (value) async {
                  if (value != null) {
                    await ref
                        .read(currencyProvider.notifier)
                        .setCurrency(value);
                    if (context.mounted) Navigator.pop(context);
                  }
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
    );
  }
}
