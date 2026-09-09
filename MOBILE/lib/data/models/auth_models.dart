import 'package:json_annotation/json_annotation.dart';

part 'auth_models.g.dart';

// ── Auth ─────────────────────────────────────────────────────────────────────

@JsonSerializable()
class LoginRequest {
  final String email;
  final String password;

  const LoginRequest({required this.email, required this.password});

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);

  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable()
class LoginResponse {
  final String token;
  final AuthUser user;

  const LoginResponse({required this.token, required this.user});

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);

  Map<String, dynamic> toJson() => _$LoginResponseToJson(this);
}

@JsonSerializable()
class AuthUser {
  final int id;
  @JsonKey(name: 'company_id')
  final int companyId;
  @JsonKey(name: 'company_name')
  final String? companyName;
  final String email;
  final String name;
  final String role;
  @JsonKey(name: 'company_logo_url')
  final String? companyLogoUrl;
  @JsonKey(name: 'company_currency')
  final String? companyCurrency;
  @JsonKey(name: 'photo_url')
  final String? photoUrl;
  @JsonKey(name: 'plan_type')
  final String? planType;
  final List<String> features;
  final List<String> resources;

  const AuthUser({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.email,
    required this.name,
    required this.role,
    required this.companyLogoUrl,
    required this.companyCurrency,
    this.photoUrl,
    this.planType,
    this.features = const [],
    this.resources = const [],
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      _$AuthUserFromJson(json);

  Map<String, dynamic> toJson() => _$AuthUserToJson(this);
}
