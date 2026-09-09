export interface Supplier {
  id:            number;
  company_id:    number;
  name:          string;
  contact_name?: string;
  phone?:        string;
  email?:        string;
  website?:      string;
  address?:      string;
  notes?:        string;
  delivery_days?: number;
  product_count?: number;
  created_at:    string;
  updated_at:    string;
}
