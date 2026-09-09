import { VehicleBooking } from './vehicle-booking.model';

export interface Job {
  id:                 number;
  company_id:         number;
  client_id?:         number;
  client_name?:       string;
  client_phone?:      string;
  client_email?:      string;
  client_address?:    string;
  title:              string;
  description?:       string;
  address?:           string;
  assigned_to?:       number;
  assigned_to_name?:  string;
  scheduled_date?:    string;
  scheduled_time?:    'morning' | 'afternoon' | 'all_day' | 'custom';
  scheduled_time_custom?: string;
  priority:           'bassa' | 'normale' | 'alta' | 'urgente';
  status:             'aperto' | 'in_corso' | 'completato' | 'annullato';
  product_missing?:   boolean;
  product_missing_note?: string | null;
  movement_count?:    number;
  movements?:         any[];
  vehicle_booking?:   VehicleBooking | null;
  photos?:            JobPhoto[];
  started_at?:        string | null;
  completed_at?:      string | null;
  signed_at?:                  string | null;
  customer_signature_url?:     string | null;
  created_at:         string;
  updated_at:         string;
  required_materials?: { product_id: number; quantity_required: number; product_name?: string; sku?: string }[];
}

export interface JobPhoto {
  id:          number;
  job_id:      number;
  type:        'problem' | 'repair';
  url:         string;
  filename?:   string;
  created_by?: string;
  created_at:  string;
}
