import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  // Gunakan proxy (akan diarahkan ke localhost:8080)
  private baseUrl = '/api/wa';
  

  constructor(private http: HttpClient) {}

  startSession(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/start`, {});
  }

  stopSession(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/stop`, {});
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/logout`, {});
  }

  getStatus(): Observable<SessionStatusResponse> {
    return this.http.get<SessionStatusResponse>(`${this.baseUrl}/session/status`);
  }

  getQrBlob(sessionId: string = 'default'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/session/${sessionId}/qr`, {
      responseType: 'blob'
    });
  }

  async getQrImageUrl(sessionId: string = 'default'): Promise<string> {
    const blob = await this.getQrBlob(sessionId).toPromise();
    return URL.createObjectURL(blob!);
  }

  sendMessage(phone: string, message: string): Observable<any> {
    const payload: SendMessageRequest = {
      phone: this.formatPhoneNumber(phone),
      message: message
    };
    
    return this.http.post(`${this.baseUrl}/message/send`, payload);
  }

  test(): Observable<string> {
    return this.http.get(`${this.baseUrl}/test`, { responseType: 'text' });
  }


  private formatPhoneNumber(phone: string): string {
    // Hapus semua karakter non-digit
    let cleaned = phone.replace(/\D/g, '');

    // Jika diawali 0, ganti dengan 62
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }

    // Jika belum diawali 62, tambahkan
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    return cleaned;
  }

  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}