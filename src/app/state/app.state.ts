import { SafeUrl } from '@angular/platform-browser';

/**
 * Definisi shape state aplikasi.
 */
export interface AppStateModel {
  phoneNumber: string;
  message: string;
  isLoading: boolean;
  responseMessage: string;
  responseType: 'success' | 'error' | '';
  sessionStatus: string;
  qrCodeUrl: string | SafeUrl | null;
  showQrCode: boolean;
}

/**
 * Nilai awal state yang digunakan store saat inisialisasi.
 */
export const initialAppState: AppStateModel = {
  phoneNumber: '',
  message: '',
  isLoading: false,
  responseMessage: '',
  responseType: '',
  sessionStatus: 'Checking...',
  qrCodeUrl: null,
  showQrCode: false,
};