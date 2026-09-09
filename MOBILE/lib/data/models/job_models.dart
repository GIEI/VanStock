import 'package:json_annotation/json_annotation.dart';
import 'inventory_models.dart';
import 'vehicle_models.dart';

part 'job_models.g.dart';

// ── Job ───────────────────────────────────────────────────────────────────────

@JsonSerializable()
class Job {
  final int id;
  @JsonKey(name: 'client_id')
  final int? clientId;
  @JsonKey(name: 'client_name')
  final String? clientName;
  @JsonKey(name: 'client_phone')
  final String? clientPhone;
  @JsonKey(name: 'client_email')
  final String? clientEmail;
  @JsonKey(name: 'client_address')
  final String? clientAddress;
  final String title;
  final String? description;
  final String? address;
  @JsonKey(name: 'assigned_to')
  final int? assignedTo;
  @JsonKey(name: 'assigned_to_name')
  final String? assignedToName;
  @JsonKey(name: 'scheduled_date')
  final String? scheduledDate;
  @JsonKey(name: 'scheduled_time')
  final String? scheduledTime;
  @JsonKey(name: 'scheduled_time_custom')
  final String? scheduledTimeCustom;
  final String status;
  @JsonKey(name: 'started_at')
  final String? startedAt;
  @JsonKey(name: 'completed_at')
  final String? completedAt;
  final String? priority;
  @JsonKey(name: 'signed_at')
  final String? signedAt;
  @JsonKey(name: 'customer_signature_url')
  final String? customerSignatureUrl;
  @JsonKey(name: 'report_pdf_url')
  final String? reportPdfUrl;
  @JsonKey(name: 'movement_count')
  final int? movementCount;
  final List<Movement>? movements;
  final List<JobPhoto>? photos;
  @JsonKey(name: 'vehicle_booking')
  final VehicleBooking? vehicleBooking;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'updated_at')
  final String? updatedAt;
  @JsonKey(name: 'signature_url')
  final String? signatureUrl;
  @JsonKey(name: 'product_missing')
  final bool? productMissing;
  @JsonKey(name: 'product_missing_note')
  final String? productMissingNote;

  const Job({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.clientPhone,
    required this.clientEmail,
    required this.clientAddress,
    required this.title,
    required this.description,
    required this.address,
    required this.assignedTo,
    required this.assignedToName,
    required this.scheduledDate,
    this.scheduledTime,
    this.scheduledTimeCustom,
    required this.status,
    required this.startedAt,
    required this.completedAt,
    this.priority,
    this.signedAt,
    this.customerSignatureUrl,
    this.reportPdfUrl,
    required this.movementCount,
    required this.movements,
    required this.photos,
    required this.vehicleBooking,
    required this.createdAt,
    this.updatedAt,
    required this.signatureUrl,
    this.productMissing,
    this.productMissingNote,
  });

  factory Job.fromJson(Map<String, dynamic> json) => _$JobFromJson(json);

  Map<String, dynamic> toJson() => _$JobToJson(this);
}

@JsonSerializable()
class JobPhoto {
  final int id;
  @JsonKey(name: 'job_id')
  final int jobId;
  final String type;
  final String url;
  final String? filename;
  @JsonKey(name: 'created_by')
  final String? createdBy;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'media_type')
  final String? mediaType;

  const JobPhoto({
    required this.id,
    required this.jobId,
    required this.type,
    required this.url,
    required this.filename,
    required this.createdBy,
    required this.createdAt,
    this.mediaType,
  });

  bool get isVideo => mediaType == 'video';

  factory JobPhoto.fromJson(Map<String, dynamic> json) =>
      _$JobPhotoFromJson(json);

  Map<String, dynamic> toJson() => _$JobPhotoToJson(this);
}

@JsonSerializable()
class JobMessage {
  final int id;
  @JsonKey(name: 'job_id')
  final int jobId;
  @JsonKey(name: 'sender_id')
  final int senderId;
  @JsonKey(name: 'sender_name')
  final String? senderName;
  final String? content;
  final String type;
  @JsonKey(name: 'audio_url')
  final String? audioUrl;
  @JsonKey(name: 'audio_duration')
  final double? audioDuration;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  const JobMessage({
    required this.id,
    required this.jobId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.type,
    required this.audioUrl,
    required this.audioDuration,
    required this.createdAt,
  });

  factory JobMessage.fromJson(Map<String, dynamic> json) =>
      _$JobMessageFromJson(json);

  Map<String, dynamic> toJson() => _$JobMessageToJson(this);
}

@JsonSerializable()
class CreateJobDto {
  final String title;
  final String? description;
  final String? address;
  @JsonKey(name: 'scheduled_date')
  final String? scheduledDate;
  @JsonKey(name: 'scheduled_time')
  final String? scheduledTime;
  @JsonKey(name: 'scheduled_time_custom')
  final String? scheduledTimeCustom;
  final String priority;

  const CreateJobDto({
    required this.title,
    required this.description,
    required this.address,
    required this.scheduledDate,
    this.scheduledTime = 'all_day',
    this.scheduledTimeCustom,
    this.priority = 'normale',
  });

  factory CreateJobDto.fromJson(Map<String, dynamic> json) =>
      _$CreateJobDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateJobDtoToJson(this);
}

@JsonSerializable()
class SignJobBody {
  final String signature;

  const SignJobBody({
    required this.signature,
  });

  factory SignJobBody.fromJson(Map<String, dynamic> json) =>
      _$SignJobBodyFromJson(json);

  Map<String, dynamic> toJson() => _$SignJobBodyToJson(this);
}

@JsonSerializable()
class SendMessageDto {
  final String content;

  const SendMessageDto({
    required this.content,
  });

  factory SendMessageDto.fromJson(Map<String, dynamic> json) =>
      _$SendMessageDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SendMessageDtoToJson(this);
}
