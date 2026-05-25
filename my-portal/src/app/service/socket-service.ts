import { Injectable } from "@angular/core";
import { io, Socket }            from 'socket.io-client';
import { Observable }            from 'rxjs';
import { environment }           from '../environments/environment';
@Injectable({
  providedIn: "root",
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.socketUrl, {
      auth:       { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () =>
      console.log('[Socket] connected:', this.socket.id)
  );

    this.socket.on('disconnect', reason =>
      console.warn('[Socket] disconnected:', reason));

    this.socket.on('connect_error', err =>
      console.error('[Socket] error:', err.message));
  }

  emit(event: string, data?: any): void {
    this.socket.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
      return () => this.socket.off(event);
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
