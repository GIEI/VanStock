export type LocationStatus = 'disponibile' | 'occupato' | 'in_manutenzione';

export interface Location {
  id:            number;
  name:          string;
  type:          'warehouse' | 'van' | 'site' | 'other';
  status:        LocationStatus;
  plate?:        string;
  address?:      string;
  description?:  string;
  product_count?: number;
  total_items?:   number;
  created_at:    string;
  updated_at:    string;
  owned?:        boolean;        // True if user already booked this van
  owned_booking_id?: number | null; // ID of existing booking if owned
}
