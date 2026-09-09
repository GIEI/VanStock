import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/constants/app_constants.dart';
import '../router/app_router.dart';
import '../providers/job_providers.dart';
import '../providers/permissions_provider.dart';
import '../providers/auth_state_provider.dart';
import '../../data/services/firebase_messaging_service.dart';

class VanStockApp extends ConsumerWidget {
  const VanStockApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final isAuthenticated = ref.watch(isAuthenticatedProvider);

    // Initialize Firebase Messaging when the app starts
    ref.watch(firebaseMessagingServiceProvider);

    // Register FCM token to backend after user authenticates
    ref.watch(fcmTokenRegistrationProvider);

    // A notification tap may launch the app before the saved login session is
    // restored. Release its pending job navigation only after authentication.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final messaging = FirebaseMessagingService();
      messaging.updateRouter(router);
      messaging.setNavigationReady(isAuthenticated);
    });

    // Request all permissions at startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(permissionsServiceProvider).requestAllPermissionsAtStartup();
    });

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
      ),
    );
  }
}
