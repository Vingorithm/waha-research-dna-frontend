import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { AppStateModel, initialAppState } from './app.state';
import { SafeUrl } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root',
})
export class AppStore {
    private state$ = new BehaviorSubject<AppStateModel>({ ...initialAppState });
    readonly stateObservable$ = this.state$.asObservable();

    // selectors
    readonly phoneNumber$ = this.select('phoneNumber');
    readonly message$ = this.select('message');
    readonly isLoading$ = this.select('isLoading');
    readonly responseMessage$ = this.select('responseMessage');
    readonly responseType$ = this.select('responseType');
    readonly sessionStatus$ = this.select('sessionStatus');
    readonly qrCodeUrl$ = this.select('qrCodeUrl');
    readonly showQrCode$ = this.select('showQrCode');

    // snapshot
    snapshot(): AppStateModel {
        return this.state$.getValue();
    }

    // generic update
    update(patch: Partial<AppStateModel>) {
        const cur = this.snapshot();
        this.state$.next({ ...cur, ...patch });
    }

    // convenience mutators
    setPhoneNumber(v: string) { this.update({ phoneNumber: v }); }
    setMessage(v: string) { this.update({ message: v }); }
    setLoading(flag: boolean) { this.update({ isLoading: flag }); }

    setResponse(message: string, type: 'success' | 'error' | '') {
        this.update({ responseMessage: message, responseType: type });
        if (message) {
            const captured = message;
            setTimeout(() => {
                const cur = this.snapshot();
                if (cur.responseMessage === captured) {
                    this.update({ responseMessage: '', responseType: '' });
                }
            }, 5000);
        }
    }

    setSessionStatus(status: string) { 
        this.update({ sessionStatus: status }); 
    }
    setQrCode(url: string | SafeUrl | null) { this.update({ qrCodeUrl: url }); }
    showQr() { 
        this.update({ showQrCode: true }); 
    }
    hideQr() { this.update({ showQrCode: false, qrCodeUrl: null }); }

    resetForm() {
        this.update({ phoneNumber: '', message: '', responseMessage: '', responseType: '' });
    }

    resetAll() {
        this.state$.next({ ...initialAppState });
    }

    destroy() { this.state$.complete(); }

    // helper selector
    private select<K extends keyof AppStateModel>(key: K): Observable<AppStateModel[K]> {
        return this.stateObservable$.pipe(
            map(s => s[key]),
            distinctUntilChanged()
        );
    }
}
