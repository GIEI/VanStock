// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'job_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Job _$JobFromJson(Map<String, dynamic> json) => Job(
  id: (json['id'] as num).toInt(),
  clientId: (json['client_id'] as num?)?.toInt(),
  clientName: json['client_name'] as String?,
  clientPhone: json['client_phone'] as String?,
  clientEmail: json['client_email'] as String?,
  clientAddress: json['client_address'] as String?,
  title: json['title'] as String,
  description: json['description'] as String?,
  address: json['address'] as String?,
  assignedTo: (json['assigned_to'] as num?)?.toInt(),
  assignedToName: json['assigned_to_name'] as String?,
  scheduledDate: json['scheduled_date'] as String?,
  scheduledTime: json['scheduled_time'] as String?,
  scheduledTimeCustom: json['scheduled_time_custom'] as String?,
  status: json['status'] as String,
  startedAt: json['started_at'] as String?,
  completedAt: json['completed_at'] as String?,
  priority: json['priority'] as String?,
  signedAt: json['signed_at'] as String?,
  customerSignatureUrl: json['customer_signature_url'] as String?,
  reportPdfUrl: json['report_pdf_url'] as String?,
  movementCount: (json['movement_count'] as num?)?.toInt(),
  movements: (json['movements'] as List<dynamic>?)
      ?.map((e) => Movement.fromJson(e as Map<String, dynamic>))
      .toList(),
  photos: (json['photos'] as List<dynamic>?)
      ?.map((e) => JobPhoto.fromJson(e as Map<String, dynamic>))
      .toList(),
  vehicleBooking: json['vehicle_booking'] == null
      ? null
      : VehicleBooking.fromJson(
          json['vehicle_booking'] as Map<String, dynamic>,
        ),
  createdAt: json['created_at'] as String?,
  updatedAt: json['updated_at'] as String?,
  signatureUrl: json['signature_url'] as String?,
  productMissing: json['product_missing'] as bool?,
  productMissingNote: json['product_missing_note'] as String?,
);

Map<String, dynamic> _$JobToJson(Job instance) => <String, dynamic>{
  'id': instance.id,
  'client_id': instance.clientId,
  'client_name': instance.clientName,
  'client_phone': instance.clientPhone,
  'client_email': instance.clientEmail,
  'client_address': instance.clientAddress,
  'title': instance.title,
  'description': instance.description,
  'address': instance.address,
  'assigned_to': instance.assignedTo,
  'assigned_to_name': instance.assignedToName,
  'scheduled_date': instance.scheduledDate,
  'scheduled_time': instance.scheduledTime,
  'scheduled_time_custom': instance.scheduledTimeCustom,
  'status': instance.status,
  'started_at': instance.startedAt,
  'completed_at': instance.completedAt,
  'priority': instance.priority,
  'signed_at': instance.signedAt,
  'customer_signature_url': instance.customerSignatureUrl,
  'report_pdf_url': instance.reportPdfUrl,
  'movement_count': instance.movementCount,
  'movements': instance.movements,
  'photos': instance.photos,
  'vehicle_booking': instance.vehicleBooking,
  'created_at': instance.createdAt,
  'updated_at': instance.updatedAt,
  'signature_url': instance.signatureUrl,
  'product_missing': instance.productMissing,
  'product_missing_note': instance.productMissingNote,
};

JobPhoto _$JobPhotoFromJson(Map<String, dynamic> json) => JobPhoto(
  id: (json['id'] as num).toInt(),
  jobId: (json['job_id'] as num).toInt(),
  type: json['type'] as String,
  url: json['url'] as String,
  filename: json['filename'] as String?,
  createdBy: json['created_by'] as String?,
  createdAt: json['created_at'] as String?,
  mediaType: json['media_type'] as String?,
);

Map<String, dynamic> _$JobPhotoToJson(JobPhoto instance) => <String, dynamic>{
  'id': instance.id,
  'job_id': instance.jobId,
  'type': instance.type,
  'url': instance.url,
  'filename': instance.filename,
  'created_by': instance.createdBy,
  'created_at': instance.createdAt,
  'media_type': instance.mediaType,
};

JobMessage _$JobMessageFromJson(Map<String, dynamic> json) => JobMessage(
  id: (json['id'] as num).toInt(),
  jobId: (json['job_id'] as num).toInt(),
  senderId: (json['sender_id'] as num).toInt(),
  senderName: json['sender_name'] as String?,
  content: json['content'] as String?,
  type: json['type'] as String,
  audioUrl: json['audio_url'] as String?,
  audioDuration: (json['audio_duration'] as num?)?.toDouble(),
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$JobMessageToJson(JobMessage instance) =>
    <String, dynamic>{
      'id': instance.id,
      'job_id': instance.jobId,
      'sender_id': instance.senderId,
      'sender_name': instance.senderName,
      'content': instance.content,
      'type': instance.type,
      'audio_url': instance.audioUrl,
      'audio_duration': instance.audioDuration,
      'created_at': instance.createdAt,
    };

CreateJobDto _$CreateJobDtoFromJson(Map<String, dynamic> json) => CreateJobDto(
  title: json['title'] as String,
  description: json['description'] as String?,
  address: json['address'] as String?,
  scheduledDate: json['scheduled_date'] as String?,
  scheduledTime: json['scheduled_time'] as String? ?? 'all_day',
  scheduledTimeCustom: json['scheduled_time_custom'] as String?,
  priority: json['priority'] as String? ?? 'normale',
);

Map<String, dynamic> _$CreateJobDtoToJson(CreateJobDto instance) =>
    <String, dynamic>{
      'title': instance.title,
      'description': instance.description,
      'address': instance.address,
      'scheduled_date': instance.scheduledDate,
      'scheduled_time': instance.scheduledTime,
      'scheduled_time_custom': instance.scheduledTimeCustom,
      'priority': instance.priority,
    };

SignJobBody _$SignJobBodyFromJson(Map<String, dynamic> json) =>
    SignJobBody(signature: json['signature'] as String);

Map<String, dynamic> _$SignJobBodyToJson(SignJobBody instance) =>
    <String, dynamic>{'signature': instance.signature};

SendMessageDto _$SendMessageDtoFromJson(Map<String, dynamic> json) =>
    SendMessageDto(content: json['content'] as String);

Map<String, dynamic> _$SendMessageDtoToJson(SendMessageDto instance) =>
    <String, dynamic>{'content': instance.content};
