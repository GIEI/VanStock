export interface DailyReport {
  id: number;
  company_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  report_date: string;
  notes: string | null;
  created_at: string;
  jobs_count?: number;
  movements_count?: number;
  // Snapshot congelato al momento dell'invio
  jobs?: ReportJob[];
  movements_other?: ReportMovement[];
}

export interface ReportJob {
  id: number;
  title: string;
  status: string;
  address: string | null;
  client_name: string | null;
  completed_at: string | null;
  movements?: ReportMovement[];
}

export interface ReportMovement {
  id: number;
  type: string;
  quantity: number;
  notes: string | null;
  product_name: string;
  unit: string | null;
  from_location_name: string | null;
  to_location_name: string | null;
}
