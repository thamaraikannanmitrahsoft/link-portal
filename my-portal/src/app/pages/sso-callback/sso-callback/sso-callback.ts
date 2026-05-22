import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../service/auth-service';
import { NotificationService } from '../../../service/notification-service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sso-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sso-callback.html',
  styleUrl: './sso-callback.scss',
})
export class SsoCallbackComponent implements OnInit {

  message  = signal('Completing sign-in, please wait…');
  isError  = signal(false);

  constructor(
    private route:               ActivatedRoute,
    private router:              Router,
    private authService:         AuthService,
    private toastr:              ToastrService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;

    // ── IDP may return an error param (e.g. access_denied) ──────────────────
    const idpError = params['error'] as string | undefined;
    if (idpError) {
      console.error('[SSO] IDP returned error:', idpError, params['error_description']);
      this.fail(`Sign-in was denied: ${params['error_description'] ?? idpError}`);
      return;
    }

    const code  = params['code']  as string | undefined;
    const state = params['state'] as string | undefined;

    // ── Validate required params ─────────────────────────────────────────────
    if (!code || !state) {
      this.fail('Invalid SSO response — missing parameters.');
      return;
    }

    // ── CSRF: validate state ─────────────────────────────────────────────────
    const savedState = sessionStorage.getItem('oidc_state');
    if (!savedState || state !== savedState) {
      this.fail('Security check failed. Please try logging in again.');
      return;
    }

    // ── Retrieve PKCE values saved before redirect ───────────────────────────
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    const nonce        = sessionStorage.getItem('oidc_nonce');

    if (!codeVerifier || !nonce) {
      this.fail('Session data missing. Please try logging in again.');
      return;
    }

    const redirectUri = environment.sso.redirectUri;

    // ── Exchange code for tokens ─────────────────────────────────────────────
    this.authService.exchangeSsoToken({
      code,
      codeVerifier,
      state,
      nonce,
      redirectUri,
    }).subscribe({
      next: (res) => {
        // Validate token response
        if (!res.accessToken || !res.refreshToken) {
          console.error('[SSO] Token response missing tokens:', res);
          this.fail('Sign-in failed — invalid token response.');
          return;
        }

        // Persist tokens
        this.authService.saveTokens(res.accessToken, res.refreshToken);

        // Persist user info if returned
        if (res.data?.name)  localStorage.setItem('name',  res.data.name);
        if (res.data?.email) localStorage.setItem('email', res.data.email);

        // Clean up PKCE session values
        this.clearSessionStorage();

        // Generate FCM push notification token
        this.notificationService.generateToken();

        this.toastr.success('Signed in successfully');
        this.router.navigate(['/dashboard']);
      },

      error: (err) => {
        console.error('[SSO] Token exchange error:', err);

        // Clean up even on failure so stale values don't persist
        this.clearSessionStorage();

        const serverMessage = err?.error?.message as string | undefined;
        this.fail(serverMessage ?? 'Sign-in failed. Please try again.');
      },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private clearSessionStorage(): void {
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('oidc_nonce');
    sessionStorage.removeItem('oidc_state');
  }

  private fail(reason: string): void {
    this.isError.set(true);
    this.message.set(`${reason} Redirecting to login…`);
    this.toastr.error(reason);
    setTimeout(() => this.router.navigate(['/login']), 2500);
  }
}