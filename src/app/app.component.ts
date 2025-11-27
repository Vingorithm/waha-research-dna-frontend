import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaService } from '../service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.checkSessionStatus();
    this.testConnection();
  }

  ngOnDestroy() {
    // Clear interval saat component destroy
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
    }
  }

  testConnection() {
    this.waService.test().subscribe({
      next: (response) => {
        console.log('Backend connection:', response);
      },
      error: (error) => {
        console.error('Backend connection failed:', error);
      },
    });
  }

  checkSessionStatus() {
    this.waService.getStatus().subscribe({
      next: (response: any) => {
        this.sessionStatus = response.status || 'Inactive';
        console.log('Session status:', response);
        
        // Jika status SCAN_QR_CODE, load QR otomatis
        if (response.length == 0) {
          this.loadQrCode();
        }
      },
      error: (error) => {
        this.sessionStatus = 'Disconnected';
        console.error('Status check error:', error);
      },
    });
  }

  async loadQrCode(sessionId: string = 'default') {
    try {
      this.isLoading = true;
      this.showQrCode = false; // Hide dulu untuk loading state
      
      const base64 = await this.waService.getQrBase64(sessionId);
      
      // Pastikan base64 tidak kosong
      if (!base64) {
        throw new Error('QR code is empty');
      }
      
      this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(base64);
      this.showQrCode = true;
      this.showResponse('QR Code berhasil dimuat. Silakan scan dengan WhatsApp Anda.', 'success');
      this.isLoading = false;
      
      // Setup auto-refresh QR setiap 30 detik
      this.setupQrAutoRefresh(sessionId);
    } catch (error: any) {
      console.error('Failed to load QR code:', error);
      this.showQrCode = false;
      
      // Handle different error cases
      if (error.status === 404) {
        this.showResponse('QR code tidak tersedia. Pastikan session sudah dimulai.', 'error');
      } else if (error.status === 400) {
        this.showResponse('Session sudah terkoneksi atau tidak dalam mode QR.', 'error');
      } else {
        this.showResponse(`Gagal memuat QR code: ${error.message}`, 'error');
      }
      
      this.isLoading = false;
    }
  }

  setupQrAutoRefresh(sessionId: string = 'default') {
    // Clear existing interval
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
    }
    
    // Refresh QR every 30 seconds
    this.qrRefreshInterval = setInterval(async () => {
      if (this.showQrCode && !this.isLoading) {
        console.log('Auto-refreshing QR code...');
        try {
          const base64 = await this.waService.getQrBase64(sessionId);
          if (base64) {
            this.qrCodeUrl = this.sanitizer.bypassSecurityTrustUrl(base64);
          }
        } catch (error) {
          console.error('Auto-refresh QR failed:', error);
          // Stop auto-refresh jika error (mungkin sudah terkoneksi)
          clearInterval(this.qrRefreshInterval);
          this.checkSessionStatus();
        }
      }
    }, 30000); // 30 seconds
  }

  startSession() {
    this.isLoading = true;
    this.showQrCode = false;
    
    this.waService.startSession().subscribe({
      next: (response: any) => {
        console.log('Start session response:', response);
        this.showResponse('Session berhasil dimulai! Memuat QR code...', 'success');
        
        // Tunggu sebentar agar WAHA API siap
        setTimeout(() => {
          this.checkSessionStatus();
          this.loadQrCode();
        }, 3000); // Tunggu 3 detik agar QR siap
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Start session error:', error);
        this.showResponse(
          `Gagal memulai session: ${error.error?.message || error.message}`,
          'error'
        );
        this.isLoading = false;
      },
    });
  }

  stopSession() {
    if (!confirm('Yakin ingin menghentikan session?')) return;
    
    this.isLoading = true;
    
    // Clear QR auto-refresh
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
    }
    
    this.waService.stopSession().subscribe({
      next: (response: any) => {
        this.showResponse('Session berhasil dihentikan!', 'success');
        this.checkSessionStatus();
        this.showQrCode = false;
        this.qrCodeUrl = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Stop session error:', error);
        this.showResponse(
          `Gagal menghentikan session: ${error.error?.message || error.message}`,
          'error'
        );
        this.isLoading = false;
      },
    });
  }

  logout() {
    if (!confirm('Yakin ingin logout? Anda harus scan QR code lagi.')) return;
    
    this.isLoading = true;
    
    // Clear QR auto-refresh
    if (this.qrRefreshInterval) {
      clearInterval(this.qrRefreshInterval);
    }
    
    this.waService.logout().subscribe({
      next: (response: any) => {
        this.showResponse('Logout berhasil!', 'success');
        this.checkSessionStatus();
        this.showQrCode = false;
        this.qrCodeUrl = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.showResponse(
          `Gagal logout: ${error.error?.message || error.message}`,
          'error'
        );
        this.isLoading = false;
      },
    });
  }


  onSubmit() {
    // Validasi input
    if (!this.phoneNumber || !this.message) {
      this.showResponse('Nomor telepon dan pesan tidak boleh kosong!', 'error');
      return;
    }

    // Validasi format nomor
    if (!this.waService.isValidPhoneNumber(this.phoneNumber)) {
      this.showResponse('Format nomor telepon tidak valid!', 'error');
      return;
    }

    this.isLoading = true;
    this.responseMessage = '';

    // Kirim pesan melalui service
    this.waService.sendMessage(this.phoneNumber, this.message).subscribe({
      next: (response: any) => {
        this.showResponse('Pesan berhasil dikirim!', 'success');
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.showResponse(
          `Gagal mengirim pesan: ${error.error?.message || error.message}`,
          'error'
        );
        this.isLoading = false;
      },
    });
  }

  formatPhoneNumber(phone: string): string {
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

  showResponse(message: string, type: 'success' | 'error') {
    this.responseMessage = message;
    this.responseType = type;

    // Auto-hide setelah 5 detik
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