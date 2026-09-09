// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) => LoginRequest(
  email: json['email'] as String,
  password: json['password'] as String,
);

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) =>
    <String, dynamic>{'email': instance.email, 'password': instance.password};

LoginResponse _$LoginResponseFromJson(Map<String, dynamic> json) =>
    LoginResponse(
      token: json['token'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LoginResponseToJson(LoginResponse instance) =>
    <String, dynamic>{'token': instance.token, 'user': instance.user};

AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => AuthUser(
  id: (json['id'] as num).toInt(),
  companyId: (json['company_id'] as num).toInt(),
  companyName: json['company_name'] as String?,
  email: json['email'] as String,
  name: json['name'] as String,
  role: json['role'] as String,
  companyLogoUrl: json['company_logo_url'] as String?,
  companyCurrency: json['company_currency'] as String?,
  photoUrl: json['photo_url'] as String?,
  planType: json['plan_type'] as String?,
  features:
      (json['features'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
  resources:
      (json['resources'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
);

Map<String, dynamic> _$AuthUserToJson(AuthUser instance) => <String, dynamic>{
  'id': instance.id,
  'company_id': instance.companyId,
  'company_name': instance.companyName,
  'email': instance.email,
  'name': instance.name,
  'role': instance.role,
  'company_logo_url': instance.companyLogoUrl,
  'company_currency': instance.companyCurrency,
  'photo_url': instance.photoUrl,
  'plan_type': instance.planType,
  'features': instance.features,
  'resources': instance.resources,
};
