import { SafeUrl } from '@angular/platform-browser';

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