export type PurchaseOrderStatus = 'bozza' | 'inviato' | 'ricevuto';

export interface PurchaseOrderItem {
  id:                number;
  purchase_order_id: number;
  product_id:        number;
  product_name:      string;
  sku?:              string;
  unit:              string;
  current_qty:       number;
  quantity_ordered:  number;
  quantity_received?: number;
  unit_price?:       number;
  notes?:            string;
  track_lots?:       boolean;
}

export interface LotEntry {
  item_id:      number;
  batch_number: string;
  expiry_date:  string | null;
}

export interface PurchaseOrder {
  id:               number;
  company_id:       number;
  supplier_id?:     number;
  supplier_name?:   string;
  supplier_email?:  string;
  supplier_phone?:  string;
  supplier_contact?: string;
  status:           PurchaseOrderStatus;
  notes?:           string;
  ordered_at?:      string;
  received_at?:     string;
  created_by?:      string;
  created_at:       string;
  updated_at:       string;
  item_count?:      number;
  total_value?:     number;
  items?:           PurchaseOrderItem[];
}

export interface SuggestedProduct {
  product_id:    number;
  product_name:  string;
  sku?:          string;
  unit:          string;
  current_qty:   number;
  min_stock:     number;
  qty_to_order:  number;
  supplier_id?:  number;
  supplier_name?: string;
  purchase_price?: number;
  delivery_days?:  number;
}
