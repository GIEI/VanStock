import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io';
import '../../data/models/job_models.dart';
import '../../data/models/vehicle_models.dart';
import '../../data/models/inventory_models.dart';
import '../../data/models/common_models.dart';
import '../../data/repositories/job_repository.dart';
import '../../core/errors/result.dart';
import 'job_providers.dart';
import 'inventory_providers.dart';

final jobActionProvider = Provider((ref) {
  return JobActionNotifier(ref.watch(jobRepositoryProvider));
});

final vanProductsProvider = FutureProvider.family<List<Product>, int>((
  ref,
  locationId,
) async {
  final repository = ref.watch(inventoryRepositoryProvider);
  const pageSize = 100;
  var page = 1;
  final products = <Product>[];

  while (true) {
    final result = await repository.getProducts(
      locationId: locationId,
      page: page,
      limit: pageSize,
    );
    final response = switch (result) {
      Success<PagedResponse<Product>>(data: final response) => response,
      Failure<PagedResponse<Product>>(failure: final failure) =>
        throw Exception('Failed to load products: $failure'),
    };
    products.addAll(response.data);
    if (products.length >= response.total || response.data.length < pageSize) {
      return products;
    }
    page++;
  }
});

class JobActionNotifier {
  final JobRepository _jobRepository;

  JobActionNotifier(this._jobRepository);

  Future<Result<Job>> acceptJob(
    int jobId,
    int vehicleId,
    String vehicleStartTime,
    String vehicleEndTime, {
    double? latitude,
    double? longitude,
    String? locationAddress,
    bool productMissing = false,
    String? productMissingNote,
  }) async {
    final acceptBody = AcceptJobBody(
      status: 'in_corso',
      vehicleId: vehicleId,
      vehicleStartTime: vehicleStartTime,
      vehicleEndTime: vehicleEndTime,
    );
    final bodyMap = acceptBody.toJson();
    if (latitude != null) bodyMap['latitude'] = latitude;
    if (longitude != null) bodyMap['longitude'] = longitude;
    if (locationAddress != null) bodyMap['location_address'] = locationAddress;
    if (productMissing) {
      bodyMap['product_missing'] = true;
      if (productMissingNote != null && productMissingNote.isNotEmpty) {
        bodyMap['product_missing_note'] = productMissingNote;
      }
    }
    return await _jobRepository.updateJob(jobId, bodyMap);
  }

  Future<Result<Job>> rejectJob(
    int jobId, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    final body = <String, dynamic>{'status': 'annullato'};
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    if (locationAddress != null) body['location_address'] = locationAddress;
    return await _jobRepository.updateJob(jobId, body);
  }

  Future<Result<Job>> startWork(
    int jobId, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    return await _jobRepository.startWork(
      jobId,
      latitude: latitude,
      longitude: longitude,
      locationAddress: locationAddress,
    );
  }

  Future<Result<Job>> completeJob(
    int jobId, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    final body = <String, dynamic>{'status': 'completato'};
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    if (locationAddress != null) body['location_address'] = locationAddress;
    return await _jobRepository.updateJob(jobId, body);
  }

  Future<Result<Job>> signJob(
    int jobId,
    String signatureBase64, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    final body = SignJobBody(signature: signatureBase64);
    return await _jobRepository.signJob(
      jobId,
      body,
      latitude: latitude,
      longitude: longitude,
      locationAddress: locationAddress,
    );
  }

  Future<Result<JobPhoto>> uploadPhoto(
    int jobId,
    String type,
    File file, {
    double? latitude,
    double? longitude,
    String? locationAddress,
  }) async {
    return await _jobRepository.uploadPhoto(
      jobId,
      type,
      file,
      latitude: latitude,
      longitude: longitude,
      locationAddress: locationAddress,
    );
  }

  Future<Result<void>> deletePhoto(int jobId, int photoId) async {
    return await _jobRepository.deletePhoto(jobId, photoId);
  }
}
