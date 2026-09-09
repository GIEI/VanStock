import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TimelineResponse } from '../models/timeline.model';

@Injectable({ providedIn: 'root' })
export class TimelineService {
  constructor(private api: ApiService) {}

  get(params: {
    date?:    string;
    week?:    boolean;
    user_id?: number | null;
  }): Observable<TimelineResponse> {
    const p: Record<string, string | number | boolean> = {};
    if (params.date)    p['date']    = params.date;
    if (params.week)    p['week']    = '1';
    if (params.user_id) p['user_id'] = params.user_id;
    return this.api.get<TimelineResponse>('/timeline', p);
  }
}
