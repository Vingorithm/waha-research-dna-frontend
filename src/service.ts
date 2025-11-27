import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WaService {
  constructor(private http: HttpClient) {}

  sendMessage(phone: string, message: string) {
    return this.http.post('/api/wa/message/send', { phone, message });
  }

  startSession() {
    return this.http.post('/api/wa/session/start', {});
  }

  getStatus() {
    return this.http.get('/api/wa/session/status');
  }
}
