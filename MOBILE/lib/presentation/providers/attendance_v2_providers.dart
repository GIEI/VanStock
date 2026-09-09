import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../data/datasources/remote/attendance_v2_datasource.dart';
import '../../data/repositories/attendance_v2_repository.dart';
import '../../data/models/attendance_v2_models.dart';
import '../../core/errors/result.dart';
import 'auth_state_provider.dart';
import 'core_providers.dart';

const _uuid = Uuid();

String generateRequestId() => _uuid.v4();

final attendanceV2DatasourceProvider = Provider((ref) {
  return AttendanceV2RemoteDatasource(ref.watch(dioClientProvider));
});

final attendanceV2RepositoryProvider = Provider((ref) {
  return AttendanceV2Repository(ref.watch(attendanceV2DatasourceProvider));
});

// Current state of the user (auto-refreshes after a successful scan).
final currentAttendanceStateProvider =
    FutureProvider<UserAttendanceState?>((ref) async {
  final result =
      await ref.watch(attendanceV2RepositoryProvider).getCurrentState();
  return result.getOrNull();
});

// Events for a date range.
final myEventsProvider = FutureProvider.family
    .autoDispose<List<AttendanceEvent>, ({String? from, String? to})>(
        (ref, params) async {
  final result = await ref.watch(attendanceV2RepositoryProvider).getEvents(
        dateFrom: params.from,
        dateTo: params.to,
      );
  return result.getOrNull() ?? [];
});

// Daily aggregates for a given month/year.
final myDaysProvider = FutureProvider.family
    .autoDispose<List<AttendanceDay>, ({int month, int year})>(
        (ref, params) async {
  final result = await ref.watch(attendanceV2RepositoryProvider).getDays(
        month: params.month,
        year: params.year,
      );
  return result.getOrNull() ?? [];
});

// User's own override requests.
final myOverrideRequestsProvider =
    FutureProvider.autoDispose<List<OverrideRequestV2>>((ref) async {
  final result =
      await ref.watch(attendanceV2RepositoryProvider).getMyOverrideRequests();
  return result.getOrNull() ?? [];
});

// ── Scanner Notifier ────────────────────────────────────────────────────────

sealed class ScanState {
  const ScanState();
}

class ScanIdle extends ScanState {
  const ScanIdle();
}

class ScanProcessing extends ScanState {
  const ScanProcessing();
}

class ScanSuccess extends ScanState {
  final ScanResponse response;
  const ScanSuccess(this.response);
}

class ScanError extends ScanState {
  final String message;
  const ScanError(this.message);
}

class AttendanceScannerNotifier extends Notifier<ScanState> {
  @override
  ScanState build() => const ScanIdle();

  Future<void> scanQr({
    required String token,
    required AttendanceAction intent,
    String? deviceId,
    double? gpsLat,
    double? gpsLng,
  }) async {
    state = const ScanProcessing();
    final body = ScanRequestBody(
      token: token,
      intent: intent.apiName,
      requestId: generateRequestId(),
      deviceId: deviceId,
      gpsLat: gpsLat,
      gpsLng: gpsLng,
    );
    final result = await ref.read(attendanceV2RepositoryProvider).scanQr(body);
    switch (result) {
      case Success(:final data):
        state = ScanSuccess(data);
        // Refresh state provider so dashboard updates immediately
        ref.invalidate(currentAttendanceStateProvider);
      case Failure(:final failure):
        state = ScanError(
          failure is Object && failure.toString().isNotEmpty
              ? failure.toString()
              : 'Errore durante la timbratura',
        );
    }
  }

  void reset() {
    state = const ScanIdle();
  }
}

final attendanceScannerProvider =
    NotifierProvider<AttendanceScannerNotifier, ScanState>(() {
  return AttendanceScannerNotifier();
});

// ── Override Request Notifier ───────────────────────────────────────────────

sealed class OverrideRequestSubmitState {
  const OverrideRequestSubmitState();
}

class OverrideIdle extends OverrideRequestSubmitState {
  const OverrideIdle();
}

class OverrideSubmitting extends OverrideRequestSubmitState {
  const OverrideSubmitting();
}

class OverrideSuccess extends OverrideRequestSubmitState {
  final OverrideRequestV2 request;
  const OverrideSuccess(this.request);
}

class OverrideError extends OverrideRequestSubmitState {
  final String message;
  const OverrideError(this.message);
}

class OverrideRequestNotifier
    extends Notifier<OverrideRequestSubmitState> {
  @override
  OverrideRequestSubmitState build() => const OverrideIdle();

  Future<void> submit({
    required AttendanceAction requestedAction,
    required DateTime requestedAt,
    required String reason,
  }) async {
    state = const OverrideSubmitting();
    final body = OverrideRequestBodyV2(
      requestedAction: requestedAction.apiName,
      requestedAt: requestedAt.toUtc().toIso8601String(),
      reason: reason,
    );
    final result =
        await ref.read(attendanceV2RepositoryProvider).createOverrideRequest(body);
    switch (result) {
      case Success(:final data):
        state = OverrideSuccess(data);
        ref.invalidate(myOverrideRequestsProvider);
      case Failure(:final failure):
        state = OverrideError(
          failure is Object && failure.toString().isNotEmpty
              ? failure.toString()
              : 'Errore durante l\'invio',
        );
    }
  }

  void reset() => state = const OverrideIdle();
}

final overrideRequestProvider = NotifierProvider<OverrideRequestNotifier,
    OverrideRequestSubmitState>(() {
  return OverrideRequestNotifier();
});

// ── Absences ────────────────────────────────────────────────────────────────

final myAbsencesProvider =
    FutureProvider.autoDispose<List<UserAbsence>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final result =
      await ref.watch(attendanceV2RepositoryProvider).getMyAbsences(user.id);
  return result.getOrNull() ?? [];
});

sealed class AbsenceSubmitState {
  const AbsenceSubmitState();
}

class AbsenceIdle extends AbsenceSubmitState {
  const AbsenceIdle();
}

class AbsenceSubmitting extends AbsenceSubmitState {
  const AbsenceSubmitting();
}

class AbsenceSuccess extends AbsenceSubmitState {
  final UserAbsence absence;
  const AbsenceSuccess(this.absence);
}

class AbsenceError extends AbsenceSubmitState {
  final String message;
  const AbsenceError(this.message);
}

class AbsenceNotifier extends Notifier<AbsenceSubmitState> {
  @override
  AbsenceSubmitState build() => const AbsenceIdle();

  Future<void> submit({
    required String absenceDate,
    String? reason,
    String? notes,
  }) async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;
    state = const AbsenceSubmitting();
    final result = await ref.read(attendanceV2RepositoryProvider).createAbsence(
          userId: user.id,
          absenceDate: absenceDate,
          reason: reason,
          notes: notes,
        );
    switch (result) {
      case Success(:final data):
        state = AbsenceSuccess(data);
        ref.invalidate(myAbsencesProvider);
      case Failure(:final failure):
        state = AbsenceError(
          failure.toString().isNotEmpty
              ? failure.toString()
              : 'Errore durante l\'invio',
        );
    }
  }

  void reset() => state = const AbsenceIdle();
}

final absenceNotifierProvider =
    NotifierProvider<AbsenceNotifier, AbsenceSubmitState>(AbsenceNotifier.new);
