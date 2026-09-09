import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:logger/logger.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/dio_client.dart';

final logger = Logger();

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  logger.i('Handling background message: ${message.messageId}');
}

class FirebaseMessagingService {
  static final FirebaseMessagingService _instance =
      FirebaseMessagingService._internal();

  factory FirebaseMessagingService() {
    return _instance;
  }

  FirebaseMessagingService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  DioClient? _dioClient;
  GoRouter? _router;
  String? _pendingJobRoute;
  bool _navigationReady = false;

  bool _initialized = false;
  StreamSubscription<RemoteMessage>? _onMessageSub;
  StreamSubscription<RemoteMessage>? _onMessageOpenedSub;
  StreamSubscription<String>? _onTokenRefreshSub;

  Future<void> initialize(DioClient? dioClient, [GoRouter? router]) async {
    _dioClient = dioClient;
    _router = router;
    // Idempotent: avoid stacking listeners if initialize is called twice.
    if (_initialized) {
      logger.i('Firebase Messaging already initialized — skipping');
      return;
    }
    try {
      // Setup local notifications for foreground messages
      const AndroidInitializationSettings androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const DarwinInitializationSettings iosSettings =
          DarwinInitializationSettings(
            requestSoundPermission: true,
            requestBadgePermission: true,
            requestAlertPermission: true,
          );
      await _localNotifications.initialize(
        const InitializationSettings(
          android: androidSettings,
          iOS: iosSettings,
        ),
        onDidReceiveNotificationResponse: (response) {
          _openJobRoute(_jobRouteFromPayload(response.payload));
        },
      );

      // A local notification can launch a terminated app without invoking the
      // response callback above. Read its launch payload explicitly.
      final launchDetails = await _localNotifications
          .getNotificationAppLaunchDetails();
      if (launchDetails?.didNotificationLaunchApp ?? false) {
        _openJobRoute(
          _jobRouteFromPayload(launchDetails?.notificationResponse?.payload),
        );
      }

      // Richiedi permessi (iOS 13+)
      await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      // Handler per i messaggi in background
      FirebaseMessaging.onBackgroundMessage(
        _firebaseMessagingBackgroundHandler,
      );

      // Handler per i messaggi in foreground
      _onMessageSub = FirebaseMessaging.onMessage.listen((
        RemoteMessage message,
      ) {
        logger.i(
          'Message received in foreground: ${message.notification?.title}',
        );
        _handleForegroundMessage(message);
      });

      // Handler per quando l'app viene aperta da una notifica
      _onMessageOpenedSub = FirebaseMessaging.onMessageOpenedApp.listen((
        RemoteMessage message,
      ) {
        logger.i(
          'App opened from notification: ${message.notification?.title}',
        );
        _handleMessageOpenedApp(message);
      });

      // Ottieni il token FCM
      final token = await _firebaseMessaging.getToken();
      logger.i('FCM Token: $token');
      if (token != null && _dioClient != null) {
        await _registerTokenToBackend(token);
      }

      // Listen per i cambiamenti del token
      _onTokenRefreshSub = FirebaseMessaging.instance.onTokenRefresh.listen((
        newToken,
      ) {
        logger.i('Token refreshed: $newToken');
        if (_dioClient != null) {
          _registerTokenToBackend(newToken);
        }
      });

      // Controlla se l'app è stata aperta da una notifica
      final initialMessage = await _firebaseMessaging.getInitialMessage();
      if (initialMessage != null) {
        _handleMessageOpenedApp(initialMessage);
      }

      _initialized = true;
      logger.i('Firebase Messaging initialized successfully');
    } catch (e) {
      logger.e('Error initializing Firebase Messaging: $e');
    }
  }

  Future<void> dispose() async {
    await _onMessageSub?.cancel();
    await _onMessageOpenedSub?.cancel();
    await _onTokenRefreshSub?.cancel();
    _onMessageSub = null;
    _onMessageOpenedSub = null;
    _onTokenRefreshSub = null;
    _initialized = false;
  }

  void _handleForegroundMessage(RemoteMessage message) {
    logger.i('Handling foreground message: ${message.data}');
    _showLocalNotification(message);
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    try {
      final title = message.notification?.title ?? 'Notifica';
      final body = message.notification?.body ?? '';
      logger.i('Showing local notification: $title - $body');
      await _localNotifications.show(
        message.hashCode,
        title,
        body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'stocksimple_jobs',
            'Notifiche Lavori',
            channelDescription: 'Notifiche assegnazione lavori',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(
            sound: 'default',
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: _jobRouteFromMessage(message),
      );
      logger.i('Local notification shown successfully');
    } catch (e) {
      logger.e('Failed to show local notification: $e');
    }
  }

  void _handleMessageOpenedApp(RemoteMessage message) {
    logger.i('Handling opened message: ${message.data}');
    _openJobRoute(_jobRouteFromMessage(message));
  }

  /// Called by the app when authentication has been restored or cleared.
  /// On a cold start, FCM delivers the tap before the saved session is loaded;
  /// keep the target until navigation is safe instead of losing it to /login.
  void setNavigationReady(bool ready) {
    _navigationReady = ready;
    _flushPendingNavigation();
  }

  /// GoRouter is recreated when the authentication state changes. Keep the
  /// service pointed at the router currently mounted by the app.
  void updateRouter(GoRouter router) {
    _router = router;
    _flushPendingNavigation();
  }

  void _flushPendingNavigation() {
    if (!_navigationReady || _pendingJobRoute == null || _router == null) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_navigationReady || _pendingJobRoute == null || _router == null) {
        return;
      }
      final route = _pendingJobRoute!;
      _pendingJobRoute = null;
      _router!.go(route);
    });
  }

  void _openJobRoute(String? route) {
    if (route == null) return;
    _pendingJobRoute = route;
    _flushPendingNavigation();
  }

  String? _jobRouteFromMessage(RemoteMessage message) {
    return _jobRouteFromData(message.data);
  }

  String? _jobRouteFromPayload(String? payload) {
    if (payload == null || payload.isEmpty) return null;
    if (payload.startsWith('/jobs/')) return payload;
    return _jobRouteFromData({'jobId': payload});
  }

  String? _jobRouteFromData(Map<String, dynamic> data) {
    final url = data['url']?.toString();
    if (url != null && url.startsWith('/jobs/')) return url;
    final urlUri = url == null ? null : Uri.tryParse(url);
    if (urlUri != null && urlUri.path.startsWith('/jobs/')) {
      return '${urlUri.path}${urlUri.hasQuery ? '?${urlUri.query}' : ''}';
    }

    final jobId = data['jobId'] ?? data['job_id'];
    if (jobId == null) return null;
    final parsedJobId = int.tryParse(jobId.toString());
    if (parsedJobId == null) return null;

    final tab = data['tab']?.toString();
    return tab == null || tab.isEmpty
        ? '/jobs/$parsedJobId'
        : '/jobs/$parsedJobId?tab=${Uri.encodeQueryComponent(tab)}';
  }

  Future<String?> getToken() async {
    return await _firebaseMessaging.getToken();
  }

  Future<void> _registerTokenToBackend(String token) async {
    try {
      await _dioClient?.post('/push/fcm-token', data: {'token': token});
      logger.i('FCM token registered to backend: $token');
    } catch (e) {
      logger.e('Failed to register FCM token to backend: $e');
      // Token registration failed, likely due to 401 (not authenticated)
      // It will be retried when token refreshes or user logs in
    }
  }
}
