// src/app/app.component.ts
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaService } from './service/service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { firstValueFrom, Subscription } from 'rxjs';
import { AppStore } from './state/app.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {

  title = 'WAHA WhatsApp Sender';

  phoneNumber = '';
  message = '';
  responseMessage = '';
  responseType: 'success' | 'error' | '' = '';
  qrCodeUrl: SafeUrl | null = null;
  showQrCode = false;

  sessionStatus = 'Checking...';
  isLoading = false;

  lastMessageFrom = '';
  lastMessageText = '';
  lastMessageName = '';
  lastMessageNumber = '';
  isGroup = false;

  private subs: Subscription[] = [];
  private sse?: EventSource;

  constructor(
    private store: AppStore,
    private waService: WaService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.bindStore();
    this.setupSSE();
    this.testConnection();
  }

  ngAfterViewInit() {
    this.checkStatus();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.sse) this.sse.close();
  }

  private bindStore() {
    this.subs.push(this.store.isLoading$.subscribe(v => this.isLoading = v));
    this.subs.push(this.store.sessionStatus$.subscribe(v => this.sessionStatus = v));
    this.subs.push(this.store.qrCodeUrl$.subscribe(v => this.qrCodeUrl = v as SafeUrl | null));
    this.subs.push(this.store.showQrCode$.subscribe(v => this.showQrCode = v));
    this.subs.push(this.store.responseMessage$.subscribe(v => this.responseMessage = v));
    this.subs.push(this.store.responseType$.subscribe(v => this.responseType = v));

    this.subs.push(this.store.lastMessageFrom$.subscribe(v => this.lastMessageFrom = v));
    this.subs.push(this.store.lastMessageText$.subscribe(v => this.lastMessageText = v));
    this.subs.push(this.store.lastMessageName$.subscribe(v => this.lastMessageName = v));
    this.subs.push(this.store.lastMessageNumber$.subscribe(v => this.lastMessageNumber = v));
    this.subs.push(this.store.isGroup$.subscribe(v => this.isGroup = v));
  }

  setupSSE() {
    if (!isPlatformBrowser(this.platformId)) return;

    console.log("Connecting to SSE stream...");

    this.sse = this.waService.listenEvents();

    this.sse.onmessage = (ev) => {
      console.log("SSE Raw:", ev.data);
    };

    this.sse.addEventListener("session.status", async (ev: any) => {
      const data = JSON.parse(ev.data);
      console.log("STATUS EVENT:", data);

      const st = data.status;
      const session = data.session || "default";

      this.store.setSessionStatus(data.session);

      this.store.setSessionStatus(st);

      if (st === "SCAN_QR_CODE") {
        await this.loadQrCode(session);
      }

      if (st === "WORKING" || st === "CONNECTED") {
        this.store.hideQr();
      }
    });

    this.sse.addEventListener("session.qr", (ev: any) => {
      const payload = JSON.parse(ev.data);
      console.log("QR EVENT:", payload);

      const base64 = payload.qr;
      if (base64) {
        const safe = this.sanitizer.bypassSecurityTrustUrl(
          `data:image/png;base64,${base64}`
        );
        this.store.setQrCode(safe);
        this.store.showQr();
      }
    });

    this.sse.addEventListener("message", (ev: any) => {
      const payload = JSON.parse(ev.data);
      console.log("INCOMING MESSAGE EVENT:", payload);

      // Pesan teks
      const text =
        payload.text ||
        payload.body ||
        payload.message ||
        '';

      if (!text) {
        return;
      }

      // JID pengirim (prioritas: author -> from -> participant)
      const jidRaw =
        payload.author ||
        payload.participant ||
        payload.from ||
        payload.chatId ||
        '';

      // Nomor
      const number = jidRaw.split('@')[0];

      // Nama
      const name =
        payload.senderName ||
        payload.contactName ||
        payload.pushName ||
        payload.notifyName ||
        (payload._data && payload._data.notifyName) ||
        '';

      const isGroup = payload.participant ? true : false;

      console.log("Dari group", payload.participant, "=>", isGroup);

      this.store.setLastMessage(jidRaw, text, name, number, isGroup);
    });

  }

  async checkStatus() {
    try {
      const resp: any = await firstValueFrom(this.waService.getStatus());

      console.log("resp:", resp);

      if (Array.isArray(resp) && resp.length > 0) {
        const status = resp[0].status;
        this.store.setSessionStatus(status);

        if (status === "SCAN_QR_CODE") {
          await this.loadQrCode("default");
        } else if (status === "WORKING" || status === "CONNECTED") {
          this.store.hideQr();
        }
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  }

  testConnection() {
    this.waService.test().subscribe({
      next: res => console.log("Backend OK:", res),
      error: err => console.error("Backend ERROR:", err),
    });
  }

  async loadQrCode(session: string = "default") {
    if (!isPlatformBrowser(this.platformId)) return;

    this.store.setLoading(true);
    this.store.hideQr();

    try {
      const raw = await this.waService.getQrImageUrl(session);
      const safe = this.sanitizer.bypassSecurityTrustUrl(raw);
      this.store.setQrCode(safe);
      this.store.showQr();
    } catch (err) {
      console.error("QR load error:", err);
      this.store.setResponse("Gagal memuat QR code", "error");
    } finally {
      this.store.setLoading(false);
    }
  }

  startSession() {
    this.store.setLoading(true);

    this.waService.startSession().subscribe({
      next: () => {
        this.store.setResponse("Session dimulai!", "success");
      },
      error: err => {
        this.store.setResponse("Gagal memulai session", "error");
        console.error(err);
      },
      complete: () => this.store.setLoading(false)
    });
  }

  stopSession() {
    if (!confirm("Yakin stop session?")) return;
    this.store.setLoading(true);

    this.waService.stopSession().subscribe({
      next: () => {
        this.store.setResponse("Session dihentikan!", "success");
        this.store.hideQr();
      },
      error: err => {
        this.store.setResponse("Gagal stop session", "error");
        console.error(err);
      },
      complete: () => this.store.setLoading(false)
    });
  }

  logout() {
    if (!confirm("Yakin logout?")) return;
    this.store.setLoading(true);

    this.waService.logout().subscribe({
      next: () => {
        this.store.setResponse("Logout berhasil!", "success");
        this.store.hideQr();
      },
      error: err => {
        this.store.setResponse("Gagal logout", "error");
        console.error(err);
      },
      complete: () => this.store.setLoading(false)
    });
  }

  onSubmit() {
    if (!this.phoneNumber || !this.message) {
      this.store.setResponse("Nomor & pesan wajib diisi", "error");
      return;
    }

    this.store.setLoading(true);

    this.waService.sendMessage(this.phoneNumber, this.message).subscribe({
      next: () => {
        this.store.setResponse("Pesan berhasil dikirim!", "success");
        this.resetForm();
      },
      error: err => {
        console.error(err);
        this.store.setResponse("Gagal mengirim pesan", "error");
      },
      complete: () => this.store.setLoading(false)
    });
  }

  resetForm() {
    this.phoneNumber = "";
    this.message = "";
    this.store.resetForm();
  }
}
