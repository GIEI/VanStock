// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_and_supplier_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DailyReport _$DailyReportFromJson(Map<String, dynamic> json) => DailyReport(
  id: (json['id'] as num).toInt(),
  companyId: (json['company_id'] as num).toInt(),
  userId: (json['user_id'] as num).toInt(),
  userName: json['user_name'] as String?,
  userEmail: json['user_email'] as String?,
  reportDate: json['report_date'] as String,
  notes: json['notes'] as String?,
  createdAt: json['created_at'] as String?,
  jobsCount: (json['jobs_count'] as num?)?.toInt(),
  movementsCount: (json['movements_count'] as num?)?.toInt(),
  jobs: (json['jobs'] as List<dynamic>?)
      ?.map((e) => ReportJob.fromJson(e as Map<String, dynamic>))
      .toList(),
  movementsOther: (json['movements_other'] as List<dynamic>?)
      ?.map((e) => ReportMovement.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$DailyReportToJson(DailyReport instance) =>
    <String, dynamic>{
      'id': instance.id,
      'company_id': instance.companyId,
      'user_id': instance.userId,
      'user_name': instance.userName,
      'user_email': instance.userEmail,
      'report_date': instance.reportDate,
      'notes': instance.notes,
      'created_at': instance.createdAt,
      'jobs_count': instance.jobsCount,
      'movements_count': instance.movementsCount,
      'jobs': instance.jobs,
      'movements_other': instance.movementsOther,
    };

ReportJob _$ReportJobFromJson(Map<String, dynamic> json) => ReportJob(
  id: (json['id'] as num).toInt(),
  title: json['title'] as String,
  status: json['status'] as String,
  address: json['address'] as String?,
  clientName: json['client_name'] as String?,
  completedAt: json['completed_at'] as String?,
  movements: (json['movements'] as List<dynamic>?)
      ?.map((e) => ReportMovement.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$ReportJobToJson(ReportJob instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'status': instance.status,
  'address': instance.address,
  'client_name': instance.clientName,
  'completed_at': instance.completedAt,
  'movements': instance.movements,
};

ReportMovement _$ReportMovementFromJson(Map<String, dynamic> json) =>
    ReportMovement(
      id: (json['id'] as num).toInt(),
      type: json['type'] as String,
      quantity: (json['quantity'] as num).toDouble(),
      notes: json['notes'] as String?,
      productName: json['product_name'] as String,
      unit: json['unit'] as String?,
      fromLocationName: json['from_location_name'] as String?,
      toLocationName: json['to_location_name'] as String?,
    );

Map<String, dynamic> _$ReportMovementToJson(ReportMovement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'quantity': instance.quantity,
      'notes': instance.notes,
      'product_name': instance.productName,
      'unit': instance.unit,
      'from_location_name': instance.fromLocationName,
      'to_location_name': instance.toLocationName,
    };

CreateReportDto _$CreateReportDtoFromJson(Map<String, dynamic> json) =>
    CreateReportDto(
      reportDate: json['report_date'] as String,
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$CreateReportDtoToJson(CreateReportDto instance) =>
    <String, dynamic>{
      'report_date': instance.reportDate,
      'notes': instance.notes,
    };

Supplier _$SupplierFromJson(Map<String, dynamic> json) => Supplier(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  contactName: json['contact_name'] as String?,
  phone: json['phone'] as String?,
  email: json['email'] as String?,
  website: json['website'] as String?,
  address: json['address'] as String?,
  notes: json['notes'] as String?,
  deliveryDays: (json['delivery_days'] as num?)?.toInt(),
  productCount: (json['product_count'] as num?)?.toInt(),
  createdAt: json['created_at'] as String?,
);

Map<String, dynamic> _$SupplierToJson(Supplier instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'contact_name': instance.contactName,
  'phone': instance.phone,
  'email': instance.email,
  'website': instance.website,
  'address': instance.address,
  'notes': instance.notes,
  'delivery_days': instance.deliveryDays,
  'product_count': instance.productCount,
  'created_at': instance.createdAt,
};

CreateSupplierDto _$CreateSupplierDtoFromJson(Map<String, dynamic> json) =>
    CreateSupplierDto(
      name: json['name'] as String,
      contactName: json['contact_name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      website: json['website'] as String?,
      address: json['address'] as String?,
      notes: json['notes'] as String?,
      deliveryDays: (json['delivery_days'] as num?)?.toInt(),
    );

Map<String, dynamic> _$CreateSupplierDtoToJson(CreateSupplierDto instance) =>
    <String, dynamic>{
      'name': instance.name,
      'contact_name': instance.contactName,
      'phone': instance.phone,
      'email': instance.email,
      'website': instance.website,
      'address': instance.address,
      'notes': instance.notes,
      'delivery_days': instance.deliveryDays,
    };

PurchaseOrder _$PurchaseOrderFromJson(Map<String, dynamic> json) =>
    PurchaseOrder(
      id: (json['id'] as num).toInt(),
      supplierId: (json['supplier_id'] as num?)?.toInt(),
      supplierName: json['supplier_name'] as String?,
      status: json['status'] as String,
      notes: json['notes'] as String?,
      orderedAt: json['ordered_at'] as String?,
      receivedAt: json['received_at'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: json['created_at'] as String?,
      itemCount: (json['item_count'] as num?)?.toInt(),
      totalValue: (json['total_value'] as num?)?.toDouble(),
      items: (json['items'] as List<dynamic>?)
          ?.map((e) => PurchaseOrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$PurchaseOrderToJson(PurchaseOrder instance) =>
    <String, dynamic>{
      'id': instance.id,
      'supplier_id': instance.supplierId,
      'supplier_name': instance.supplierName,
      'status': instance.status,
      'notes': instance.notes,
      'ordered_at': instance.orderedAt,
      'received_at': instance.receivedAt,
      'created_by': instance.createdBy,
      'created_at': instance.createdAt,
      'item_count': instance.itemCount,
      'total_value': instance.totalValue,
      'items': instance.items,
    };

PurchaseOrderItem _$PurchaseOrderItemFromJson(Map<String, dynamic> json) =>
    PurchaseOrderItem(
      id: (json['id'] as num).toInt(),
      purchaseOrderId: (json['purchase_order_id'] as num).toInt(),
      productId: (json['product_id'] as num).toInt(),
      productName: json['product_name'] as String?,
      sku: json['sku'] as String?,
      unit: json['unit'] as String?,
      currentQty: (json['current_qty'] as num?)?.toDouble(),
      quantityOrdered: (json['quantity_ordered'] as num).toDouble(),
      quantityReceived: (json['quantity_received'] as num?)?.toDouble(),
      unitPrice: (json['unit_price'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      trackLots: json['track_lots'] as bool? ?? false,
    );

Map<String, dynamic> _$PurchaseOrderItemToJson(PurchaseOrderItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'purchase_order_id': instance.purchaseOrderId,
      'product_id': instance.productId,
      'product_name': instance.productName,
      'sku': instance.sku,
      'unit': instance.unit,
      'current_qty': instance.currentQty,
      'quantity_ordered': instance.quantityOrdered,
      'quantity_received': instance.quantityReceived,
      'unit_price': instance.unitPrice,
      'notes': instance.notes,
      'track_lots': instance.trackLots,
    };

SuggestedProduct _$SuggestedProductFromJson(Map<String, dynamic> json) =>
    SuggestedProduct(
      productId: (json['product_id'] as num).toInt(),
      productName: json['product_name'] as String,
      sku: json['sku'] as String?,
      unit: json['unit'] as String?,
      currentQty: (json['current_qty'] as num).toDouble(),
      minStock: (json['min_stock'] as num).toDouble(),
      qtyToOrder: (json['qty_to_order'] as num).toDouble(),
      supplierId: (json['supplier_id'] as num?)?.toInt(),
      supplierName: json['supplier_name'] as String?,
      purchasePrice: (json['purchase_price'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$SuggestedProductToJson(SuggestedProduct instance) =>
    <String, dynamic>{
      'product_id': instance.productId,
      'product_name': instance.productName,
      'sku': instance.sku,
      'unit': instance.unit,
      'current_qty': instance.currentQty,
      'min_stock': instance.minStock,
      'qty_to_order': instance.qtyToOrder,
      'supplier_id': instance.supplierId,
      'supplier_name': instance.supplierName,
      'purchase_price': instance.purchasePrice,
    };

CreatePurchaseOrderDto _$CreatePurchaseOrderDtoFromJson(
  Map<String, dynamic> json,
) => CreatePurchaseOrderDto(
  supplierId: (json['supplier_id'] as num?)?.toInt(),
  notes: json['notes'] as String?,
  items: (json['items'] as List<dynamic>?)
      ?.map(
        (e) => CreatePurchaseOrderItemDto.fromJson(e as Map<String, dynamic>),
      )
      .toList(),
);

Map<String, dynamic> _$CreatePurchaseOrderDtoToJson(
  CreatePurchaseOrderDto instance,
) => <String, dynamic>{
  'supplier_id': instance.supplierId,
  'notes': instance.notes,
  'items': instance.items,
};

CreatePurchaseOrderItemDto _$CreatePurchaseOrderItemDtoFromJson(
  Map<String, dynamic> json,
) => CreatePurchaseOrderItemDto(
  productId: (json['product_id'] as num).toInt(),
  quantityOrdered: (json['quantity_ordered'] as num).toDouble(),
  unitPrice: (json['unit_price'] as num?)?.toDouble(),
  trackLots: json['track_lots'] as bool? ?? false,
);

Map<String, dynamic> _$CreatePurchaseOrderItemDtoToJson(
  CreatePurchaseOrderItemDto instance,
) => <String, dynamic>{
  'product_id': instance.productId,
  'quantity_ordered': instance.quantityOrdered,
  'unit_price': instance.unitPrice,
  'track_lots': instance.trackLots,
};

LotEntry _$LotEntryFromJson(Map<String, dynamic> json) => LotEntry(
  itemId: (json['item_id'] as num).toInt(),
  batchNumber: json['batch_number'] as String,
  expiryDate: json['expiry_date'] as String?,
);

Map<String, dynamic> _$LotEntryToJson(LotEntry instance) => <String, dynamic>{
  'item_id': instance.itemId,
  'batch_number': instance.batchNumber,
  'expiry_date': instance.expiryDate,
};

ReceiveOrderBody _$ReceiveOrderBodyFromJson(Map<String, dynamic> json) =>
    ReceiveOrderBody(
      locationId: (json['location_id'] as num).toInt(),
      lotEntries:
          (json['lot_entries'] as List<dynamic>?)
              ?.map((e) => LotEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$ReceiveOrderBodyToJson(ReceiveOrderBody instance) =>
    <String, dynamic>{
      'location_id': instance.locationId,
      'lot_entries': instance.lotEntries,
    };
