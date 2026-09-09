// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VehicleBooking _$VehicleBookingFromJson(Map<String, dynamic> json) =>
    VehicleBooking(
      id: (json['id'] as num).toInt(),
      companyId: (json['company_id'] as num?)?.toInt(),
      locationId: (json['location_id'] as num).toInt(),
      jobId: (json['job_id'] as num?)?.toInt(),
      date: json['date'] as String,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      bookedBy: (json['booked_by'] as num?)?.toInt(),
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String?,
      vanName: json['van_name'] as String?,
      vanPlate: json['van_plate'] as String?,
      jobTitle: json['job_title'] as String?,
      bookedByName: json['booked_by_name'] as String?,
    );

Map<String, dynamic> _$VehicleBookingToJson(VehicleBooking instance) =>
    <String, dynamic>{
      'id': instance.id,
      'company_id': instance.companyId,
      'location_id': instance.locationId,
      'job_id': instance.jobId,
      'date': instance.date,
      'start_time': instance.startTime,
      'end_time': instance.endTime,
      'booked_by': instance.bookedBy,
      'notes': instance.notes,
      'created_at': instance.createdAt,
      'van_name': instance.vanName,
      'van_plate': instance.vanPlate,
      'job_title': instance.jobTitle,
      'booked_by_name': instance.bookedByName,
    };

AvailableVansResponse _$AvailableVansResponseFromJson(
  Map<String, dynamic> json,
) => AvailableVansResponse(
  available: (json['available'] as List<dynamic>)
      .map((e) => Location.fromJson(e as Map<String, dynamic>))
      .toList(),
  existingBooking: json['existing_booking'] == null
      ? null
      : VehicleBooking.fromJson(
          json['existing_booking'] as Map<String, dynamic>,
        ),
  mustUseVanId: (json['must_use_van_id'] as num?)?.toInt(),
);

Map<String, dynamic> _$AvailableVansResponseToJson(
  AvailableVansResponse instance,
) => <String, dynamic>{
  'available': instance.available,
  'existing_booking': instance.existingBooking,
  'must_use_van_id': instance.mustUseVanId,
};

RequiredMaterialAvailability _$RequiredMaterialAvailabilityFromJson(
  Map<String, dynamic> json,
) => RequiredMaterialAvailability(
  productId: (json['product_id'] as num).toInt(),
  quantityRequired: (json['quantity_required'] as num).toDouble(),
  productName: json['product_name'] as String,
);

Map<String, dynamic> _$RequiredMaterialAvailabilityToJson(
  RequiredMaterialAvailability instance,
) => <String, dynamic>{
  'product_id': instance.productId,
  'quantity_required': instance.quantityRequired,
  'product_name': instance.productName,
};

CreateVehicleBookingDto _$CreateVehicleBookingDtoFromJson(
  Map<String, dynamic> json,
) => CreateVehicleBookingDto(
  locationId: (json['location_id'] as num).toInt(),
  date: json['date'] as String,
  startTime: json['start_time'] as String,
  endTime: json['end_time'] as String,
  jobId: (json['job_id'] as num?)?.toInt(),
  notes: json['notes'] as String?,
);

Map<String, dynamic> _$CreateVehicleBookingDtoToJson(
  CreateVehicleBookingDto instance,
) => <String, dynamic>{
  'location_id': instance.locationId,
  'date': instance.date,
  'start_time': instance.startTime,
  'end_time': instance.endTime,
  'job_id': instance.jobId,
  'notes': instance.notes,
};

AcceptJobBody _$AcceptJobBodyFromJson(Map<String, dynamic> json) =>
    AcceptJobBody(
      status: json['status'] as String? ?? 'in_corso',
      vehicleId: (json['vehicle_id'] as num).toInt(),
      vehicleStartTime: json['vehicle_start_time'] as String,
      vehicleEndTime: json['vehicle_end_time'] as String,
    );

Map<String, dynamic> _$AcceptJobBodyToJson(AcceptJobBody instance) =>
    <String, dynamic>{
      'status': instance.status,
      'vehicle_id': instance.vehicleId,
      'vehicle_start_time': instance.vehicleStartTime,
      'vehicle_end_time': instance.vehicleEndTime,
    };
