// src/app/app.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaService } from './service/service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { AppStore } from './state/app.store';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  phoneNumber = '';
  message = '';
  title = 'WAHA WhatsApp Sender';

  responseMessage = '';
  responseType: 'success' | 'error' | '' = '';
  qrCodeUrl: SafeUrl | null = null;
  showQrCode = false;

  isLoading = false;
  sessionStatus = 'Checking...';
  pollingSub?: Subscription | null = null;

  qrRefreshInterval: any = null;
  statusPollingInterval: any = null;

  private subs: Subscription[] = [];

  constructor(
    private store: AppStore,
    private waService: WaService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
  }

  ngOnInit() {
    this.subs.push(this.store.isLoading$.subscribe((v: boolean) => (this.isLoading = v)));
    this.subs.push(this.store.sessionStatus$.subscribe((v: string) => (this.sessionStatus = v)));
    this.subs.push(this.store.showQrCode$.subscribe((v: boolean) => (this.showQrCode = v)));
    this.subs.push(this.store.qrCodeUrl$.subscribe((u: string | SafeUrl | null) => {
      this.qrCodeUrl = u as SafeUrl | null;
    }));
    this.subs.push(this.store.responseMessage$.subscribe((v: string) => (this.responseMessage = v)));
    this.subs.push(this.store.responseType$.subscribe((t: 'success' | 'error' | '') => (this.responseType = t)));

    this.checkSessionStatus();
    this.testConnection();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.checkLoginStatus(), 1000);
    }
  }


  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());

    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
      this.qrRefreshInterval = null;
    }
  }


  checkLoginStatus(): void {
    this.statusPollingInterval = setInterval(() => {
      console.log('Polling session status...');
      this.checkSessionStatus();
      if (this.store.snapshot().sessionStatus === 'WORKING') {
        console.log('Session is now WORKING. Polling stopped.');
        clearInterval(this.statusPollingInterval);
        this.showQrCode = false;
      }
    }, 3000);
  }

  testConnection() {
    this.waService.test().subscribe({
      next: (response) => console.log('Backend connection:', response),
      error: (error) => console.error('Backend connection failed:', error),
    });
  }

  checkSessionStatus() {
    this.waService.getStatus().subscribe({
      next: (resp: any) => {
        const status = resp?.[0]?.status ?? 'Disconnected';
        this.store.setSessionStatus(status);
      },
      error: (err) => {
        console.error('Status check error:', err);
        this.store.setSessionStatus('Disconnected');
      }
    });
  }

  loadQrCodeClick() {
    setTimeout(() => {
      this.checkSessionStatus();
      if (isPlatformBrowser(this.platformId)) {
        this.loadQrCode();
      }

      // lakukan auto refresh setiap 30s
      if (this.qrRefreshInterval) {
        clearInterval(this.qrRefreshInterval);
      }
      this.qrRefreshInterval = setInterval(() => {
        const snap = this.store.snapshot();
        if (snap.sessionStatus === "SCAN_QR_CODE" && !snap.isLoading) {
          console.log('Auto-refreshing QR code...');
          this.loadQrCode();
        }
      }, 30000);


    }, 3000);
  }

  async loadQrCode(sessionId: string = 'default') {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('QR code loaded successfully.');
      return;
    }

    this.store.setLoading(true);
    this.store.hideQr();
    this.qrCodeUrl = null;
    this.showQrCode = false;

    try {
      const raw: any = await this.waService.getQrImageUrl(sessionId);
      console.log('QR raw (first 120 chars):', typeof raw === 'string' ? raw.slice(0, 120) : raw);

      let finalUrl: string | SafeUrl | null = null;

      if (raw instanceof Blob) {
        finalUrl = await this.blobToDataUrl(raw);
      } else if (typeof raw === 'string') {
        const trimmed = raw.trim();

        if (trimmed.startsWith('data:')) {
          finalUrl = trimmed;
        }
        else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          finalUrl = trimmed;
        }
        else if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
          finalUrl = `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`;
        } else {
          finalUrl = trimmed;
        }
      } else {
        finalUrl = null;
      }

      if (!finalUrl) {
        throw new Error('Received empty/unsupported QR payload from server');
      }

      const safe = this.sanitizer.bypassSecurityTrustUrl(finalUrl as string);
      this.store.setQrCode(safe);
      this.store.showQr();

      this.qrCodeUrl = safe;
      this.showQrCode = true;
    } catch (err) {
      console.error('Failed to load QR code:', err);
      this.store.setResponse('Gagal memuat QR code', 'error');
      this.store.hideQr();
      this.qrCodeUrl = null;
      this.showQrCode = false;
    } finally {
      this.store.setLoading(false);
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (e) => reject(e);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  startSession(): void {
    this.store.setLoading(true);
    this.store.hideQr();
    this.showQrCode = false;

    this.waService.startSession().subscribe({
      next: () => {
        this.store.setResponse('Session dimulai. Memuat QR...', 'success');

        setTimeout(() => {
          this.checkSessionStatus();
          if (isPlatformBrowser(this.platformId)) {
            this.loadQrCodeClick();
          }
        }, 3000);

        this.store.setLoading(false);
      },
      error: (error) => {
        console.error('Start session error:', error);
        this.store.setResponse(`Gagal memulai session: ${error?.message || error}`, 'error');
        this.store.setLoading(false);
      }
    });
  }

  stopSession(): void {
    if (!confirm('Yakin ingin menghentikan session?')) return;

    this.store.setLoading(true);

    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
      this.qrRefreshInterval = null;
    }

    this.waService.stopSession().subscribe({
      next: () => {
        this.store.setResponse('Session dihentikan!', 'success');
        this.store.hideQr();
        this.qrCodeUrl = null;
        this.showQrCode = false;
        this.store.setSessionStatus('SESSION OFF');
        this.store.setLoading(false);
      },
      error: (error) => {
        console.error('Stop session error:', error);
        this.store.setResponse(`Gagal menghentikan session: ${error?.message || error}`, 'error');
        this.store.setLoading(false);
      }
    });
  }

  logout(): void {
    if (!confirm('Yakin ingin logout?')) return;

    this.store.setLoading(true);

    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
      this.qrRefreshInterval = null;
    }

    this.waService.logout().subscribe({
      next: () => {
        this.store.setResponse('Logout berhasil!', 'success');
        this.store.hideQr();
        this.qrCodeUrl = null;
        this.showQrCode = false;
        this.store.setLoading(false);
        window.location.reload();
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.store.setResponse(`Gagal logout: ${error?.message || error}`, 'error');
        this.store.setLoading(false);
      }
    });

  }

  onSubmit() {
    if (!this.phoneNumber || !this.message) {
      this.store.setResponse('Nomor telepon dan pesan tidak boleh kosong!', 'error');
      return;
    }

    if (this.waService.isValidPhoneNumber && !this.waService.isValidPhoneNumber(this.phoneNumber)) {
      this.store.setResponse('Format nomor tidak valid!', 'error');
      return;
    }

    this.store.setLoading(true);

    this.waService.sendMessage(this.phoneNumber, this.message).subscribe({
      next: () => {
        this.store.setResponse('Pesan berhasil dikirim!', 'success');
        this.resetForm();
        this.store.setLoading(false);
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.store.setResponse(`Gagal mengirim pesan: ${err?.message || err}`, 'error');
        this.store.setLoading(false);
      }
    });
  }

  resetForm() {
    this.phoneNumber = '';
    this.message = '';
    this.store.resetForm();
  }
}
