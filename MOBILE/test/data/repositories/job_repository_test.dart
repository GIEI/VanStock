import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/job_datasource.dart';
import 'package:van_stock/data/models/job_models.dart';
import 'package:van_stock/data/models/common_models.dart';
import 'package:van_stock/data/repositories/job_repository.dart';
import 'package:van_stock/core/errors/result.dart';
import 'dart:io';

// Mock implementation
class MockJobRemoteDatasource implements JobRemoteDatasource {
  final Map<String, dynamic> _jobsData = {};

  void setupGetJobs(Result<PagedResponse<Job>> result) {
    _jobsData['getJobs'] = result;
  }

  void setupGetJob(int id, Result<Job> result) {
    _jobsData['getJob_$id'] = result;
  }

  void setupCreateJob(Result<Job> result) {
    _jobsData['createJob'] = result;
  }

  @override
  Future<Result<PagedResponse<Job>>> getJobs({
    String? status,
    int? assignedTo,
    String? date,
    int page = 1,
  }) async {
    return _jobsData['getJobs'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Job>> getJob(int id) async {
    return _jobsData['getJob_$id'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<Job>> createJob(CreateJobDto dto) async {
    return _jobsData['createJob'] ?? Failure('Not mocked');
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

  @override
  Future<Result<Job>> startWork(int jobId) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<JobPhoto>> uploadPhoto(int jobId, String type, File file) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<void>> deletePhoto(int jobId, int photoId) async {
    throw UnimplementedError();
  }
}

void main() {
  late MockJobRemoteDatasource mockDatasource;
  late JobRepository repository;

  setUp(() {
    mockDatasource = MockJobRemoteDatasource();
    repository = JobRepository(mockDatasource);
  });

  group('JobRepository', () {
    group('getJobs', () {
      test('returns Success with PagedResponse when datasource succeeds',
          () async {
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
        final result = await repository.getJobs();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((response) {
          expect(response.data.length, 1);
          expect(response.data[0].id, 1);
          expect(response.data[0].title, 'Test Job');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetJobs(Failure('Network error'));

        // Act
        final result = await repository.getJobs();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Network error');
        });
      });
    });

    group('getJob', () {
      test('returns Success with Job when datasource succeeds', () async {
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

        mockDatasource.setupGetJob(1, Success(mockJob));

        // Act
        final result = await repository.getJob(1);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((job) {
          expect(job.id, 1);
          expect(job.title, 'Test Job');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetJob(999, Failure('Job not found'));

        // Act
        final result = await repository.getJob(999);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Job not found');
        });
      });
    });

    group('createJob', () {
      test('returns Success with created Job when datasource succeeds',
          () async {
        // Arrange
        final createDto = CreateJobDto(
          title: 'New Job',
          description: 'New Description',
          address: 'New Address',
          scheduledDate: '2026-04-25',
          priority: 'normale',
        );

        final createdJob = Job(
          id: 2,
          clientId: null,
          clientName: null,
          clientPhone: null,
          clientEmail: null,
          clientAddress: null,
          title: 'New Job',
          description: 'New Description',
          address: 'New Address',
          assignedTo: null,
          assignedToName: null,
          scheduledDate: '2026-04-25',
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

        mockDatasource.setupCreateJob(Success(createdJob));

        // Act
        final result = await repository.createJob(createDto);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((job) {
          expect(job.id, 2);
          expect(job.title, 'New Job');
        });
      });
    });
  });
}
