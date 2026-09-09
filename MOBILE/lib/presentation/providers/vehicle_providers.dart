import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/vehicle_datasource.dart';
import '../../data/repositories/vehicle_repository.dart';
import '../../data/models/vehicle_models.dart';
import 'core_providers.dart';

final vehicleRemoteDatasourceProvider = Provider((ref) {
  return VehicleRemoteDatasource(ref.watch(dioClientProvider));
});

final vehicleRepositoryProvider = Provider((ref) {
  return VehicleRepository(ref.watch(vehicleRemoteDatasourceProvider));
});

final vehicleBookingsProvider = FutureProvider<List<VehicleBooking>>((
  ref,
) async {
  final result = await ref.watch(vehicleRepositoryProvider).getMyBookings();
  return result.getOrNull() ?? [];
});

final availableVansProvider = FutureProvider.autoDispose
    .family<
      AvailableVansResponse,
      ({String date, String startTime, String endTime, int jobId})
    >((ref, params) async {
      final result = await ref
          .watch(vehicleRepositoryProvider)
          .getAvailableVans(
            date: params.date,
            startTime: params.startTime,
            endTime: params.endTime,
            jobId: params.jobId,
          );
      return result.getOrNull() ??
          (throw Exception('Failed to load available vans'));
    });

final workShiftsProvider = FutureProvider<({String start, String end})>((
  ref,
) async {
  try {
    final res = await ref
        .watch(dioClientProvider)
        .dio
        .get('/system/work-shifts');
    final d = res.data as Map<String, dynamic>;
    return (
      start: (d['morning_start'] as String?) ?? '07:00',
      end: (d['afternoon_end'] as String?) ?? '20:00',
    );
  } catch (_) {
    return (start: '07:00', end: '20:00');
  }
});
