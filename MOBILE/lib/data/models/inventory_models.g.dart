// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inventory_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Location _$LocationFromJson(Map<String, dynamic> json) => Location(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  type: json['type'] as String,
  status: json['status'] as String,
  plate: json['plate'] as String?,
  description: json['description'] as String?,
  productCount: (json['product_count'] as num?)?.toInt(),
  totalItems: (json['total_items'] as num?)?.toDouble(),
  createdAt: json['created_at'] as String?,
  owned: json['owned'] as bool?,
  ownedBookingId: (json['owned_booking_id'] as num?)?.toInt(),
);

Map<String, dynamic> _$LocationToJson(Location instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'type': instance.type,
  'status': instance.status,
  'plate': instance.plate,
  'description': instance.description,
  'product_count': instance.productCount,
  'total_items': instance.totalItems,
  'created_at': instance.createdAt,
  'owned': instance.owned,
  'owned_booking_id': instance.ownedBookingId,
};

CreateLocationDto _$CreateLocationDtoFromJson(Map<String, dynamic> json) =>
    CreateLocationDto(
      name: json['name'] as String,
      type: json['type'] as String,
      status: json['status'] as String? ?? 'disponibile',
      plate: json['plate'] as String?,
      description: json['description'] as String?,
    );

Map<String, dynamic> _$CreateLocationDtoToJson(CreateLocationDto instance) =>
    <String, dynamic>{
      'name': instance.name,
      'type': instance.type,
      'status': instance.status,
      'plate': instance.plate,
      'description': instance.description,
    };

Product _$ProductFromJson(Map<String, dynamic> json) => Product(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  sku: json['sku'] as String?,
  barcode: json['barcode'] as String?,
  description: json['description'] as String?,
  quantity: (json['quantity'] as num).toDouble(),
  unit: json['unit'] as String?,
  minStock: (json['min_stock'] as num?)?.toDouble(),
  locationId: (json['location_id'] as num?)?.toInt(),
  locationName: json['location_name'] as String?,
  locationType: json['location_type'] as String?,
  category: json['category'] as String?,
  photoUrl: json['photo_url'] as String?,
  price: (json['price'] as num?)?.toDouble(),
  notes: json['notes'] as String?,
  createdAt: json['created_at'] as String?,
  stocks: (json['stocks'] as List<dynamic>?)
      ?.map((e) => ProductStock.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$ProductToJson(Product instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'sku': instance.sku,
  'barcode': instance.barcode,
  'description': instance.description,
  'quantity': instance.quantity,
  'unit': instance.unit,
  'min_stock': instance.minStock,
  'location_id': instance.locationId,
  'location_name': instance.locationName,
  'location_type': instance.locationType,
  'category': instance.category,
  'photo_url': instance.photoUrl,
  'price': instance.price,
  'notes': instance.notes,
  'created_at': instance.createdAt,
  'stocks': instance.stocks,
};

ProductStock _$ProductStockFromJson(Map<String, dynamic> json) => ProductStock(
  locationId: (json['location_id'] as num).toInt(),
  locationName: json['location_name'] as String,
  locationType: json['location_type'] as String?,
  quantity: (json['quantity'] as num).toDouble(),
);

Map<String, dynamic> _$ProductStockToJson(ProductStock instance) =>
    <String, dynamic>{
      'location_id': instance.locationId,
      'location_name': instance.locationName,
      'location_type': instance.locationType,
      'quantity': instance.quantity,
    };

Movement _$MovementFromJson(Map<String, dynamic> json) => Movement(
  id: (json['id'] as num).toInt(),
  productId: (json['product_id'] as num).toInt(),
  productName: json['product_name'] as String?,
  sku: json['sku'] as String?,
  unit: json['unit'] as String?,
  type: json['type'] as String,
  quantity: json['quantity'],
  fromLocationId: json['from_location_id'],
  fromLocationName: json['from_location_name'] as String?,
  toLocationId: json['to_location_id'],
  toLocationName: json['to_location_name'] as String?,
  notes: json['notes'] as String?,
  createdBy: json['created_by'] as String?,
  createdAt: json['created_at'] as String?,
  jobTitle: json['job_title'] as String?,
  jobId: json['job_id'],
  purchasePrice: json['purchase_price'],
  batchNumber: json['batch_number'] as String?,
  expiryDate: json['expiry_date'] as String?,
);

Map<String, dynamic> _$MovementToJson(Movement instance) => <String, dynamic>{
  'id': instance.id,
  'product_id': instance.productId,
  'product_name': instance.productName,
  'sku': instance.sku,
  'unit': instance.unit,
  'type': instance.type,
  'quantity': instance.quantity,
  'from_location_id': instance.fromLocationId,
  'from_location_name': instance.fromLocationName,
  'to_location_id': instance.toLocationId,
  'to_location_name': instance.toLocationName,
  'notes': instance.notes,
  'created_by': instance.createdBy,
  'created_at': instance.createdAt,
  'job_title': instance.jobTitle,
  'job_id': instance.jobId,
  'purchase_price': instance.purchasePrice,
  'batch_number': instance.batchNumber,
  'expiry_date': instance.expiryDate,
};

CreateMovementDto _$CreateMovementDtoFromJson(Map<String, dynamic> json) =>
    CreateMovementDto(
      productId: (json['product_id'] as num).toInt(),
      type: json['type'] as String,
      quantity: (json['quantity'] as num).toDouble(),
      fromLocationId: (json['from_location_id'] as num?)?.toInt(),
      toLocationId: (json['to_location_id'] as num?)?.toInt(),
      notes: json['notes'] as String?,
      jobId: (json['job_id'] as num?)?.toInt(),
      createdBy: json['created_by'] as String?,
      purchasePrice: (json['purchase_price'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$CreateMovementDtoToJson(CreateMovementDto instance) =>
    <String, dynamic>{
      'product_id': instance.productId,
      'type': instance.type,
      'quantity': instance.quantity,
      'from_location_id': instance.fromLocationId,
      'to_location_id': instance.toLocationId,
      'notes': instance.notes,
      'job_id': instance.jobId,
      'created_by': instance.createdBy,
      'purchase_price': instance.purchasePrice,
    };
