import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { AppNotification } from '../models/notification.model';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private api: ApiService) {}

  startPolling(): void {
    if (this.pollSub) return;
    this.refresh();
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => this.refresh());
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  refresh(): void {
    this.api.get<AppNotification[]>('/notifications').subscribe({
      next: list => this.notificationsSubject.next(list),
      error: () => {},
    });
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: res => this.unreadCountSubject.next(res.count),
      error: () => {},
    });
  }

  markAsRead(id: number): void {
    this.api.patch<AppNotification>(`/notifications/${id}/read`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map(n =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        );
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
      },
      error: () => {},
    });
  }

  markAllAsRead(): void {
    this.api.patch<{ ok: boolean }>('/notifications/read-all', {}).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const updated = this.notificationsSubject.value.map(n => ({ ...n, read_at: n.read_at ?? now }));
        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(0);
      },
      error: () => {},
    });
  }

  deleteNotification(id: number): void {
    this.api.delete<{ ok: boolean }>(`/notifications/${id}`).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(updated);
      },
      error: () => {},
    });
  }
}
