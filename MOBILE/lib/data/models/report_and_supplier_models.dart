import 'package:json_annotation/json_annotation.dart';

part 'report_and_supplier_models.g.dart';

// ── Daily Report ──────────────────────────────────────────────────────────────

@JsonSerializable()
class DailyReport {
  final int id;
  @JsonKey(name: 'company_id')
  final int companyId;
  @JsonKey(name: 'user_id')
  final int userId;
  @JsonKey(name: 'user_name')
  final String? userName;
  @JsonKey(name: 'user_email')
  final String? userEmail;
  @JsonKey(name: 'report_date')
  final String reportDate;
  final String? notes;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'jobs_count')
  final int? jobsCount;
  @JsonKey(name: 'movements_count')
  final int? movementsCount;
  final List<ReportJob>? jobs;
  @JsonKey(name: 'movements_other')
  final List<ReportMovement>? movementsOther;

  const DailyReport({
    required this.id,
    required this.companyId,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.reportDate,
    required this.notes,
    required this.createdAt,
    required this.jobsCount,
    required this.movementsCount,
    required this.jobs,
    required this.movementsOther,
  });

  factory DailyReport.fromJson(Map<String, dynamic> json) =>
      _$DailyReportFromJson(json);

  Map<String, dynamic> toJson() => _$DailyReportToJson(this);
}

@JsonSerializable()
class ReportJob {
  final int id;
  final String title;
  final String status;
  final String? address;
  @JsonKey(name: 'client_name')
  final String? clientName;
  @JsonKey(name: 'completed_at')
  final String? completedAt;
  final List<ReportMovement>? movements;

  const ReportJob({
    required this.id,
    required this.title,
    required this.status,
    required this.address,
    required this.clientName,
    required this.completedAt,
    required this.movements,
  });

  factory ReportJob.fromJson(Map<String, dynamic> json) =>
      _$ReportJobFromJson(json);

  Map<String, dynamic> toJson() => _$ReportJobToJson(this);
}

@JsonSerializable()
class ReportMovement {
  final int id;
  final String type;
  final double quantity;
  final String? notes;
  @JsonKey(name: 'product_name')
  final String productName;
  final String? unit;
  @JsonKey(name: 'from_location_name')
  final String? fromLocationName;
  @JsonKey(name: 'to_location_name')
  final String? toLocationName;

  const ReportMovement({
    required this.id,
    required this.type,
    required this.quantity,
    required this.notes,
    required this.productName,
    required this.unit,
    required this.fromLocationName,
    required this.toLocationName,
  });

  factory ReportMovement.fromJson(Map<String, dynamic> json) =>
      _$ReportMovementFromJson(json);

  Map<String, dynamic> toJson() => _$ReportMovementToJson(this);
}

@JsonSerializable()
class CreateReportDto {
  @JsonKey(name: 'report_date')
  final String reportDate;
  final String? notes;

  const CreateReportDto({
    required this.reportDate,
    required this.notes,
  });

  factory CreateReportDto.fromJson(Map<String, dynamic> json) =>
      _$CreateReportDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateReportDtoToJson(this);
}

// ── Supplier ──────────────────────────────────────────────────────────────────

@JsonSerializable()
class Supplier {
  final int id;
  final String name;
  @JsonKey(name: 'contact_name')
  final String? contactName;
  final String? phone;
  final String? email;
  final String? website;
  final String? address;
  final String? notes;
  @JsonKey(name: 'delivery_days')
  final int? deliveryDays;
  @JsonKey(name: 'product_count')
  final int? productCount;
  @JsonKey(name: 'created_at')
  final String? createdAt;

  const Supplier({
    required this.id,
    required this.name,
    required this.contactName,
    required this.phone,
    required this.email,
    required this.website,
    required this.address,
    required this.notes,
    required this.deliveryDays,
    required this.productCount,
    required this.createdAt,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) =>
      _$SupplierFromJson(json);

  Map<String, dynamic> toJson() => _$SupplierToJson(this);
}

@JsonSerializable()
class CreateSupplierDto {
  final String name;
  @JsonKey(name: 'contact_name')
  final String? contactName;
  final String? phone;
  final String? email;
  final String? website;
  final String? address;
  final String? notes;
  @JsonKey(name: 'delivery_days')
  final int? deliveryDays;

  const CreateSupplierDto({
    required this.name,
    required this.contactName,
    required this.phone,
    required this.email,
    required this.website,
    required this.address,
    required this.notes,
    required this.deliveryDays,
  });

  factory CreateSupplierDto.fromJson(Map<String, dynamic> json) =>
      _$CreateSupplierDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreateSupplierDtoToJson(this);
}

// ── Purchase Order ────────────────────────────────────────────────────────────

@JsonSerializable()
class PurchaseOrder {
  final int id;
  @JsonKey(name: 'supplier_id')
  final int? supplierId;
  @JsonKey(name: 'supplier_name')
  final String? supplierName;
  final String status;
  final String? notes;
  @JsonKey(name: 'ordered_at')
  final String? orderedAt;
  @JsonKey(name: 'received_at')
  final String? receivedAt;
  @JsonKey(name: 'created_by')
  final String? createdBy;
  @JsonKey(name: 'created_at')
  final String? createdAt;
  @JsonKey(name: 'item_count')
  final int? itemCount;
  @JsonKey(name: 'total_value')
  final double? totalValue;
  final List<PurchaseOrderItem>? items;

