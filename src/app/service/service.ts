import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Interface untuk type safety
export interface SendMessageRequest {
  phone: string;
  message: string;
}

export interface SessionStatusResponse {
  status: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WaService {

  private baseUrl = '/api/wa';

  constructor(private http: HttpClient) {}

  startSession() {
    return this.http.post(this.baseUrl + '/session/start', {});
  }

  stopSession() {
    return this.http.post(this.baseUrl + '/session/stop', {});
  }

  logout() {
    return this.http.post(this.baseUrl + '/session/logout', {});
  }

  getStatus() {
    return this.http.get(this.baseUrl + '/session/status');
  }

  getQrBlob(session = 'default') {
    return this.http.get(`${this.baseUrl}/session/${session}/qr`, {
      responseType: 'blob'
    });
  }

  async getQrImageUrl(session = 'default'): Promise<string> {
    const blob = await this.getQrBlob(session).toPromise();
    return URL.createObjectURL(blob!);
  }

  sendMessage(phone: string, message: string) {
    return this.http.post(this.baseUrl + '/message/send', {
      phone,
      message,
    });
  }

  test() {
    return this.http.get(this.baseUrl + '/test', { responseType: 'text' });
  }

  listenEvents(): EventSource {
    return new EventSource(
      "http://localhost:8080/api/wa/events"
    );
  }

}
