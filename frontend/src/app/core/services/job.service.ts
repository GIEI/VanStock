import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Job, JobPhoto } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobService {
  constructor(private api: ApiService) {}

  list(filters?: { status?: string; client_id?: number; assigned_to?: number; date_from?: string; date_to?: string; product_missing?: boolean }): Observable<Job[]> {
    const params: Record<string, string | number> = {};
    if (filters?.status)           params['status']           = filters.status;
    if (filters?.client_id)        params['client_id']        = filters.client_id;
    if (filters?.assigned_to)      params['assigned_to']      = filters.assigned_to;
    if (filters?.date_from)        params['date_from']        = filters.date_from;
    if (filters?.date_to)          params['date_to']          = filters.date_to;
    if (filters?.product_missing)  params['product_missing']  = 'true';
    return this.api.get<Job[]>('/jobs', params);
  }

  get(id: number): Observable<Job> {
    return this.api.get<Job>(`/jobs/${id}`);
  }

  create(data: Partial<Job>): Observable<Job> {
    return this.api.post<Job>('/jobs', data);
  }

  update(id: number, data: Partial<Job>): Observable<Job> {
    return this.api.put<Job>(`/jobs/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/jobs/${id}`);
  }

  my(): Observable<Job[]> {
    return this.api.get<Job[]>('/jobs/my');
  }

  start(id: number): Observable<Job> {
    return this.api.patch<Job>(`/jobs/${id}/start`, {});
  }

  uploadPhoto(id: number, file: File, type: 'problem' | 'repair'): Observable<JobPhoto> {
    const fd = new FormData();
    fd.append('photo', file);
    return this.api.postFormData<JobPhoto>(`/jobs/${id}/photos?type=${type}`, fd);
  }

  deletePhoto(jobId: number, photoId: number): Observable<void> {
    return this.api.delete<void>(`/jobs/${jobId}/photos/${photoId}`);
  }

  setStatus(id: number, status: Job['status'], vehicleId?: number, vehicleStartTime?: string, vehicleEndTime?: string): Observable<Job> {
    return this.api.patch<Job>(`/jobs/${id}/status`, {
      status,
      ...(vehicleId        ? { vehicle_id:        vehicleId }        : {}),
      ...(vehicleStartTime ? { vehicle_start_time: vehicleStartTime } : {}),
      ...(vehicleEndTime   ? { vehicle_end_time:   vehicleEndTime }   : {}),
    });
  }

  clearProductMissing(id: number): Observable<Job> {
    return this.api.patch<Job>(`/jobs/${id}/clear-product-missing`, {});
  }

  sign(id: number, signature: string): Observable<Job> {
    return this.api.post<Job>(`/jobs/${id}/sign`, { signature });
  }

  getReportBlob(id: number): Observable<Blob> {
    return this.api.getBlob(`/jobs/${id}/report`);
  }

  // ── Messages (Chat) ────────────────────────────────────────────────────────

  getMessages(jobId: number): Observable<any[]> {
    return this.api.get<any[]>(`/jobs/${jobId}/messages`);
  }

  sendMessage(jobId: number, content: string): Observable<any> {
    return this.api.post<any>(`/jobs/${jobId}/messages`, { content });
  }

  sendAudioMessage(jobId: number, blob: Blob, duration: number): Observable<any> {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('duration', duration.toString());
    return this.api.postFormData<any>(`/jobs/${jobId}/messages/audio`, formData);
  }

  getReportUrl(id: number): string {
    return `${this.api.getBaseUrl()}/jobs/${id}/report`;
  }

  getGeolocationData(id: number): Observable<any> {
    return this.api.get<any>(`/jobs/${id}/geolocation`);
  }
}
