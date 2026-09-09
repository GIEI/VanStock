import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WorkShift {
  morning_start:             string; // 'HH:MM'
  morning_end:               string;
  afternoon_start:           string;
  afternoon_end:             string;
  morning_late_threshold:    string;
  afternoon_late_threshold:  string;
}

@Injectable({ providedIn: 'root' })
export class SystemService {
  constructor(private api: ApiService) {}

  getWorkShifts(): Observable<WorkShift> {
    return this.api.get<WorkShift>('/system/work-shifts');
  }

  updateWorkShifts(data: WorkShift): Observable<WorkShift> {
    return this.api.put<WorkShift>('/system/work-shifts', data);
  }
}
