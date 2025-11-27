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
  // Gunakan proxy (akan diarahkan ke localhost:8080)
  private baseUrl = '/api/wa';
  
  // Jika proxy tidak jalan, uncomment baris ini:
  // private baseUrl = 'http://localhost:8080/api/wa';

  constructor(private http: HttpClient) {}

  // ==========================
  // SESSION MANAGEMENT
  // ==========================

  /**
   * Start WhatsApp session
   * @returns Observable<any>
   */
  startSession(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/start`, {});
  }

  /**
   * Stop WhatsApp session
   * @returns Observable<any>
   */
  stopSession(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/stop`, {});
  }

  /**
   * Logout dari WhatsApp session
   * @returns Observable<any>
   */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/logout`, {});
  }

  /**
   * Get session status
   * @returns Observable<SessionStatusResponse>
   */
  getStatus(): Observable<SessionStatusResponse> {
    return this.http.get<SessionStatusResponse>(`${this.baseUrl}/session/status`);
  }

  // ==========================
  // QR CODE
  // ==========================

  /**
   * Get QR Code image as Blob
   * @param sessionId - Session ID (default: 'default')
   * @returns Observable<Blob>
   */
  getQrBlob(sessionId: string = 'default'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/session/${sessionId}/qr`, {
      responseType: 'blob'
    });
  }

  /**
   * Get QR Code image as base64 URL untuk ditampilkan di <img>
   * @param sessionId - Session ID (default: 'default')
   * @returns Promise<string> - Data URL (base64)
   */
  async getQrImageUrl(sessionId: string = 'default'): Promise<string> {
    const blob = await this.getQrBlob(sessionId).toPromise();
    if (!blob) {
      throw new Error('Failed to get QR code');
    }
    return URL.createObjectURL(blob);
  }

  /**
   * Get QR Code as base64 string
   * @param sessionId - Session ID (default: 'default')
   * @returns Promise<string> - Base64 string
   */
  async getQrBase64(sessionId: string = 'default'): Promise<string> {
    try {
      const blob = await this.getQrBlob(sessionId).toPromise();
      
      if (!blob) {
        throw new Error('Failed to get QR code - empty response');
      }
      
      // Check if blob is actually an image
      if (!blob.type.startsWith('image/')) {
        console.warn('QR response is not an image:', blob.type);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (!base64 || base64.length < 100) {
            reject(new Error('Invalid QR code data'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read QR code'));
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      console.error('getQrBase64 error:', error);
      throw error;
    }
  }

  // ==========================
  // SEND MESSAGE
  // ==========================

  /**
   * Send text message via WhatsApp
   * @param phone - Phone number (format: 628xxx or 08xxx)
   * @param message - Message text
   * @returns Observable<any>
   */
  sendMessage(phone: string, message: string): Observable<any> {
    const payload: SendMessageRequest = {
      phone: this.formatPhoneNumber(phone),
      message: message
    };
    
    return this.http.post(`${this.baseUrl}/message/send`, payload);
  }

  // ==========================
  // TEST ENDPOINT
  // ==========================

  /**
   * Test endpoint untuk memastikan koneksi ke backend
   * @returns Observable<string>
   */
  test(): Observable<string> {
    return this.http.get(`${this.baseUrl}/test`, { responseType: 'text' });
  }

  // ==========================
  // UTILITY METHODS
  // ==========================

  /**
   * Format phone number ke format internasional
   * @param phone - Phone number
   * @returns Formatted phone number (62xxx)
   */
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

  /**
   * Check if phone number is valid
   * @param phone - Phone number
   * @returns boolean
   */
  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    // Indonesia phone number: 10-13 digits after country code
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}