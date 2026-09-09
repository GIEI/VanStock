import '../datasources/remote/attendance_v2_datasource.dart';
import '../models/attendance_v2_models.dart';
import '../../core/errors/result.dart';

class AttendanceV2Repository {
  final AttendanceV2RemoteDatasource _remote;

  AttendanceV2Repository(this._remote);

  Future<Result<UserAttendanceState>> getCurrentState() =>
      _remote.getCurrentState();

  Future<Result<ScanResponse>> scanQr(ScanRequestBody body) =>
      _remote.scanQr(body);

  Future<Result<List<AttendanceEvent>>> getEvents({
    String? dateFrom,
    String? dateTo,
  }) =>
      _remote.getEvents(dateFrom: dateFrom, dateTo: dateTo);

  Future<Result<List<AttendanceDay>>> getDays({int? month, int? year}) =>
      _remote.getDays(month: month, year: year);

  Future<Result<OverrideRequestV2>> createOverrideRequest(
    OverrideRequestBodyV2 body,
  ) =>
      _remote.createOverrideRequest(body);

  Future<Result<List<OverrideRequestV2>>> getMyOverrideRequests() =>
      _remote.getMyOverrideRequests();

  Future<Result<UserAbsence>> createAbsence({
    required int userId,
    required String absenceDate,
    String? reason,
    String? notes,
  }) =>
      _remote.createAbsence(
        userId: userId,
        absenceDate: absenceDate,
        reason: reason,
        notes: notes,
      );

  Future<Result<List<UserAbsence>>> getMyAbsences(int userId) =>
      _remote.getMyAbsences(userId);
}
