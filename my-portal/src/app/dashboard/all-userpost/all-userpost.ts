import { CommonModule }                   from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
}                                         from '@angular/core';
import { ActivatedRoute, Router }         from '@angular/router';
import { Subject }                        from 'rxjs';
import { takeUntil }                      from 'rxjs/operators';
import { NotificationService }            from '../../service/notification-service';
import { Post, PostService, UserProfile } from '../../service/postservice';

interface LikeState {
  liked: boolean;
  count: number;
}

@Component({
  selector:        'app-all-userpost',
  imports:         [CommonModule],
  templateUrl:     './all-userpost.html',
  styleUrl:        './all-userpost.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllUserpost implements OnInit, OnDestroy {

  isFabOpen         = false;
  posts:             Post[]             = [];
  user:              UserProfile | null = null;
  loading           = true;
  error             = false;
  activeMenuPostId: string | null       = null;

  private menuClickedInside = false;
  private destroy$          = new Subject<void>();         // ← for cleanup

  private likeMap = signal<Record<string, LikeState>>({});

  constructor(
    private notificationService: NotificationService,
    private postService:         PostService,
    private cdr:                 ChangeDetectorRef,
    private route:               ActivatedRoute,
    private router:              Router,
  ) {}

  // ─── Close menu on outside click ──────────────────────────────────────────

  @HostListener('document:click')
  onDocumentClick() {
    if (this.menuClickedInside) {
      this.menuClickedInside = false;
      return;
    }
    if (this.activeMenuPostId) {
      this.activeMenuPostId = null;
      this.cdr.markForCheck();
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loaduserPosts();
    this.listenToLikeAck();    // ← socket ack listener
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Load posts ───────────────────────────────────────────────────────────

  loaduserPosts(): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    this.postService.getUserPosts().subscribe({
      next: (res) => {
        this.user  = res.user;
        this.posts = (res.posts ?? []).map(p => ({ ...p, bookmarked: false }));
        this.loading = false;
        this.error   = false;

        const prev = this.likeMap();
        const map: Record<string, LikeState> = {};
        this.posts.forEach(p => {
          map[p._id] = {
            liked: prev[p._id]?.liked ?? false,
            count: p.likesCount,
          };
        });
        this.likeMap.set(map);

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load posts:', err);
        this.error   = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Like signal helpers ──────────────────────────────────────────────────

  isLiked(postId: string): boolean {
    return this.likeMap()[postId]?.liked ?? false;
  }

  getLikeCount(postId: string): number {
    return this.likeMap()[postId]?.count ?? 0;
  }

  // ─── Toggle like (socket) ─────────────────────────────────────────────────

  toggleLike(post: Post): void {
    const current = this.likeMap()[post._id];
    if (!current) return;

    const wasLiked = current.liked;

    // 1. Optimistic update — instant feedback
    this.likeMap.update(map => ({
      ...map,
      [post._id]: {
        liked: !wasLiked,
        count: wasLiked ? current.count - 1 : current.count + 1,
      },
    }));

    // 2. Emit via socket — fire and forget
    wasLiked
      ? this.postService.unlikePostSocket(post._id)
      : this.postService.likePostSocket(post._id);
  }

  // ─── Socket ack: correct count or roll back on failure ───────────────────

  private listenToLikeAck(): void {
    this.postService.onLikeAck()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ postId, success, likesCount }) => {
        const current = this.likeMap()[postId];
        if (!current) return;

        if (success) {
          // Sync server-confirmed count (keep liked state as-is)
          this.likeMap.update(map => ({
            ...map,
            [postId]: { ...map[postId], count: likesCount },
          }));
        } else {
          // Roll back to state before the tap
          this.likeMap.update(map => ({
            ...map,
            [postId]: {
              liked: !current.liked,
              count: current.liked
                ? current.count - 1
                : current.count + 1,
            },
          }));
        }

        this.cdr.markForCheck();
      });
  }

  // ─── Bookmark ─────────────────────────────────────────────────────────────

  toggleBookmark(post: Post): void {
    post.bookmarked = !post.bookmarked;
    this.cdr.markForCheck();
  }

  // ─── Post menu ────────────────────────────────────────────────────────────

  toggleMenu(postId: string, event: Event): void {
    event.stopPropagation();
    this.menuClickedInside = true;
    this.activeMenuPostId  = this.activeMenuPostId === postId ? null : postId;
    this.cdr.markForCheck();
  }

  menuInsideClick(): void {
    this.menuClickedInside = true;
  }

  closeMenu(): void {
    this.activeMenuPostId = null;
    this.cdr.markForCheck();
  }

  // ─── Delete post ──────────────────────────────────────────────────────────

  deletePost(postId: string, event: Event): void {
    event.stopPropagation();

    const deletedPost     = this.posts.find(p => p._id === postId);
    this.posts            = this.posts.filter(p => p._id !== postId);
    this.activeMenuPostId = null;
    this.cdr.markForCheck();

    this.postService.deletePost(postId).subscribe({
      next: () => console.log('Deleted successfully'),
      error: (err) => {
        console.error('Delete failed:', err);
        if (deletedPost) {
          this.posts = [...this.posts, deletedPost];
          this.cdr.markForCheck();
        }
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string | undefined): string {
    const colors = ['#1d9bf0', '#00ba7c', '#ff7a00', '#f91880', '#7856ff', '#ff6c00'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return diff + 's';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  dashboardPage(): void {
    this.router.navigate(['/dashboard']);
  }
}