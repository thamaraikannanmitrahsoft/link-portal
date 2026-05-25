import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface TokenResponse {
  message?: string;
  data?: {
    name:  string;
    email: string;
    id?:   string;
  };
}

export interface SsoTokenPayload {
  code:         string;
  codeVerifier: string;
  state:        string;
  nonce:        string;
  redirectUri:  string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  // ✅ All URLs lowercase to match interceptor isAuthEndpoint check
  private loginApiUrl        = `${environment.apiUrl}/auth/Login`;
  private registerApiUrl     = `${environment.apiUrl}/auth/register`;
  private refreshTokenApiUrl = `${environment.apiUrl}/auth/refresh`;
  private ssoTokenApiUrl     = `${environment.apiUrl}/token`;
  private logoutApiUrl       = `${environment.apiUrl}/auth/logout`;

  private readonly credOptions = { withCredentials: true };

  constructor(private http: HttpClient) {}

  // ─── Email / Password ───────────────────────────────────────────────────────

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.loginApiUrl, payload, this.credOptions);
  }

  register(payload: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.registerApiUrl, payload, this.credOptions);
  }

  // ─── Token Helpers ──────────────────────────────────────────────────────────

  refreshToken(): Observable<any> {
    return this.http.post<any>(this.refreshTokenApiUrl, {}, this.credOptions);
  }

  saveUserInfo(data: { name?: string; email?: string; id?: string }): void {
    if (data.name)  localStorage.setItem('name',  data.name);
    if (data.email) localStorage.setItem('email', data.email);
    if (data.id)    localStorage.setItem('id',    data.id);
  }

  isLoggedIn(): boolean {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  }

  setLoggedIn(value: boolean): void {
    if (value) {
      sessionStorage.setItem('isLoggedIn', 'true');
    } else {
      sessionStorage.removeItem('isLoggedIn');
    }
  }

  logout(): void {
    // ✅ Optionally call backend to clear HttpOnly cookies
    this.http.post(this.logoutApiUrl, {}, this.credOptions).subscribe({
      complete: () => {
        localStorage.clear();
        sessionStorage.clear();
      },
      error: () => {
        // Clear local state even if backend call fails
        localStorage.clear();
        sessionStorage.clear();
      }
    });
  }

  // ─── SSO / PKCE ─────────────────────────────────────────────────────────────

  async redirectToSso(): Promise<void> {
    try {
      const { clientId, redirectUri, scope, authorityUrl } = environment.sso ?? {};
      if (!clientId || !redirectUri || !scope || !authorityUrl) {
        throw new Error('SSO is not configured. Check environment.sso values.');
      }

      const verifierBytes = new Uint8Array(32);
      crypto.getRandomValues(verifierBytes);
      const codeVerifier = this.base64UrlEncode(verifierBytes);

      const encoded       = new TextEncoder().encode(codeVerifier);
      const hashBuffer    = await crypto.subtle.digest('SHA-256', encoded);
      const codeChallenge = this.base64UrlEncode(new Uint8Array(hashBuffer));

      const nonceBytes = new Uint8Array(16);
      crypto.getRandomValues(nonceBytes);
      const nonce = this.base64UrlEncode(nonceBytes);
      const state = crypto.randomUUID();

      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('oidc_nonce',         nonce);
      sessionStorage.setItem('oidc_state',         state);

      const params = new URLSearchParams({
        response_type:         'code',
        client_id:             clientId,
        redirect_uri:          redirectUri,
        scope,
        state,
        nonce,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
      });

      window.location.href = `${authorityUrl}?${params.toString()}`;
    } catch (err) {
      console.error('[SSO] redirectToSso failed:', err);
      throw err;
    }
  }

  exchangeSsoToken(payload: SsoTokenPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(this.ssoTokenApiUrl, payload, this.credOptions);
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}