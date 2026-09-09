import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { VehicleBooking, CreateVehicleBookingDto } from '../models/vehicle-booking.model';
import { Location } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class VehicleBookingService {
  constructor(private api: ApiService) {}

  list(params?: { date_from?: string; date_to?: string; location_id?: number }): Observable<VehicleBooking[]> {
    return this.api.get<VehicleBooking[]>('/vehicle-bookings', params as any);
  }

  availableVans(date: string, startTime: string, endTime: string): Observable<{ available: Location[]; existing_booking: VehicleBooking | null; must_use_van_id: number | null }> {
    return this.api.get<{ available: Location[]; existing_booking: VehicleBooking | null; must_use_van_id: number | null }>('/vehicle-bookings/available', { date, start_time: startTime, end_time: endTime });
  }

  create(dto: CreateVehicleBookingDto): Observable<VehicleBooking> {
    return this.api.post<VehicleBooking>('/vehicle-bookings', dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/vehicle-bookings/${id}`);
  }
}
