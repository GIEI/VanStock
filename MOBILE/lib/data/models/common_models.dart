import 'package:json_annotation/json_annotation.dart';

part 'common_models.g.dart';

// ── Client ────────────────────────────────────────────────────────────────────

@JsonSerializable()
class Client {
  final int id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;
  @JsonKey(name: 'job_count')
  final int? jobCount;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  const Client({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    required this.notes,
    required this.jobCount,
    required this.createdAt,
  });

  factory Client.fromJson(Map<String, dynamic> json) => _$ClientFromJson(json);

  Map<String, dynamic> toJson() => _$ClientToJson(this);
}

@JsonSerializable()
class CreateClientDto {
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;

  const CreateClientDto({
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
    required this.notes,
  });

  factory CreateClientDto.fromJson(Map<String, dynamic> json) =>
      _$CreateClientDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateClientDtoToJson(this);
}

// ── User ──────────────────────────────────────────────────────────────────────

@JsonSerializable()
class User {
  final int id;
  final String name;
  final String email;
  final String role;
  @JsonKey(name: 'is_active')
  final bool isActive;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);

  Map<String, dynamic> toJson() => _$UserToJson(this);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

@JsonSerializable()
class DashboardStats {
  @JsonKey(name: 'total_products')
  final int totalProducts;
  @JsonKey(name: 'total_items')
  final double totalItems;
  @JsonKey(name: 'total_value')
  final double totalValue;
  @JsonKey(name: 'low_stock_count')
  final int lowStockCount;
  @JsonKey(name: 'movements_today')
  final int movementsToday;
  @JsonKey(name: 'total_movements')
  final int totalMovements;
  @JsonKey(name: 'total_locations')
  final int totalLocations;

  const DashboardStats({
    required this.totalProducts,
    required this.totalItems,
    required this.totalValue,
    required this.lowStockCount,
    required this.movementsToday,
    required this.totalMovements,
    required this.totalLocations,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) =>
      _$DashboardStatsFromJson(json);

  Map<String, dynamic> toJson() => _$DashboardStatsToJson(this);
}

@JsonSerializable()
class DashboardAlert {
  final int id;
  final String name;
  final String? sku;
  final double quantity;
  @JsonKey(name: 'min_stock')
  final double? minStock;
  @JsonKey(name: 'location_name')
  final String? locationName;

  const DashboardAlert({
    required this.id,
    required this.name,
    required this.sku,
    required this.quantity,
    required this.minStock,
    required this.locationName,
  });

  factory DashboardAlert.fromJson(Map<String, dynamic> json) =>
      _$DashboardAlertFromJson(json);

  Map<String, dynamic> toJson() => _$DashboardAlertToJson(this);
}

// ── Error ─────────────────────────────────────────────────────────────────────

@JsonSerializable()
class ApiError {
  final String? error;
  final String? message;

  const ApiError({
    required this.error,
    required this.message,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) =>
      _$ApiErrorFromJson(json);

  Map<String, dynamic> toJson() => _$ApiErrorToJson(this);
}

// ── Pagination ────────────────────────────────────────────────────────────────

@JsonSerializable(genericArgumentFactories: true)
class PagedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int limit;

  const PagedResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory PagedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) =>
      _$PagedResponseFromJson(json, fromJsonT);

  Map<String, dynamic> toJson(Object? Function(T) toJsonT) =>
      _$PagedResponseToJson(this, toJsonT);
}
