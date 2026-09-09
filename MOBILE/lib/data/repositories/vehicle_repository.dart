import '../datasources/remote/vehicle_datasource.dart';
import '../models/vehicle_models.dart';
import '../../core/errors/result.dart';

class VehicleRepository {
  final VehicleRemoteDatasource _remoteDatasource;

  VehicleRepository(this._remoteDatasource);

  Future<Result<List<VehicleBooking>>> getMyBookings({String? date}) =>
      _remoteDatasource.getMyBookings(date: date);

  Future<Result<AvailableVansResponse>> getAvailableVans({
    required String date,
    required String startTime,
    required String endTime,
    int? jobId,
  }) => _remoteDatasource.getAvailableVans(
    date: date,
    startTime: startTime,
    endTime: endTime,
    jobId: jobId,
  );

  Future<Result<VehicleBooking>> createBooking(CreateVehicleBookingDto dto) =>
      _remoteDatasource.createBooking(dto);

  Future<Result<void>> deleteBooking(int id) =>
      _remoteDatasource.deleteBooking(id);
}
