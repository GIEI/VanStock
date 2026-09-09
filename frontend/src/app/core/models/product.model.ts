export interface Product {
  id:            number;
  name:          string;
  sku:           string;
  barcode?:      string;
  description?:  string;
  quantity:      number;
  unit:          string;
  min_stock:     number;
  location_id?:  number;
  location_name?: string;
  location_type?: string;
  category?:     string;
  category_id?:  number;
  category_name?: string;
  photo_url?:    string;
  price?:        number;
  notes?:        string;
  created_at:    string;
  updated_at:    string;
  tracks_batches?: boolean;
  movements?:    Movement[];
  stocks?:       ProductStock[];
}

export interface ProductStock {
  quantity:      number;
  location_id:   number;
  location_name: string;
  location_type: string;
}

export interface ProductListResponse {
  data:  Product[];
  total: number;
  page:  number;
  limit: number;
}

export interface Movement {
  id:                  number;
  product_id:          number;
  product_name?:       string;
  sku?:                string;
  unit?:               string;
  type:                'carico' | 'scarico' | 'trasferimento';
  quantity:            number;
  from_location_id?:   number;
  from_location_name?: string;
  to_location_id?:     number;
  to_location_name?:   string;
  notes?:              string;
  created_by?:         string;
  created_at:          string;
  job_title?:          string;
  purchase_price?:     number;
  batch_number?:       string;
  expiry_date?:        string;
}
