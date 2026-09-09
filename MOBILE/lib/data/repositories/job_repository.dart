import 'dart:io';
import '../datasources/remote/job_datasource.dart';
import '../models/job_models.dart';
import '../models/common_models.dart';
import '../../core/errors/result.dart';

class JobRepository {
  final JobRemoteDatasource _remoteDatasource;

  JobRepository(this._remoteDatasource);

  Future<Result<PagedResponse<Job>>> getJobs({
    String? status,
    int? assignedTo,
    String? date,
    int page = 1,
  }) =>
      _remoteDatasource.getJobs(
        status: status,
        assignedTo: assignedTo,
        date: date,
        page: page,
      );

  Future<Result<Job>> getJob(int id) => _remoteDatasource.getJob(id);

  Future<Result<Job>> createJob(CreateJobDto dto) =>
      _remoteDatasource.createJob(dto);

  Future<Result<Job>> updateJob(int id, Map<String, dynamic> body) =>
      _remoteDatasource.updateJob(id, body);

  Future<Result<List<JobMessage>>> getMessages(int jobId) =>
      _remoteDatasource.getMessages(jobId);

  Future<Result<JobMessage>> sendMessage(
    int jobId,
    SendMessageDto dto,
  ) =>
      _remoteDatasource.sendMessage(jobId, dto);

  Future<Result<Job>> signJob(
    int jobId,
    SignJobBody body, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) =>
      _remoteDatasource.signJob(jobId, body, latitude: latitude, longitude: longitude, locationAddress: locationAddress);

  Future<Result<Job>> startWork(
    int jobId, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) =>
      _remoteDatasource.startWork(jobId, latitude: latitude, longitude: longitude, locationAddress: locationAddress);

  Future<Result<JobPhoto>> uploadPhoto(
    int jobId,
    String type,
    File file, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) =>
      _remoteDatasource.uploadPhoto(jobId, type, file, latitude: latitude, longitude: longitude, locationAddress: locationAddress);

  Future<Result<void>> deletePhoto(int jobId, int photoId) =>
      _remoteDatasource.deletePhoto(jobId, photoId);
}
