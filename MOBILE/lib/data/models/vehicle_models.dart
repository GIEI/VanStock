import 'package:json_annotation/json_annotation.dart';
import 'inventory_models.dart';

part 'vehicle_models.g.dart';

// ── Vehicle Booking ───────────────────────────────────────────────────────────

@JsonSerializable()
class VehicleBooking {
  final int id;
  @JsonKey(name: 'company_id')
  final int? companyId;
  @JsonKey(name: 'location_id')
  final int locationId;
  @JsonKey(name: 'job_id')
  final int? jobId;
  final String date;
  @JsonKey(name: 'start_time')
  final String startTime;
  @JsonKey(name: 'end_time')
  final String endTime;
  @JsonKey(name: 'booked_by')
  final int? bookedBy;
  final String? notes;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'van_name')
  final String? vanName;
  @JsonKey(name: 'van_plate')
  final String? vanPlate;
  @JsonKey(name: 'job_title')
  final String? jobTitle;
  @JsonKey(name: 'booked_by_name')
  final String? bookedByName;

  const VehicleBooking({
    required this.id,
    this.companyId,
    required this.locationId,
    required this.jobId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.bookedBy,
    required this.notes,
    required this.createdAt,
    required this.vanName,
    required this.vanPlate,
    required this.jobTitle,
    required this.bookedByName,
  });

  factory VehicleBooking.fromJson(Map<String, dynamic> json) =>
      _$VehicleBookingFromJson(json);

  Map<String, dynamic> toJson() => _$VehicleBookingToJson(this);
}

@JsonSerializable()
class AvailableVansResponse {
  final List<Location> available;
  @JsonKey(name: 'existing_booking')
  final VehicleBooking? existingBooking;
  @JsonKey(name: 'must_use_van_id')
  final int? mustUseVanId;

  const AvailableVansResponse({
    required this.available,
    required this.existingBooking,
    this.mustUseVanId,
  });

  factory AvailableVansResponse.fromJson(Map<String, dynamic> json) =>
      _$AvailableVansResponseFromJson(json);

  Map<String, dynamic> toJson() => _$AvailableVansResponseToJson(this);
}

@JsonSerializable()
class RequiredMaterialAvailability {
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'quantity_required')
  final double quantityRequired;
  @JsonKey(name: 'product_name')
  final String productName;

  const RequiredMaterialAvailability({
    required this.productId,
    required this.quantityRequired,
    required this.productName,
  });
  factory RequiredMaterialAvailability.fromJson(Map<String, dynamic> json) =>
      _$RequiredMaterialAvailabilityFromJson(json);
  Map<String, dynamic> toJson() => _$RequiredMaterialAvailabilityToJson(this);
}

@JsonSerializable()
class CreateVehicleBookingDto {
  @JsonKey(name: 'location_id')
  final int locationId;
  final String date;
  @JsonKey(name: 'start_time')
  final String startTime;
  @JsonKey(name: 'end_time')
  final String endTime;
  @JsonKey(name: 'job_id')
  final int? jobId;
  final String? notes;

  const CreateVehicleBookingDto({
    required this.locationId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.jobId,
    required this.notes,
  });

  factory CreateVehicleBookingDto.fromJson(Map<String, dynamic> json) =>
      _$CreateVehicleBookingDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateVehicleBookingDtoToJson(this);
}

@JsonSerializable()
class AcceptJobBody {
  final String status;
  @JsonKey(name: 'vehicle_id')
  final int vehicleId;
  @JsonKey(name: 'vehicle_start_time')
  final String vehicleStartTime;
  @JsonKey(name: 'vehicle_end_time')
  final String vehicleEndTime;

  const AcceptJobBody({
    this.status = 'in_corso',
    required this.vehicleId,
    required this.vehicleStartTime,
    required this.vehicleEndTime,
  });

  factory AcceptJobBody.fromJson(Map<String, dynamic> json) =>
      _$AcceptJobBodyFromJson(json);

  Map<String, dynamic> toJson() => _$AcceptJobBodyToJson(this);
}
