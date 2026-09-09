import 'package:json_annotation/json_annotation.dart';

part 'attendance_v2_models.g.dart';

// ── Enums ────────────────────────────────────────────────────────────────────

enum AttendanceState { OUT, IN, BREAK, PENDING_REVIEW, LOCKED }

enum AttendanceAction { CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END }

enum EventStatus { valid, invalid, reviewed, superseded }

enum EventSource { mobile, web, admin }

extension AttendanceStateLabel on AttendanceState {
  String get apiName => name;

  static AttendanceState fromApi(String value) {
    return AttendanceState.values.firstWhere(
      (s) => s.name == value,
      orElse: () => AttendanceState.OUT,
    );
  }
}

extension AttendanceActionLabel on AttendanceAction {
  String get apiName => name;

  static AttendanceAction fromApi(String value) {
    return AttendanceAction.values.firstWhere(
      (a) => a.name == value,
      orElse: () => AttendanceAction.CHECK_IN,
    );
  }
}

// ── Models ───────────────────────────────────────────────────────────────────

@JsonSerializable()
class AttendanceEvent {
  final int id;
  @JsonKey(name: 'company_id')
  final int companyId;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'occurred_at')
  final String occurredAt;
  @JsonKey(name: 'detected_action')
  final String detectedAction;
  @JsonKey(name: 'resulting_state')
  final String resultingState;
  @JsonKey(name: 'previous_state')
  final String previousState;
  final String source;
  final String status;
  @JsonKey(name: 'anomaly_type')
  final String? anomalyType;
  final String? notes;
  @JsonKey(name: 'created_by')
  final int? createdBy;
  @JsonKey(name: 'created_by_name')
  final String? createdByName;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  const AttendanceEvent({
    required this.id,
    required this.companyId,
    required this.userId,
    this.userName,
    required this.occurredAt,
    required this.detectedAction,
    required this.resultingState,
    required this.previousState,
    required this.source,
    required this.status,
    this.anomalyType,
    this.notes,
    this.createdBy,
    this.createdByName,
    this.createdAt,
  });

  AttendanceAction get action => AttendanceActionLabel.fromApi(detectedAction);
  AttendanceState get state => AttendanceStateLabel.fromApi(resultingState);

  factory AttendanceEvent.fromJson(Map<String, dynamic> json) =>
      _$AttendanceEventFromJson(json);

  Map<String, dynamic> toJson() => _$AttendanceEventToJson(this);
}

@JsonSerializable()
class UserAttendanceState {
  @JsonKey(name: 'current_state')
  final String currentState;
  @JsonKey(name: 'last_event')
  final AttendanceEvent? lastEvent;
  @JsonKey(name: 'worked_minutes_today')
  final int workedMinutesToday;
  @JsonKey(name: 'break_minutes_today')
  final int breakMinutesToday;
  @JsonKey(name: 'anomalies_today')
  final int anomaliesToday;
  @JsonKey(name: 'has_open_anomalies')
  final bool hasOpenAnomalies;
  @JsonKey(name: 'valid_intents')
  final List<String> validIntents;

  const UserAttendanceState({
    required this.currentState,
    this.lastEvent,
    required this.workedMinutesToday,
    required this.breakMinutesToday,
    required this.anomaliesToday,
    required this.hasOpenAnomalies,
    required this.validIntents,
  });

  AttendanceState get state => AttendanceStateLabel.fromApi(currentState);

  List<AttendanceAction> get availableActions =>
      validIntents.map(AttendanceActionLabel.fromApi).toList();

  factory UserAttendanceState.fromJson(Map<String, dynamic> json) =>
      _$UserAttendanceStateFromJson(json);

  Map<String, dynamic> toJson() => _$UserAttendanceStateToJson(this);
}

@JsonSerializable()
class AttendanceDay {
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'company_id')
  final int companyId;
  final String date;
  @JsonKey(name: 'first_entry')
  final String? firstEntry;
  @JsonKey(name: 'last_exit')
  final String? lastExit;
  @JsonKey(name: 'worked_minutes')
  final int workedMinutes;
  @JsonKey(name: 'break_minutes')
  final int breakMinutes;
  @JsonKey(name: 'anomalies_count')
  final int anomaliesCount;
  @JsonKey(name: 'has_pending_review')
  final bool hasPendingReview;
  final String status;

  const AttendanceDay({
    required this.userId,
    required this.companyId,
    required this.date,
    this.firstEntry,
    this.lastExit,
    required this.workedMinutes,
    required this.breakMinutes,
    required this.anomaliesCount,
    required this.hasPendingReview,
    required this.status,
  });

  factory AttendanceDay.fromJson(Map<String, dynamic> json) =>
      _$AttendanceDayFromJson(json);

  Map<String, dynamic> toJson() => _$AttendanceDayToJson(this);
}

