import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/remote/report_datasource.dart';
import '../../data/repositories/report_repository.dart';
import 'core_providers.dart';

final reportRemoteDatasourceProvider = Provider((ref) {
  return ReportRemoteDatasource(ref.watch(dioClientProvider));
});

final reportRepositoryProvider = Provider((ref) {
  return ReportRepository(ref.watch(reportRemoteDatasourceProvider));
});
