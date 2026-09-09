export interface VehicleBooking {
  id:             number;
  company_id:     number;
  location_id:    number;
  job_id?:        number;
  date:           string;
  start_time:     string;
  end_time:       string;
  booked_by?:     number;
  notes?:         string;
  created_at:     string;
  // Enriched fields
  van_name?:      string;
  van_plate?:     string;
  job_title?:     string;
  job_address?:   string;
  booked_by_name?: string;
}

export interface CreateVehicleBookingDto {
  location_id: number;
  date:        string;
  start_time:  string;
  end_time:    string;
  job_id?:     number;
  notes?:      string;
}