@JsonSerializable()
class ScanRequestBody {
  final String token;
  final String intent;
  @JsonKey(name: 'request_id')
  final String requestId;
  @JsonKey(name: 'device_id')
  final String? deviceId;
  @JsonKey(name: 'gps_lat')
  final double? gpsLat;
  @JsonKey(name: 'gps_lng')
  final double? gpsLng;

  const ScanRequestBody({
    required this.token,
    required this.intent,
    required this.requestId,
    this.deviceId,
    this.gpsLat,
    this.gpsLng,
  });

  factory ScanRequestBody.fromJson(Map<String, dynamic> json) =>
      _$ScanRequestBodyFromJson(json);

  Map<String, dynamic> toJson() => _$ScanRequestBodyToJson(this);
}

@JsonSerializable()
class ScanResponse {
  final AttendanceEvent event;
  @JsonKey(name: 'new_state')
  final String newState;
  final String message;
  @JsonKey(name: 'anomaly_type')
  final String? anomalyType;
  final bool? idempotent;

  const ScanResponse({
    required this.event,
    required this.newState,
    required this.message,
    this.anomalyType,
    this.idempotent,
  });

  factory ScanResponse.fromJson(Map<String, dynamic> json) =>
      _$ScanResponseFromJson(json);

  Map<String, dynamic> toJson() => _$ScanResponseToJson(this);
}

// ── User Absence ─────────────────────────────────────────────────────────────

class UserAbsence {
  final int id;
  final int userId;
  final String absenceDate;
  final String? reason;
  final String? notes;
  final String createdAt;

  const UserAbsence({
    required this.id,
    required this.userId,
    required this.absenceDate,
    this.reason,
    this.notes,
    required this.createdAt,
  });

  factory UserAbsence.fromJson(Map<String, dynamic> json) => UserAbsence(
        id: json['id'] as int,
        userId: json['user_id'] as int,
        absenceDate: json['absence_date'] as String,
        reason: json['reason'] as String?,
        notes: json['notes'] as String?,
        createdAt: json['created_at'] as String,
      );
}

@JsonSerializable()
class OverrideRequestBodyV2 {
  @JsonKey(name: 'requested_action')
  final String requestedAction;
  @JsonKey(name: 'requested_at')
  final String requestedAt;
  final String reason;

  const OverrideRequestBodyV2({
    required this.requestedAction,
    required this.requestedAt,
    required this.reason,
  });

  factory OverrideRequestBodyV2.fromJson(Map<String, dynamic> json) =>
      _$OverrideRequestBodyV2FromJson(json);

  Map<String, dynamic> toJson() => _$OverrideRequestBodyV2ToJson(this);
}

@JsonSerializable()
class OverrideRequestV2 {
  final int id;
  @JsonKey(name: 'company_id')
  final int companyId;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'requested_action')
  final String requestedAction;
  @JsonKey(name: 'requested_at')
  final String requestedAt;
  final String reason;
  final String status;
  @JsonKey(name: 'reviewed_by')
  final int? reviewedBy;
  @JsonKey(name: 'reviewed_at')
  final String? reviewedAt;
  @JsonKey(name: 'review_notes')
  final String? reviewNotes;
  @JsonKey(name: 'resulting_event_id')
  final int? resultingEventId;
  @JsonKey(name: 'created_at')
  final String createdAt;

  const OverrideRequestV2({
    required this.id,
    required this.companyId,
    required this.userId,
    required this.requestedAction,
    required this.requestedAt,
    required this.reason,
    required this.status,
    this.reviewedBy,
    this.reviewedAt,
    this.reviewNotes,
    this.resultingEventId,
    required this.createdAt,
  });

  factory OverrideRequestV2.fromJson(Map<String, dynamic> json) =>
      _$OverrideRequestV2FromJson(json);

  Map<String, dynamic> toJson() => _$OverrideRequestV2ToJson(this);
}
