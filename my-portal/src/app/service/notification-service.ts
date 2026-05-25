import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  Inject,
  PLATFORM_ID,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Messaging, getToken } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly SW_PATH   = '/firebase-messaging-sw.js';
  private readonly TOKEN_KEY = 'fcmToken';

  constructor(
    private http:      HttpClient,
    private messaging: Messaging,
    private injector:  EnvironmentInjector,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  async generateToken(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      if (Notification.permission === 'denied') {
        console.warn('[FCM] Notifications blocked by user.');
        return;
      }

      const permission = await Notification.requestPermission();
      console.log('[FCM] Permission status:', permission);
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission not granted.');
        return;
      }

      // ✅ Step 1: Register the service worker
      const registration = await navigator.serviceWorker.register(this.SW_PATH);
console.log('[FCM] Service Worker registered:', registration);
      // ✅ Step 2: Wait until SW is fully active before calling getToken
      // Without this, PushManager throws AbortError — no active Service Worker
      await navigator.serviceWorker.ready;

      // ✅ Step 3: Wrap Firebase inside injection context (fixes Angular warning)
      const token = await runInInjectionContext(this.injector, () =>
        getToken(this.messaging, {
          vapidKey: environment.vapidKey,
          serviceWorkerRegistration: registration,
        })
      );
console.log('[FCM] Generated Token:', token);
      if (!token) {
        console.warn('[FCM] No token received.');
        return;
      }

      // ✅ Step 4: Skip backend save if token hasn't changed
      if (localStorage.getItem(this.TOKEN_KEY) === token) {
        console.log('[FCM] Token unchanged, skipping save.');
        return;
      }

      // ✅ Step 5: Save to backend — interceptor attaches cookie automatically
      const saved = await this.saveToken(token);
      if (saved) localStorage.setItem(this.TOKEN_KEY, token);

    } catch (error) {
      console.error('[FCM] Token generation failed:', error);
    }
  }

  private async saveToken(token: string): Promise<boolean> {
    try {
      // ✅ No Authorization header needed
      // auth interceptor attaches HttpOnly cookie via withCredentials
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/auth/device-token`,
          { deviceToken: token }
        )
      );
      console.log('[FCM] Token saved to backend.');
      return true;
    } catch (error) {
      console.error('[FCM] Failed to save token:', error);
      return false;
    }
  }
}