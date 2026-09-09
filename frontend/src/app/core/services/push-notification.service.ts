import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  constructor(
    private swPush: SwPush,
    private http:   HttpClient,
    private router: Router,
  ) {}

  get isSupported(): boolean {
    return this.swPush.isEnabled;
  }

  get subscription$() {
    return this.swPush.subscription;
  }

  /** Request permission + subscribe + send sub to backend. Throws on failure. */
  async subscribe(): Promise<void> {
    // Check/request notification permission explicitly before calling swPush
    if (!('Notification' in window)) {
      throw new Error('Il browser non supporta le notifiche');
    }
    if (Notification.permission === 'denied') {
      throw new Error('Permission denied: sblocca le notifiche nelle impostazioni del browser');
    }
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        throw new Error('Permission denied: permesso notifiche non concesso');
      }
    }

    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string }>('/api/push/vapid-public-key')
    );
    const sub     = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
    const subJson = sub.toJSON();
    await firstValueFrom(
      this.http.post('/api/push/subscribe', {
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys!['p256dh'],
        auth:     subJson.keys!['auth'],
      })
    );
  }

  /** Unsubscribe from service worker and remove from backend. */
  async unsubscribe(): Promise<void> {
    const sub = await firstValueFrom(this.swPush.subscription);
    if (sub) {
      const endpoint = sub.endpoint;
      await this.swPush.unsubscribe();
      await firstValueFrom(
        this.http.delete('/api/push/unsubscribe', { body: { endpoint } })
      ).catch(() => {});
    }
  }

  /** Start listening for incoming push messages and handle clicks. */
  listenForMessages(): void {
    this.swPush.messages.subscribe((msg: any) => {
      // Browser shows the notification automatically via the service worker.
      // Nothing to do here unless you want in-app toasts.
    });

    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const url = (notification as any).data?.url ?? '/products';
      this.router.navigateByUrl(url);
    });
  }
}
