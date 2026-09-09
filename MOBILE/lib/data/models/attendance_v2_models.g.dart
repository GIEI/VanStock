// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'attendance_v2_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AttendanceEvent _$AttendanceEventFromJson(Map<String, dynamic> json) =>
    AttendanceEvent(
      id: (json['id'] as num).toInt(),
      companyId: (json['company_id'] as num).toInt(),
      userId: (json['user_id'] as num).toInt(),
      userName: json['user_name'] as String?,
      occurredAt: json['occurred_at'] as String,
      detectedAction: json['detected_action'] as String,
      resultingState: json['resulting_state'] as String,
      previousState: json['previous_state'] as String,
      source: json['source'] as String,
      status: json['status'] as String,
      anomalyType: json['anomaly_type'] as String?,
      notes: json['notes'] as String?,
      createdBy: (json['created_by'] as num?)?.toInt(),
      createdByName: json['created_by_name'] as String?,
      createdAt: json['created_at'] as String?,
    );

Map<String, dynamic> _$AttendanceEventToJson(AttendanceEvent instance) =>
    <String, dynamic>{
      'id': instance.id,
      'company_id': instance.companyId,
      'user_id': instance.userId,
      'user_name': instance.userName,
      'occurred_at': instance.occurredAt,
      'detected_action': instance.detectedAction,
      'resulting_state': instance.resultingState,
      'previous_state': instance.previousState,
      'source': instance.source,
      'status': instance.status,
      'anomaly_type': instance.anomalyType,
      'notes': instance.notes,
      'created_by': instance.createdBy,
      'created_by_name': instance.createdByName,
      'created_at': instance.createdAt,
    };

UserAttendanceState _$UserAttendanceStateFromJson(Map<String, dynamic> json) =>
    UserAttendanceState(
      currentState: json['current_state'] as String,
      lastEvent: json['last_event'] == null
          ? null
          : AttendanceEvent.fromJson(json['last_event'] as Map<String, dynamic>),
      workedMinutesToday: (json['worked_minutes_today'] as num).toInt(),
      breakMinutesToday: (json['break_minutes_today'] as num).toInt(),
      anomaliesToday: (json['anomalies_today'] as num).toInt(),
      hasOpenAnomalies: json['has_open_anomalies'] as bool,
      validIntents: (json['valid_intents'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$UserAttendanceStateToJson(
        UserAttendanceState instance) =>
    <String, dynamic>{
      'current_state': instance.currentState,
      'last_event': instance.lastEvent?.toJson(),
      'worked_minutes_today': instance.workedMinutesToday,
      'break_minutes_today': instance.breakMinutesToday,
      'anomalies_today': instance.anomaliesToday,
      'has_open_anomalies': instance.hasOpenAnomalies,
      'valid_intents': instance.validIntents,
    };

AttendanceDay _$AttendanceDayFromJson(Map<String, dynamic> json) =>
    AttendanceDay(
      userId: (json['user_id'] as num).toInt(),
      companyId: (json['company_id'] as num).toInt(),
      date: json['date'] as String,
      firstEntry: json['first_entry'] as String?,
      lastExit: json['last_exit'] as String?,
      workedMinutes: (json['worked_minutes'] as num).toInt(),
      breakMinutes: (json['break_minutes'] as num).toInt(),
      anomaliesCount: (json['anomalies_count'] as num).toInt(),
      hasPendingReview: json['has_pending_review'] as bool,
      status: json['status'] as String,
    );

Map<String, dynamic> _$AttendanceDayToJson(AttendanceDay instance) =>
    <String, dynamic>{
      'user_id': instance.userId,
      'company_id': instance.companyId,
      'date': instance.date,
      'first_entry': instance.firstEntry,
      'last_exit': instance.lastExit,
      'worked_minutes': instance.workedMinutes,
      'break_minutes': instance.breakMinutes,
      'anomalies_count': instance.anomaliesCount,
      'has_pending_review': instance.hasPendingReview,
      'status': instance.status,
    };

ScanRequestBody _$ScanRequestBodyFromJson(Map<String, dynamic> json) =>
    ScanRequestBody(
      token: json['token'] as String,
      intent: json['intent'] as String,
      requestId: json['request_id'] as String,
      deviceId: json['device_id'] as String?,
      gpsLat: (json['gps_lat'] as num?)?.toDouble(),
      gpsLng: (json['gps_lng'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$ScanRequestBodyToJson(ScanRequestBody instance) =>
    <String, dynamic>{
      'token': instance.token,
      'intent': instance.intent,
      'request_id': instance.requestId,
      'device_id': instance.deviceId,
      'gps_lat': instance.gpsLat,
      'gps_lng': instance.gpsLng,
    };

ScanResponse _$ScanResponseFromJson(Map<String, dynamic> json) => ScanResponse(
      event: AttendanceEvent.fromJson(json['event'] as Map<String, dynamic>),
      newState: json['new_state'] as String,
      message: json['message'] as String,
      anomalyType: json['anomaly_type'] as String?,
      idempotent: json['idempotent'] as bool?,
    );

Map<String, dynamic> _$ScanResponseToJson(ScanResponse instance) =>
    <String, dynamic>{
      'event': instance.event.toJson(),
      'new_state': instance.newState,
      'message': instance.message,
      'anomaly_type': instance.anomalyType,
      'idempotent': instance.idempotent,
    };

OverrideRequestBodyV2 _$OverrideRequestBodyV2FromJson(
        Map<String, dynamic> json) =>
    OverrideRequestBodyV2(
      requestedAction: json['requested_action'] as String,
      requestedAt: json['requested_at'] as String,
      reason: json['reason'] as String,
    );

Map<String, dynamic> _$OverrideRequestBodyV2ToJson(
        OverrideRequestBodyV2 instance) =>
    <String, dynamic>{
      'requested_action': instance.requestedAction,
      'requested_at': instance.requestedAt,
      'reason': instance.reason,
    };

OverrideRequestV2 _$OverrideRequestV2FromJson(Map<String, dynamic> json) =>
    OverrideRequestV2(
      id: (json['id'] as num).toInt(),
      companyId: (json['company_id'] as num).toInt(),
      userId: (json['user_id'] as num).toInt(),
      requestedAction: json['requested_action'] as String,
      requestedAt: json['requested_at'] as String,
      reason: json['reason'] as String,
      status: json['status'] as String,
      reviewedBy: (json['reviewed_by'] as num?)?.toInt(),
      reviewedAt: json['reviewed_at'] as String?,
      reviewNotes: json['review_notes'] as String?,
      resultingEventId: (json['resulting_event_id'] as num?)?.toInt(),
      createdAt: json['created_at'] as String,
    );

Map<String, dynamic> _$OverrideRequestV2ToJson(OverrideRequestV2 instance) =>
    <String, dynamic>{
      'id': instance.id,
      'company_id': instance.companyId,
      'user_id': instance.userId,
      'requested_action': instance.requestedAction,
      'requested_at': instance.requestedAt,
      'reason': instance.reason,
      'status': instance.status,
      'reviewed_by': instance.reviewedBy,
      'reviewed_at': instance.reviewedAt,
      'review_notes': instance.reviewNotes,
      'resulting_event_id': instance.resultingEventId,
      'created_at': instance.createdAt,
    };
