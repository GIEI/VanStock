export interface Client {
  id:          number;
  company_id:  number;
  name:        string;
  phone?:      string;
  email?:      string;
  address?:    string;
  notes?:      string;
  job_count?:  number;
  created_at:  string;
  updated_at:  string;
}
