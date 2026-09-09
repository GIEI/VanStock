import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/job_datasource.dart';
import 'package:van_stock/data/models/job_models.dart';
import 'package:van_stock/data/models/common_models.dart';
import 'package:van_stock/data/repositories/job_repository.dart';
import 'package:van_stock/presentation/providers/job_providers.dart';
import 'package:van_stock/core/errors/result.dart';

class MockJobRemoteDatasource implements JobRemoteDatasource {
  final Map<String, dynamic> _data = {};

  void setupGetJobs(Result<PagedResponse<Job>> result) {
    _data['getJobs'] = result;
  }

  @override
  Future<Result<PagedResponse<Job>>> getJobs({
    String? status,
    int? assignedTo,
    String? date,
    int page = 1,
  }) async {
    return _data['getJobs'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Job>> getJob(int id) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<Job>> createJob(CreateJobDto dto) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<Job>> updateJob(int id, Map<String, dynamic> body) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<List<JobMessage>>> getMessages(int jobId) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<JobMessage>> sendMessage(int jobId, SendMessageDto dto) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<Job>> signJob(int jobId, SignJobBody body) async {
    throw UnimplementedError();
  }
}

void main() {
  group('JobProviders', () {
    late ProviderContainer container;
    late MockJobRemoteDatasource mockDatasource;

    setUp(() {
      mockDatasource = MockJobRemoteDatasource();

      container = ProviderContainer(
        overrides: [
          jobRemoteDatasourceProvider.overrideWithValue(mockDatasource),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    group('jobsListProvider', () {
      test('loads jobs successfully', () async {
        // Arrange
        final mockJob = Job(
          id: 1,
          clientId: 1,
          clientName: 'Test Client',
          clientPhone: '123456',
          clientEmail: 'test@example.com',
          clientAddress: 'Test Address',
          title: 'Test Job',
          description: 'Test Description',
          address: 'Job Address',
          assignedTo: 1,
          assignedToName: 'John Doe',
          scheduledDate: '2026-04-20',
          status: 'pianificato',
          startedAt: null,
          completedAt: null,
          movementCount: 0,
          movements: null,
          photos: null,
          vehicleBooking: null,
          createdAt: '2026-04-19',
          signatureUrl: null,
        );

        final pagedResponse = PagedResponse(
          data: [mockJob],
          total: 1,
          page: 1,
          limit: 10,
        );
        mockDatasource.setupGetJobs(Success(pagedResponse));

        // Act
        final result = await container.read(jobsListProvider.future);

        // Assert
        expect(result, isA<PagedResponse<Job>>());
        expect(result.data.length, 1);
        expect(result.data[0].id, 1);
        expect(result.data[0].title, 'Test Job');
      });

      test('throws exception on failure', () async {
        // Arrange
        mockDatasource.setupGetJobs(Failure('Network error'));

        // Act & Assert
        expect(
          () => container.read(jobsListProvider.future),
          throwsException,
        );
      });
    });

    group('jobRepositoryProvider', () {
      test('returns JobRepository instance', () {
        // Act
        final repo = container.read(jobRepositoryProvider);

        // Assert
        expect(repo, isA<JobRepository>());
      });
    });
  });
}
