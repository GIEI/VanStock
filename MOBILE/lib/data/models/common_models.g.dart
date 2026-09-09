// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'common_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Client _$ClientFromJson(Map<String, dynamic> json) => Client(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  phone: json['phone'] as String?,
  email: json['email'] as String?,
  address: json['address'] as String?,
  notes: json['notes'] as String?,
  jobCount: (json['job_count'] as num?)?.toInt(),
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$ClientToJson(Client instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'phone': instance.phone,
  'email': instance.email,
  'address': instance.address,
  'notes': instance.notes,
  'job_count': instance.jobCount,
  'created_at': instance.createdAt,
};

CreateClientDto _$CreateClientDtoFromJson(Map<String, dynamic> json) =>
    CreateClientDto(
      name: json['name'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$CreateClientDtoToJson(CreateClientDto instance) =>
    <String, dynamic>{
      'name': instance.name,
      'phone': instance.phone,
      'email': instance.email,
      'address': instance.address,
      'notes': instance.notes,
    };

User _$UserFromJson(Map<String, dynamic> json) => User(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  email: json['email'] as String,
  role: json['role'] as String,
  isActive: json['is_active'] as bool,
);

Map<String, dynamic> _$UserToJson(User instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'email': instance.email,
  'role': instance.role,
  'is_active': instance.isActive,
};

DashboardStats _$DashboardStatsFromJson(Map<String, dynamic> json) =>
    DashboardStats(
      totalProducts: (json['total_products'] as num).toInt(),
      totalItems: (json['total_items'] as num).toDouble(),
      totalValue: (json['total_value'] as num).toDouble(),
      lowStockCount: (json['low_stock_count'] as num).toInt(),
      movementsToday: (json['movements_today'] as num).toInt(),
      totalMovements: (json['total_movements'] as num).toInt(),
      totalLocations: (json['total_locations'] as num).toInt(),
    );

Map<String, dynamic> _$DashboardStatsToJson(DashboardStats instance) =>
    <String, dynamic>{
      'total_products': instance.totalProducts,
      'total_items': instance.totalItems,
      'total_value': instance.totalValue,
      'low_stock_count': instance.lowStockCount,
      'movements_today': instance.movementsToday,
      'total_movements': instance.totalMovements,
      'total_locations': instance.totalLocations,
    };

DashboardAlert _$DashboardAlertFromJson(Map<String, dynamic> json) =>
    DashboardAlert(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      sku: json['sku'] as String?,
      quantity: (json['quantity'] as num).toDouble(),
      minStock: (json['min_stock'] as num?)?.toDouble(),
      locationName: json['location_name'] as String?,
    );

Map<String, dynamic> _$DashboardAlertToJson(DashboardAlert instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'sku': instance.sku,
      'quantity': instance.quantity,
      'min_stock': instance.minStock,
      'location_name': instance.locationName,
    };

ApiError _$ApiErrorFromJson(Map<String, dynamic> json) => ApiError(
  error: json['error'] as String?,
  message: json['message'] as String?,
);

Map<String, dynamic> _$ApiErrorToJson(ApiError instance) => <String, dynamic>{
  'error': instance.error,
  'message': instance.message,
};

PagedResponse<T> _$PagedResponseFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) => PagedResponse<T>(
  data: (json['data'] as List<dynamic>).map(fromJsonT).toList(),
  total: (json['total'] as num).toInt(),
  page: (json['page'] as num).toInt(),
  limit: (json['limit'] as num).toInt(),
);

Map<String, dynamic> _$PagedResponseToJson<T>(
  PagedResponse<T> instance,
  Object? Function(T value) toJsonT,
) => <String, dynamic>{
  'data': instance.data.map(toJsonT).toList(),
  'total': instance.total,
  'page': instance.page,
  'limit': instance.limit,
};
