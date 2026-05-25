import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NotificationService } from '../../service/notification-service';
import { AuthService } from '../../service/auth-service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, OnDestroy {

  name      = '';
  email     = '';
  isFabOpen = false;

  activeTab: 'foryou' | 'followers' | 'following' = 'foryou';

  private routerSub?: Subscription;

  constructor(
    private route:               ActivatedRoute,
    private router:              Router,
    private notificationService: NotificationService,
    private authService:         AuthService,
    private toastr:              ToastrService,
    private cdr:                 ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;

    if (params['code'] && params['state']) {
      this.handleSsoCallback(params['code'], params['state']);
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.initDashboard();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ── SSO ──────────────────────────────────────────────────────────────────────

  private handleSsoCallback(code: string, state: string): void {
    const savedState = sessionStorage.getItem('oidc_state');

    if (!savedState || state !== savedState) {
      this.toastr.error('Security check failed');
      this.router.navigate(['/login']);
      return;
    }

    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    const nonce        = sessionStorage.getItem('oidc_nonce');

    if (!codeVerifier || !nonce) {
      this.toastr.error('Session expired');
      this.router.navigate(['/login']);
      return;
    }

    this.authService.exchangeSsoToken({
      code,
      codeVerifier,
      state,
      nonce,
      redirectUri: environment.sso.redirectUri,
    }).subscribe({
      next: async (res) => {
        // ✅ Tokens are in HttpOnly cookies — no token check or storage needed
        // ✅ Only store non-sensitive user info
        this.authService.saveUserInfo({
          name:  res.data?.name,
          email: res.data?.email,
        });

        // ✅ Mark session as authenticated
        this.authService.setLoggedIn(true);

        this.clearSessionStorage();
        await this.notificationService.generateToken();
        this.toastr.success('Login successful');

        this.router.navigate(['/dashboard'], { replaceUrl: true });
        this.initDashboard();
      },
      error: (err) => {
        console.error(err);
        this.clearSessionStorage();
        this.toastr.error('Login failed');
        this.router.navigate(['/login']);
      },
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  private initDashboard(): void {
    // ✅ Read only non-sensitive info from localStorage
    this.name  = localStorage.getItem('name')  || '';
    this.email = localStorage.getItem('email') || '';

    this.syncTabFromUrl(this.router.url);

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.syncTabFromUrl(e.urlAfterRedirects);
      this.cdr.markForCheck();
    });

    this.cdr.markForCheck();
  }

  private syncTabFromUrl(url: string): void {
    if (url.includes('/dashboard/followers')) {
      this.activeTab = 'followers';
    } else if (url.includes('/dashboard/following')) {
      this.activeTab = 'following';
    } else {
      this.activeTab = 'foryou';
    }
  }

  // ── Tab Switching ─────────────────────────────────────────────────────────────

  switchTab(tab: 'foryou' | 'followers' | 'following'): void {
    this.activeTab = tab;
    this.cdr.markForCheck();

    if (tab === 'foryou') {
      this.router.navigate(['/dashboard']);
    } else if (tab === 'followers') {
      this.router.navigate(['/dashboard/followers']);
    } else {
      this.router.navigate(['/dashboard/following']);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── FAB ───────────────────────────────────────────────────────────────────────

  toggleFab(): void {
    this.isFabOpen = !this.isFabOpen;
    this.cdr.markForCheck();
  }

  closeFab(): void {
    this.isFabOpen = false;
    this.cdr.markForCheck();
  }

  createPost():   void { this.router.navigate(['/create-post']); }
  openComments(): void { this.closeFab(); }

  // ── Navigation ────────────────────────────────────────────────────────────────

  logout(): void {
    // ✅ Delegate to AuthService — it calls backend to clear HttpOnly cookies
    // this.authService.logout();
    this.router.navigate(['/login']);
  }

  userPage(): void {
    this.router.navigate(['/dashboard/alluser-posts']);
  }
  dashboardPage(): void {
    this.router.navigate(['/dashboard']);
  }
  // ── Private ───────────────────────────────────────────────────────────────────

  private clearSessionStorage(): void {
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('oidc_nonce');
    sessionStorage.removeItem('oidc_state');
  }
  // dashboard.component.ts
get feedTitle(): string {
  return this.router.url.includes('alluser-posts') ? 'Profile' : 'Home';
}
}