import { CommonModule }                                from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  signal,
}                                                     from '@angular/core';
import { ActivatedRoute, Router }                             from '@angular/router';
import { NotificationService }                        from '../../service/notification-service';
import { Post, PostService, UserProfile }             from '../../service/postservice';

// ─── Like state shape ─────────────────────────────────────────────────────────
interface LikeState {
  liked: boolean;
  count: number;
}

@Component({
  selector: 'app-all-userpost',
  imports: [CommonModule],
  templateUrl: './all-userpost.html',
  styleUrl: './all-userpost.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllUserpost implements OnInit {

  isFabOpen          = false;
  posts:              Post[]             = [];
  user:               UserProfile | null = null;
  loading            = true;
  error              = false;
  activeMenuPostId:  string | null       = null;

  private menuClickedInside = false;

  // ─── Like signal map: postId → { liked, count } ────────────────────────────
  private likeMap = signal<Record<string, LikeState>>({});

  constructor(
    private notificationService: NotificationService,
    private postService:         PostService,
    private cdr:                 ChangeDetectorRef,
    private route:               ActivatedRoute,
    private router:              Router,
   
  ) {}

  // ─── Host listener: close menu on outside click ────────────────────────────

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

  // ─── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loaduserPosts();
  }

  // ─── Load posts ────────────────────────────────────────────────────────────

  loaduserPosts(): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    this.postService.getUserPosts().subscribe({
      next: (res) => {
        this.user  = res.user;
        this.posts = (res.posts ?? []).map(p => ({
          ...p,
          bookmarked: false,
        }));
        this.loading = false;
        this.error   = false;

        // ── Preserve liked state, refresh count from server ──────────────────
        // Read the current snapshot BEFORE overwriting so we keep
        // liked=true for posts the user tapped in this session.
        const prev = this.likeMap();
        const map: Record<string, LikeState> = {};
        this.posts.forEach(p => {
          map[p._id] = {
            liked: prev[p._id]?.liked ?? false,  // ← keep existing liked state
            count: p.likesCount,                  // ← fresh count from server
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

  // ─── Like Signal Helpers ────────────────────────────────────────────────────

  /** Used in template: [class.liked]="isLiked(post._id)" */
  isLiked(postId: string): boolean {
    return this.likeMap()[postId]?.liked ?? false;
  }

  /** Used in template: {{ getLikeCount(post._id) }} */
  getLikeCount(postId: string): number {
    return this.likeMap()[postId]?.count ?? 0;
  }

  /**
   * Optimistic toggle → API call → re-fetch posts on success → revert on error.
   */
  toggleLike(post: Post): void {
    const current = this.likeMap()[post._id];
    if (!current) return;

    const wasLiked = current.liked;

    // ── Optimistic update ────────────────────────────────────────────────────
    this.likeMap.update(map => ({
      ...map,
      [post._id]: {
        liked: !wasLiked,
        count: wasLiked ? current.count - 1 : current.count + 1,
      },
    }));

    // ── API call ─────────────────────────────────────────────────────────────
    const api$ = wasLiked
      ? this.postService.unlikePost(post._id)
      : this.postService.likePost(post._id);

    api$.subscribe({
      next: () => {
        // Re-fetch to sync true count from server.
        // loaduserPosts() reads prev likeMap snapshot so liked state is preserved.
        this.loaduserPosts();
      },
      error: () => {
        // Revert signal to state before the tap
        this.likeMap.update(map => ({ ...map, [post._id]: current }));
      },
    });
  }

  // ─── Bookmark ──────────────────────────────────────────────────────────────

  toggleBookmark(post: Post): void {
    post.bookmarked = !post.bookmarked;
    this.cdr.markForCheck();
  }

  // ─── Post menu ─────────────────────────────────────────────────────────────

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

  // ─── Delete post ───────────────────────────────────────────────────────────

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

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
  dashboardPage(){
    this.router.navigate(['/dashboard']);
  }
}