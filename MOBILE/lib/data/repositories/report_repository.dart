import '../datasources/remote/report_datasource.dart';
import '../models/report_and_supplier_models.dart';
import '../../core/errors/result.dart';

class ReportRepository {
  final ReportRemoteDatasource _remoteDatasource;

  ReportRepository(this._remoteDatasource);

  Future<Result<List<DailyReport>>> getReports({
    String? date,
    int? userId,
  }) =>
      _remoteDatasource.getReports(date: date, userId: userId);

  Future<Result<DailyReport>> getReport(int id) =>
      _remoteDatasource.getReport(id);

  Future<Result<DailyReport>> createReport(CreateReportDto dto) =>
      _remoteDatasource.createReport(dto);
}
