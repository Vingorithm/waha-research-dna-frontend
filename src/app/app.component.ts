import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaService } from './service/service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { log } from 'node:console';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'WAHA WhatsApp Sender';
  phoneNumber: string = '';
  message: string = '';
  isLoading: boolean = false;
  responseMessage: string = '';
  responseType: 'success' | 'error' | '' = '';
  sessionStatus: string = 'Checking...';
  qrCodeUrl: SafeUrl | null = null;
  showQrCode: boolean = false;
  qrRefreshInterval: any = null;

  constructor(
    private waService: WaService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.checkSessionStatus();
    this.testConnection();
    
  }

  ngOnDestroy() {
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
    }
  }

  testConnection() {
    this.waService.test().subscribe({
      next: (response) => console.log('Backend connection:', response),
      error: (error) => console.error('Backend connection failed:', error),
    });
  }

  checkSessionStatus() {
    this.waService.getStatus().subscribe({
      next: (response: any) => {
        this.sessionStatus = response[0].status;
        console.log('Session status:', response);

        // PERBAIKAN: harus ===, bukan =
        if (response[0].status === "SCAN_QR_CODE" && !this.showQrCode) {
          this.loadQrCode();
        }

      },
      error: (error) => {
        this.sessionStatus = 'Disconnected';
        console.error('Status check error:', error);
      },
    });
  }

  // ===============================
  //      LOAD QR (BLOB VERSION)
  // ===============================
  async loadQrCode(sessionId: string = 'default') {

    // STOP SSR agar tidak memanggil request blob
    if (!isPlatformBrowser(this.platformId)) {
      // console.warn("SSR detected — skip QR load");
      return;
    }

    this.isLoading = true;
    this.showQrCode = false;

    try {
      const imgUrl = await this.waService.getQrImageUrl(sessionId);
      this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(imgUrl);
      this.showQrCode = true;
    } catch (err) {
      console.error('Failed to load QR code:', err);
    }

    this.isLoading = false;
  }


  // ===============================
  //      AUTO REFRESH QR
  // ===============================
  // setupQrAutoRefresh(sessionId: string = 'default') {
  //   if (this.qrRefreshInterval) {
  //     clearInterval(this.qrRefreshInterval);
  //   }

  //   this.qrRefreshInterval = setInterval(async () => {
  //     if (this.showQrCode && !this.isLoading) {
  //       console.log('Auto-refreshing QR code...');
  //       try {
  //         const imgUrl = await this.waService.getQrImageUrl(sessionId);
  //         this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(imgUrl);
  //       } catch (error) {
  //         console.error('Auto-refresh QR failed:', error);
  //         clearInterval(this.qrRefreshInterval);
  //         this.checkSessionStatus();
  //       }
  //     }
  //   }, 30000);
  // }

  // ===============================
  //      SESSION CONTROL
  // ===============================
  startSession() {
    this.isLoading = true;
    this.showQrCode = false;

    this.waService.startSession().subscribe({
      next: () => {
        this.showResponse('Session dimulai. Memuat QR...', 'success');

        setTimeout(() => {
          this.checkSessionStatus();
          this.loadQrCode();
        }, 3000);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Start session error:', error);
        this.showResponse(`Gagal memulai session: ${error.message}`, 'error');
        this.isLoading = false;
      },
    });
  }

  stopSession() {
    if (!confirm('Yakin ingin menghentikan session?')) return;

    this.isLoading = true;
    if (this.qrRefreshInterval) clearInterval(this.qrRefreshInterval);

    this.waService.stopSession().subscribe({
      next: () => {
        this.showResponse('Session dihentikan!', 'success');
        this.showQrCode = false;
        this.qrCodeUrl = null;
        this.sessionStatus = "SESSION OFF"
        this.isLoading = false;
      },
      error: (error) => {
        this.showResponse(`Gagal menghentikan session: ${error.message}`, 'error');
        this.isLoading = false;
      },
    });
  }

  logout() {
    if (!confirm('Yakin ingin logout?')) return;

    this.isLoading = true;
    if (this.qrRefreshInterval) clearInterval(this.qrRefreshInterval);

    this.waService.logout().subscribe({
      next: () => {
        this.showResponse('Logout berhasil!', 'success');
        this.showQrCode = false;
        this.qrCodeUrl = null;
        this.checkSessionStatus();
        this.isLoading = false;
      },
      error: (error) => {
        this.showResponse(`Gagal logout: ${error.message}`, 'error');
        this.isLoading = false;
      },
    });
  }

  // ===============================
  //      SEND MESSAGE
  // ===============================
  onSubmit() {
    if (!this.phoneNumber || !this.message) {
      this.showResponse('Nomor telepon dan pesan tidak boleh kosong!', 'error');
      return;
    }

    if (!this.waService.isValidPhoneNumber(this.phoneNumber)) {
      this.showResponse('Format nomor tidak valid!', 'error');
      return;
    }

    this.isLoading = true;

    this.waService.sendMessage(this.phoneNumber, this.message).subscribe({
      next: () => {
        this.showResponse('Pesan berhasil dikirim!', 'success');
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        this.showResponse(`Gagal mengirim pesan: ${error.message}`, 'error');
        this.isLoading = false;
      },
    });
  }

  // ===============================
  //      UTILITIES
  // ===============================
  showResponse(message: string, type: 'success' | 'error') {
    this.responseMessage = message;
    this.responseType = type;

    setTimeout(() => {
      this.responseMessage = '';
      this.responseType = '';
    }, 5000);
  }

  resetForm() {
    this.phoneNumber = '';
    this.message = '';
  }
}
