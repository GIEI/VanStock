import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type PlanType = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'PAST_DUE';

export interface SeatUsage {
  plan_type: PlanType;
  max_seats: number;
  used_seats: number;
  expires_at: string | null;
  status: SubscriptionStatus;
}

export interface SubscriptionRow extends SeatUsage {
  id: number;
  company_id: number;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSubscriptionPayload {
  plan_type?: PlanType;
  max_seats?: number;
  expires_at?: string | null;
  status?: SubscriptionStatus;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  constructor(private api: ApiService) {}

  list(): Observable<SubscriptionRow[]> {
    return this.api.get<SubscriptionRow[]>('/subscriptions');
  }

  me(): Observable<SeatUsage> {
    return this.api.get<SeatUsage>('/subscriptions/me');
  }

  byCompany(companyId: number): Observable<SeatUsage> {
    return this.api.get<SeatUsage>(`/subscriptions/${companyId}`);
  }

  update(companyId: number, payload: UpdateSubscriptionPayload): Observable<SubscriptionRow> {
    return this.api.put<SubscriptionRow>(`/subscriptions/${companyId}`, payload);
  }
}
