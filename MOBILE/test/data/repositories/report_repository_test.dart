import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/report_datasource.dart';
import 'package:van_stock/data/models/report_and_supplier_models.dart';
import 'package:van_stock/data/repositories/report_repository.dart';
import 'package:van_stock/core/errors/result.dart';

// Mock implementation
class MockReportRemoteDatasource implements ReportRemoteDatasource {
  final Map<String, dynamic> _data = {};

  void setupGetReports(Result<List<DailyReport>> result) {
    _data['getReports'] = result;
  }

  void setupGetReport(Result<DailyReport> result) {
    _data['getReport'] = result;
  }

  void setupCreateReport(Result<DailyReport> result) {
    _data['createReport'] = result;
  }

  @override
  Future<Result<List<DailyReport>>> getReports({
    String? date,
    int? userId,
  }) async {
    return _data['getReports'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<DailyReport>> getReport(int id) async {
    return _data['getReport'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<DailyReport>> createReport(CreateReportDto dto) async {
    return _data['createReport'] ?? Failure('Not mocked');
  }
}

void main() {
  late MockReportRemoteDatasource mockDatasource;
  late ReportRepository repository;

  setUp(() {
    mockDatasource = MockReportRemoteDatasource();
    repository = ReportRepository(mockDatasource);
  });

  group('ReportRepository', () {
    group('getReports', () {
      test('returns Success with list of daily reports when datasource succeeds',
          () async {
        // Arrange
        final jobs = [
          ReportJob(
            id: 1,
            title: 'Site Preparation',
            status: 'completed',
            address: '123 Main St',
            clientName: 'Client A',
            completedAt: '2026-04-19 15:30:00',
            hours: 8.0,
            movements: null,
          ),
        ];

        final report = DailyReport(
          id: 1,
          companyId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          reportDate: '2026-04-19',
          notes: 'Good progress',
          createdAt: '2026-04-19 18:00:00',
          jobsCount: 1,
          movementsCount: 3,
          totalHours: 8.0,
          jobs: jobs,
          movementsOther: null,
        );

        mockDatasource.setupGetReports(Success([report]));

        // Act
        final result = await repository.getReports();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((reports) {
          expect(reports.length, 1);
          expect(reports[0].id, 1);
          expect(reports[0].userName, 'John Doe');
          expect(reports[0].jobsCount, 1);
        });
      });

      test('returns Success with reports filtered by date', () async {
        // Arrange
        final report = DailyReport(
          id: 1,
          companyId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          reportDate: '2026-04-19',
          notes: 'Good progress',
          createdAt: '2026-04-19 18:00:00',
          jobsCount: 1,
          movementsCount: 3,
          totalHours: 8.0,
          jobs: null,
          movementsOther: null,
        );

        mockDatasource.setupGetReports(Success([report]));

        // Act
        final result = await repository.getReports(date: '2026-04-19');

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((reports) {
          expect(reports.length, 1);
          expect(reports[0].reportDate, '2026-04-19');
        });
      });

      test('returns Success with reports filtered by userId', () async {
        // Arrange
        final report = DailyReport(
          id: 1,
          companyId: 1,
          userId: 5,
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          reportDate: '2026-04-19',
          notes: null,
          createdAt: '2026-04-19 18:00:00',
          jobsCount: 2,
          movementsCount: 5,
          totalHours: 8.5,
          jobs: null,
          movementsOther: null,
        );

        mockDatasource.setupGetReports(Success([report]));

        // Act
        final result = await repository.getReports(userId: 5);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((reports) {
          expect(reports.length, 1);
          expect(reports[0].userId, 5);
          expect(reports[0].userName, 'Jane Smith');
        });
      });

      test('returns Success with empty list when no reports', () async {
        // Arrange
        mockDatasource.setupGetReports(Success([]));

        // Act
        final result = await repository.getReports();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((reports) {
          expect(reports.isEmpty, true);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetReports(Failure('Database error'));

        // Act
        final result = await repository.getReports();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Database error');
        });
      });
    });

    group('getReport', () {
      test('returns Success with DailyReport when datasource succeeds', () async {
        // Arrange
        final movements = [
          ReportMovement(
            id: 1,
            type: 'pickup',
            quantity: 10,
            notes: 'Picked up materials',
            productName: 'Material A',
            unit: 'pcs',
            fromLocationName: 'Warehouse',
            toLocationName: 'Site',
          ),
        ];

        final report = DailyReport(
          id: 1,
          companyId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          reportDate: '2026-04-19',
          notes: 'Good progress',
          createdAt: '2026-04-19 18:00:00',
          jobsCount: 1,
          movementsCount: 1,
          totalHours: 8.0,
          jobs: null,
          movementsOther: movements,
        );

        mockDatasource.setupGetReport(Success(report));

        // Act
        final result = await repository.getReport(1);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((rep) {
          expect(rep.id, 1);
          expect(rep.userName, 'John Doe');
          expect(rep.movementsCount, 1);
          expect(rep.movementsOther?.length, 1);
          expect(rep.movementsOther?[0].productName, 'Material A');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetReport(Failure('Report not found'));

        // Act
        final result = await repository.getReport(999);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Report not found');
        });
      });
    });

    group('createReport', () {
      test('returns Success with created DailyReport when datasource succeeds',
          () async {
        // Arrange
        final dto = CreateReportDto(
          reportDate: '2026-04-19',
          notes: 'Daily summary',
        );

        final report = DailyReport(
          id: 2,
          companyId: 1,
          userId: 1,
          userName: 'John Doe',
          userEmail: 'john@example.com',
          reportDate: '2026-04-19',
          notes: 'Daily summary',
          createdAt: '2026-04-19 18:00:00',
          jobsCount: 0,
          movementsCount: 0,
          totalHours: 0.0,
          jobs: null,
          movementsOther: null,
        );

        mockDatasource.setupCreateReport(Success(report));

        // Act
        final result = await repository.createReport(dto);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((rep) {
          expect(rep.id, 2);
          expect(rep.reportDate, '2026-04-19');
          expect(rep.notes, 'Daily summary');
          expect(rep.jobsCount, 0);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        final dto = CreateReportDto(
          reportDate: '2026-04-19',
          notes: 'Duplicate report',
        );

        mockDatasource.setupCreateReport(
          Failure('Report already exists for this date'),
        );

        // Act
        final result = await repository.createReport(dto);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Report already exists for this date');
        });
      });
    });
  });
}
