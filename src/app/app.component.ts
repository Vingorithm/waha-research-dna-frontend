import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaService } from '../service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'WAHA WhatsApp Sender';
  phoneNumber: string = '';
  message: string = '';
  isLoading: boolean = false;
  responseMessage: string = '';
  responseType: 'success' | 'error' | '' = '';
  sessionStatus: string = 'Checking...';

  constructor(private waService: WaService) {}

  ngOnInit() {
    this.checkSessionStatus();
  }

  checkSessionStatus() {
    this.waService.getStatus().subscribe({
      next: (response: any) => {
        this.sessionStatus = response.status || 'Active';
        console.log('Session status:', response);
      },
      error: (error) => {
        this.sessionStatus = 'Disconnected';
        console.error('Status check error:', error);
      },
    });
  }

  startSession() {
    this.isLoading = true;
    this.waService.startSession().subscribe({
      next: (response: any) => {
        this.showResponse('Session berhasil dimulai!', 'success');
        this.checkSessionStatus();
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

  onSubmit() {
    // Validasi input
    if (!this.phoneNumber || !this.message) {
      this.showResponse('Nomor telepon dan pesan tidak boleh kosong!', 'error');
      return;
    }

    // Format nomor telepon
    const formattedPhone = this.formatPhoneNumber(this.phoneNumber);

    this.isLoading = true;
    this.responseMessage = '';

    // Kirim pesan melalui service
    this.waService.sendMessage(formattedPhone, this.message).subscribe({
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