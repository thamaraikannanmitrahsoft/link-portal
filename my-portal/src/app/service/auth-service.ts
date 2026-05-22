import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  message?: string;
  data?: {
    name: string;
    email: string;
  };
}

export interface SsoTokenPayload {
  code: string;
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private loginApiUrl        = 'http://192.168.3.65:3000/api/auth/Login';
  private registerApiUrl     = 'http://192.168.3.65:3000/api/auth/Register';
  private refreshTokenApiUrl = 'http://192.168.3.65:3000/api/auth/refresh';
  private ssoTokenApiUrl     = 'http://192.168.3.65:3000/api/token';

  constructor(private http: HttpClient) {}

  // ─── Email / Password ──────────────────────────────────────────────────────

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.loginApiUrl, payload);
  }

  register(payload: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.registerApiUrl, payload);
  }

  // ─── Token Helpers ─────────────────────────────────────────────────────────

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<any>(this.refreshTokenApiUrl, { refreshToken });
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
  }

  // ─── SSO / PKCE ────────────────────────────────────────────────────────────

  /**
   * Called when user clicks "Login with SSO / Google"
   * Generates PKCE, saves to sessionStorage, redirects to IDP.
   *
   * Always await this in the caller:
   *   await this.authService.redirectToSso();
   */
  async redirectToSso(): Promise<void> {
    try {
      // ── 1. Validate environment config before doing anything ──────────────
      const { clientId, redirectUri, scope, authorityUrl } = environment.sso ?? {};
      if (!clientId || !redirectUri || !scope || !authorityUrl) {
        console.error('SSO config missing in environment:', environment.sso);
        throw new Error('SSO is not configured. Check environment.sso values.');
      }

      // ── 2. Generate codeVerifier (32 random bytes → base64url) ───────────
      const verifierBytes = new Uint8Array(32);
      crypto.getRandomValues(verifierBytes);
      const codeVerifier = this.base64UrlEncode(verifierBytes);

      // ── 3. Generate codeChallenge = BASE64URL(SHA-256(codeVerifier)) ──────
      const encoded     = new TextEncoder().encode(codeVerifier);
      const hashBuffer  = await crypto.subtle.digest('SHA-256', encoded);
      const codeChallenge = this.base64UrlEncode(new Uint8Array(hashBuffer));

      // ── 4. Generate nonce ─────────────────────────────────────────────────
      const nonceBytes = new Uint8Array(16);
      crypto.getRandomValues(nonceBytes);
      const nonce = this.base64UrlEncode(nonceBytes);

      // ── 5. Generate state (CSRF token) ────────────────────────────────────
      const state = crypto.randomUUID();

      // ── 6. Persist PKCE + OIDC values for the callback ───────────────────

      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('oidc_nonce', nonce);
      sessionStorage.setItem('oidc_state', state);

      // ── 7. Build IDP redirect URL ─────────────────────────────────────────
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

      const idpUrl = `${authorityUrl}?${params.toString()}`;
      console.debug('[SSO] Redirecting to:', idpUrl); // remove in production

      // ── 8. Redirect ───────────────────────────────────────────────────────
      window.location.href = idpUrl;

    } catch (err) {
      // Re-throw so the caller (login component) can show an error to the user
      console.error('[SSO] redirectToSso failed:', err);
      throw err;
    }
  }

  /**
   * Called from SsoCallbackComponent.
   * POSTs code + PKCE values to backend → POST /api/token
   */
  exchangeSsoToken(payload: SsoTokenPayload): Observable<TokenResponse> {
  
    return this.http.post<TokenResponse>(this.ssoTokenApiUrl, payload);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Safe base64url encoder.
   * Uses a loop instead of spread operator to avoid call-stack overflow
   * for large Uint8Arrays in some browsers.
   */
  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}