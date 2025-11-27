// import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   imports: [RouterOutlet],
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.css',
// })
// export class AppComponent {
//   title = 'waha-research-frontend';
// }

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'WAHA WhatsApp Sender';
  phoneNumber: string = '';
  message: string = '';
  isLoading: boolean = false;
  responseMessage: string = '';
  responseType: 'success' | 'error' | '' = '';

  // Konfigurasi WAHA API
  private wahaApiUrl = 'https://waha.devlike.pro/api/sendText';
  private wahaApiKey = 'YOUR_API_KEY_HERE'; // Ganti dengan API key Anda
  private sessionName = 'default'; // Ganti dengan session name Anda

  constructor(private http: HttpClient) {}

  onSubmit() {
    // Validasi input
    if (!this.phoneNumber || !this.message) {
      this.showResponse('Nomor telepon dan pesan tidak boleh kosong!', 'error');
      return;
    }

    // Format nomor telepon (pastikan dalam format internasional)
    const formattedPhone = this.formatPhoneNumber(this.phoneNumber);

    this.isLoading = true;
    this.responseMessage = '';

    // Payload untuk WAHA API
    const payload = {
      session: this.sessionName,
      chatId: formattedPhone + '@c.us',
      text: this.message,
    };

    // Kirim request ke WAHA API
    this.http
      .post(this.wahaApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.wahaApiKey,
        },
      })
      .subscribe({
        next: (response) => {
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
    this.responseMessage = '';
    this.responseType = '';
  }
}
