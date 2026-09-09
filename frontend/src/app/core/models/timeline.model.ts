export interface TimelineTechnician {
  id:   number;
  name: string;
  role: string;
}

export interface TimelineJob {
  id:               number;
  title:            string;
  description?:     string;
  address?:         string;
  status:           'aperto' | 'in_corso' | 'completato' | 'annullato';
  priority:         'bassa' | 'normale' | 'alta' | 'urgente';
  assigned_to?:     number;
  assigned_to_name?: string;
  scheduled_date?:  string;
  scheduled_time?:  string;
  scheduled_time_custom?: string | null;
  started_at?:      string | null;
  completed_at?:    string | null;
  booking_start_time?: string | null;
  booking_end_time?:   string | null;
  client_id?:       number;
  client_name?:     string;
  client_address?:  string;
  client_phone?:    string;
  photo_problem?:   string | null;
  photo_repair?:    string | null;
  material_count:   number;
}

export interface TimelineResponse {
  date_from:   string;
  date_to:     string;
  is_week:     boolean;
  technicians: TimelineTechnician[];
  jobs:        TimelineJob[];
}
