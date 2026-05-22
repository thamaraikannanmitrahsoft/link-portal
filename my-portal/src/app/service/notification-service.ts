import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Messaging, getToken } from '@angular/fire/messaging';
import { environment } from '../../app/environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private http: HttpClient,  private messaging: Messaging) {}

  async generateToken() {


    
    try {
      // Check blocked notifications
      if (Notification.permission === 'denied') {
        console.warn('Notifications blocked');
        return;
      }

      // Ask permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
      
        return;
      }

      // Firebase messaging
   

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: environment.vapidKey,
      });

      if (!token) {
        console.warn('No token received');
        return;
      }

  

      // Save token to backend
      await this.saveToken(token);

    } catch (error) {
      console.error('FCM Error:', error);
    }
  }

  async saveToken(token: string) {

    const authToken = localStorage.getItem('accessToken');

    if (!authToken) {
      console.warn('No access token');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    });

    const payload = {
      deviceToken: token,
    };

    try {

      const response = await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/auth/device-token`,
          payload,
          { headers }
        )
      );

  

    } catch (error) {

      console.error('Save token failed:', error);

    }
  }
}