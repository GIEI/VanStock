import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_state_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/shell/shell_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/jobs/jobs_screen.dart';
import '../screens/jobs/job_detail_screen.dart';
import '../screens/jobs/create_job_screen.dart';
import '../screens/inventory/inventory_screen.dart';
import '../screens/inventory/product_detail_screen.dart';
import '../screens/inventory/create_product_screen.dart';
import '../screens/attendance/attendance_dashboard_screen.dart';
import '../screens/attendance/attendance_history_screen.dart';
import '../screens/attendance/override_request_screen.dart';
import '../screens/attendance/scan_qr_screen.dart';
import '../screens/attendance/absences_screen.dart';
import '../screens/attendance/daily_report_screen.dart';
import '../../data/models/attendance_v2_models.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final isAuthenticated = ref.watch(isAuthenticatedProvider);
  final user = ref.watch(currentUserProvider);
  final hasAttendance =
      user?.resources.contains('MOBILE_ROUTE_ATTENDANCE') ?? false;

  return GoRouter(
    initialLocation: '/dashboard',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      if (!isAuthenticated && state.matchedLocation != '/login') {
        return '/login';
      }
      if (isAuthenticated && state.matchedLocation == '/login') {
        return '/dashboard';
      }
      if (isAuthenticated &&
          state.uri.path.startsWith('/attendance') &&
          !hasAttendance) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/attendance/scan',
        builder: (context, state) {
          final intent =
              state.extra as AttendanceAction? ?? AttendanceAction.CHECK_IN;
          return ScanQrScreen(intent: intent);
        },
      ),
      GoRoute(
        path: '/attendance/history',
        builder: (context, state) => const AttendanceHistoryScreen(),
      ),
      GoRoute(
        path: '/attendance/override-request',
        builder: (context, state) => const OverrideRequestScreen(),
      ),
      GoRoute(
        path: '/attendance/absences',
        builder: (context, state) => const AbsencesScreen(),
      ),
      GoRoute(
        path: '/attendance/daily-report',
        builder: (context, state) => const DailyReportScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ShellScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/jobs',
                builder: (context, state) => const JobsScreen(),
                routes: [
                  GoRoute(
                    path: 'create',
                    builder: (context, state) => const CreateJobScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final jobId = int.parse(state.pathParameters['id']!);
                      return JobDetailScreen(jobId: jobId);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/inventory',
                builder: (context, state) => const InventoryScreen(),
                routes: [
                  GoRoute(
                    path: 'create',
                    builder: (context, state) => const CreateProductScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final productId = int.parse(state.pathParameters['id']!);
                      return ProductDetailScreen(productId: productId);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/attendance',
                builder: (context, state) => const AttendanceDashboardScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