  const PurchaseOrder({
    required this.id,
    required this.supplierId,
    required this.supplierName,
    required this.status,
    required this.notes,
    required this.orderedAt,
    required this.receivedAt,
    required this.createdBy,
    required this.createdAt,
    required this.itemCount,
    required this.totalValue,
    required this.items,
  });

  factory PurchaseOrder.fromJson(Map<String, dynamic> json) =>
      _$PurchaseOrderFromJson(json);

  Map<String, dynamic> toJson() => _$PurchaseOrderToJson(this);
}

@JsonSerializable()
class PurchaseOrderItem {
  final int id;
  @JsonKey(name: 'purchase_order_id')
  final int purchaseOrderId;
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String? productName;
  final String? sku;
  final String? unit;
  @JsonKey(name: 'current_qty')
  final double? currentQty;
  @JsonKey(name: 'quantity_ordered')
  final double quantityOrdered;
  @JsonKey(name: 'quantity_received')
  final double? quantityReceived;
  @JsonKey(name: 'unit_price')
  final double? unitPrice;
  final String? notes;
  @JsonKey(name: 'track_lots')
  final bool trackLots;

  const PurchaseOrderItem({
    required this.id,
    required this.purchaseOrderId,
    required this.productId,
    required this.productName,
    required this.sku,
    required this.unit,
    required this.currentQty,
    required this.quantityOrdered,
    required this.quantityReceived,
    required this.unitPrice,
    required this.notes,
    this.trackLots = false,
  });

  factory PurchaseOrderItem.fromJson(Map<String, dynamic> json) =>
      _$PurchaseOrderItemFromJson(json);

  Map<String, dynamic> toJson() => _$PurchaseOrderItemToJson(this);
}

@JsonSerializable()
class SuggestedProduct {
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'product_name')
  final String productName;
  final String? sku;
  final String? unit;
  @JsonKey(name: 'current_qty')
  final double currentQty;
  @JsonKey(name: 'min_stock')
  final double minStock;
  @JsonKey(name: 'qty_to_order')
  final double qtyToOrder;
  @JsonKey(name: 'supplier_id')
  final int? supplierId;
  @JsonKey(name: 'supplier_name')
  final String? supplierName;
  @JsonKey(name: 'purchase_price')
  final double? purchasePrice;

  const SuggestedProduct({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.unit,
    required this.currentQty,
    required this.minStock,
    required this.qtyToOrder,
    required this.supplierId,
    required this.supplierName,
    required this.purchasePrice,
  });

  factory SuggestedProduct.fromJson(Map<String, dynamic> json) =>
      _$SuggestedProductFromJson(json);

  Map<String, dynamic> toJson() => _$SuggestedProductToJson(this);
}

@JsonSerializable()
class CreatePurchaseOrderDto {
  @JsonKey(name: 'supplier_id')
  final int? supplierId;
  final String? notes;
  final List<CreatePurchaseOrderItemDto>? items;

  const CreatePurchaseOrderDto({
    required this.supplierId,
    required this.notes,
    required this.items,
  });

  factory CreatePurchaseOrderDto.fromJson(Map<String, dynamic> json) =>
      _$CreatePurchaseOrderDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreatePurchaseOrderDtoToJson(this);
}

@JsonSerializable()
class CreatePurchaseOrderItemDto {
  @JsonKey(name: 'product_id')
  final int productId;
  @JsonKey(name: 'quantity_ordered')
  final double quantityOrdered;
  @JsonKey(name: 'unit_price')
  final double? unitPrice;
  @JsonKey(name: 'track_lots')
  final bool trackLots;

  const CreatePurchaseOrderItemDto({
    required this.productId,
    required this.quantityOrdered,
    required this.unitPrice,
    this.trackLots = false,
  });

  factory CreatePurchaseOrderItemDto.fromJson(Map<String, dynamic> json) =>
      _$CreatePurchaseOrderItemDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CreatePurchaseOrderItemDtoToJson(this);
}

@JsonSerializable()
class LotEntry {
  @JsonKey(name: 'item_id')
  final int itemId;
  @JsonKey(name: 'batch_number')
  final String batchNumber;
  @JsonKey(name: 'expiry_date')
  final String? expiryDate;

  const LotEntry({
    required this.itemId,
    required this.batchNumber,
    required this.expiryDate,
  });

  factory LotEntry.fromJson(Map<String, dynamic> json) =>
      _$LotEntryFromJson(json);

  Map<String, dynamic> toJson() => _$LotEntryToJson(this);
}

@JsonSerializable()
class ReceiveOrderBody {
  @JsonKey(name: 'location_id')
  final int locationId;
  @JsonKey(name: 'lot_entries')
  final List<LotEntry> lotEntries;

  const ReceiveOrderBody({
    required this.locationId,
    this.lotEntries = const [],
  });

  factory ReceiveOrderBody.fromJson(Map<String, dynamic> json) =>
      _$ReceiveOrderBodyFromJson(json);

  Map<String, dynamic> toJson() => _$ReceiveOrderBodyToJson(this);
}
