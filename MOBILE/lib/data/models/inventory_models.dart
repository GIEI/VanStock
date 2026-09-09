import 'package:json_annotation/json_annotation.dart';
import '../../core/constants/app_constants.dart';

part 'inventory_models.g.dart';

// Helper functions for robust parsing
double _toDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}

double? _toOptionalDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

String? _toString(dynamic value) {
  if (value == null) return null;
  return value.toString();
}

int _toInt(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? 0;
}

int? _toOptionalInt(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

// ── Location ──────────────────────────────────────────────────────────────────

@JsonSerializable()
class Location {
  final int id;
  final String name;
  final String type;
  final String status;
  final String? plate;
  final String? description;
  @JsonKey(name: 'product_count')
  final int? productCount;
  @JsonKey(name: 'total_items')
  final double? totalItems;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  final bool? owned;
  @JsonKey(name: 'owned_booking_id')
  final int? ownedBookingId;
  @JsonKey(name: 'is_stock_sufficient')
  final bool? isStockSufficient;
  @JsonKey(name: 'missing_materials')
  final List<MissingMaterial> missingMaterials;

  const Location({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.plate,
    required this.description,
    required this.productCount,
    required this.totalItems,
    required this.createdAt,
    required this.owned,
    required this.ownedBookingId,
    this.isStockSufficient,
    this.missingMaterials = const [],
  });

  factory Location.fromJson(Map<String, dynamic> json) => Location(
    id: _toInt(json['id']),
    name: _toString(json['name']) ?? '',
    type: _toString(json['type']) ?? '',
    status: _toString(json['status']) ?? '',
    plate: _toString(json['plate']),
    description: _toString(json['description']),
    productCount: _toOptionalInt(json['product_count']),
    totalItems: _toOptionalDouble(json['total_items']),
    createdAt: _toString(json['created_at']),
    owned: json['owned'] as bool? ?? false,
    ownedBookingId: _toOptionalInt(json['owned_booking_id']),
    isStockSufficient: json['is_stock_sufficient'] as bool?,
    missingMaterials: (json['missing_materials'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(MissingMaterial.fromJson)
        .toList(),
  );

  Map<String, dynamic> toJson() => {
    ..._$LocationToJson(this),
    'is_stock_sufficient': isStockSufficient,
    'missing_materials': missingMaterials.map((item) => item.toJson()).toList(),
  };
}

class MissingMaterial {
  final int productId;
  final String productName;
  final String? sku;
  final String? unit;
  final double quantityRequired;
  final double quantityAvailable;
  final double quantityMissing;

  const MissingMaterial({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.unit,
    required this.quantityRequired,
    required this.quantityAvailable,
    required this.quantityMissing,
  });

  factory MissingMaterial.fromJson(Map<String, dynamic> json) =>
      MissingMaterial(
        productId: _toInt(json['product_id']),
        productName: _toString(json['product_name']) ?? '',
        sku: _toString(json['sku']),
        unit: _toString(json['unit']),
        quantityRequired: _toDouble(json['quantity_required']),
        quantityAvailable: _toDouble(json['quantity_available']),
        quantityMissing: _toDouble(json['quantity_missing']),
      );

  Map<String, dynamic> toJson() => {
    'product_id': productId,
    'product_name': productName,
    'sku': sku,
    'unit': unit,
    'quantity_required': quantityRequired,
    'quantity_available': quantityAvailable,
    'quantity_missing': quantityMissing,
  };
}

@JsonSerializable()
class CreateLocationDto {
  final String name;
  final String type;
  final String status;
  final String? plate;
  final String? description;

  const CreateLocationDto({
    required this.name,
    required this.type,
    this.status = 'disponibile',
    required this.plate,
    required this.description,
  });

  factory CreateLocationDto.fromJson(Map<String, dynamic> json) =>
      _$CreateLocationDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateLocationDtoToJson(this);
}

// ── Product ───────────────────────────────────────────────────────────────────

@JsonSerializable()
class Product {
  final int id;
  final String name;
  final String? sku;
  final String? barcode;
  final String? description;
  final double quantity;
  final String? unit;
  @JsonKey(name: 'min_stock')
  final double? minStock;
  @JsonKey(name: 'location_id')
  final int? locationId;
  @JsonKey(name: 'location_name')
  final String? locationName;
  @JsonKey(name: 'location_type')
  final String? locationType;
  final String? category;
  @JsonKey(name: 'photo_url')
  final String? photoUrl;
  final double? price;
  final String? notes;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  final List<ProductStock>? stocks;

  const Product({
    required this.id,
    required this.name,
    required this.sku,
    required this.barcode,
    required this.description,
    required this.quantity,
    required this.unit,
    required this.minStock,
    required this.locationId,
    required this.locationName,
    required this.locationType,
    required this.category,
    required this.photoUrl,
    required this.price,
    required this.notes,
    required this.createdAt,
    required this.stocks,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: _toInt(json['id']),
    name: _toString(json['name']) ?? '',
    sku: _toString(json['sku']),
    barcode: _toString(json['barcode']),
    description: _toString(json['description']),
    quantity: _toDouble(json['quantity']),
    unit: _toString(json['unit']),
    minStock: _toOptionalDouble(json['min_stock']),
    locationId: _toOptionalInt(json['location_id']),
    locationName: _toString(json['location_name']),
    locationType: _toString(json['location_type']),
    category: _toString(json['category']),
    photoUrl: _toString(json['photo_url']),
    price: _toOptionalDouble(json['price']),
    notes: _toString(json['notes']),
    createdAt: _toString(json['created_at']),
    stocks: (json['stocks'] as List<dynamic>?)
        ?.map((e) => ProductStock.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  Map<String, dynamic> toJson() => _$ProductToJson(this);

  String? get fullPhotoUrl {
    if (photoUrl == null || photoUrl!.isEmpty) return null;
    if (photoUrl!.startsWith('http')) return photoUrl;
    // Costruisci l'URL completo dal path relativo
    return '${AppConstants.baseUrl.replaceFirst('/api', '')}$photoUrl';
  }

  /// Lazily generated 300x300 webp thumbnail served by the backend.
  /// Used in lists/grids to avoid downloading full-resolution images.
  String? get thumbPhotoUrl {
    final full = fullPhotoUrl;
    if (full == null) return null;
    // Transform /uploads/<file> → /uploads/thumb/<file>
    return full.replaceFirst('/uploads/', '/uploads/thumb/');
  }
}

@JsonSerializable()
class ProductStock {
  @JsonKey(name: 'location_id')
  final int locationId;
  @JsonKey(name: 'location_name')
  final String locationName;
  @JsonKey(name: 'location_type')
  final String? locationType;
  final double quantity;

  const ProductStock({
    required this.locationId,
    required this.locationName,
    required this.locationType,
    required this.quantity,
  });

  factory ProductStock.fromJson(Map<String, dynamic> json) => ProductStock(
    locationId: _toInt(json['location_id']),
    locationName: _toString(json['location_name']) ?? '',
    locationType: _toString(json['location_type']),
    quantity: _toDouble(json['quantity']),
  );

  Map<String, dynamic> toJson() => _$ProductStockToJson(this);
}

// ── Movement ──────────────────────────────────────────────────────────────────

@JsonSerializable()
class Movement {
  final int id;
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String? productName;
  final String? sku;
  final String? unit;
  final String type;
  final dynamic quantity;
  @JsonKey(name: 'from_location_id')
  final dynamic fromLocationId;
  @JsonKey(name: 'from_location_name')
  final String? fromLocationName;
  @JsonKey(name: 'to_location_id')
  final dynamic toLocationId;
  @JsonKey(name: 'to_location_name')
  final String? toLocationName;
  final String? notes;
  @JsonKey(name: 'created_by')
  final String? createdBy;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'job_title')
  final String? jobTitle;
  @JsonKey(name: 'job_id')
  final dynamic jobId;
  @JsonKey(name: 'purchase_price')
  final dynamic purchasePrice;
  @JsonKey(name: 'batch_number')
  final String? batchNumber;
  @JsonKey(name: 'expiry_date')
  final String? expiryDate;

  const Movement({
    required this.id,
    required this.productId,
    required this.productName,
    required this.sku,
    required this.unit,
    required this.type,
    required this.quantity,
    required this.fromLocationId,
    required this.fromLocationName,
    required this.toLocationId,
    required this.toLocationName,
    required this.notes,
    required this.createdBy,
    required this.createdAt,
    required this.jobTitle,
    required this.jobId,
    required this.purchasePrice,
    this.batchNumber,
    this.expiryDate,
  });

  factory Movement.fromJson(Map<String, dynamic> json) => Movement(
    id: _toInt(json['id']),
    productId: _toInt(json['product_id']),
    productName: _toString(json['product_name']),
    sku: _toString(json['sku']),
    unit: _toString(json['unit']),
    type: _toString(json['type']) ?? '',
    quantity: _toDouble(json['quantity']),
    fromLocationId: _toInt(json['from_location_id']),
    fromLocationName: _toString(json['from_location_name']),
    toLocationId: _toInt(json['to_location_id']),
    toLocationName: _toString(json['to_location_name']),
    notes: _toString(json['notes']),
    createdBy: _toString(json['created_by']),
    createdAt: _toString(json['created_at']),
    jobTitle: _toString(json['job_title']),
    jobId: _toInt(json['job_id']),
    purchasePrice: _toDouble(json['purchase_price']),
    batchNumber: _toString(json['batch_number']),
    expiryDate: _toString(json['expiry_date']),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'product_id': productId,
    'product_name': productName,
    'sku': sku,
    'unit': unit,
    'type': type,
    'quantity': quantity,
    'from_location_id': fromLocationId,
    'from_location_name': fromLocationName,
    'to_location_id': toLocationId,
    'to_location_name': toLocationName,
    'notes': notes,
    'created_by': createdBy,
    'created_at': createdAt,
    'job_title': jobTitle,
    'job_id': jobId,
    'purchase_price': purchasePrice,
    'batch_number': batchNumber,
    'expiry_date': expiryDate,
  };
}

@JsonSerializable()
class CreateMovementDto {
  @JsonKey(name: 'product_id')
  final int productId;
  final String type;
  final double quantity;
  @JsonKey(name: 'from_location_id')
  final int? fromLocationId;
  @JsonKey(name: 'to_location_id')
  final int? toLocationId;
  final String? notes;
  @JsonKey(name: 'job_id')
  final int? jobId;
  @JsonKey(name: 'created_by')
  final String? createdBy;
  @JsonKey(name: 'purchase_price')
  final double? purchasePrice;

  const CreateMovementDto({
    required this.productId,
    required this.type,
    required this.quantity,
    required this.fromLocationId,
    required this.toLocationId,
    required this.notes,
    required this.jobId,
    required this.createdBy,
    required this.purchasePrice,
  });

  factory CreateMovementDto.fromJson(Map<String, dynamic> json) =>
      CreateMovementDto(
        productId: _toInt(json['product_id']),
        type: _toString(json['type']) ?? '',
        quantity: _toDouble(json['quantity']),
        fromLocationId: _toInt(json['from_location_id']),
        toLocationId: _toInt(json['to_location_id']),
        notes: _toString(json['notes']),
        jobId: _toInt(json['job_id']),
        createdBy: _toString(json['created_by']),
        purchasePrice: _toDouble(json['purchase_price']),
      );

  Map<String, dynamic> toJson() => {
    'product_id': productId,
    'type': type,
    'quantity': quantity,
    'from_location_id': fromLocationId,
    'to_location_id': toLocationId,
    'notes': notes,
    'job_id': jobId,
    'created_by': createdBy,
    'purchase_price': purchasePrice,
  };
}
