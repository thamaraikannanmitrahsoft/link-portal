import { ChangeDetectorRef, Component } from '@angular/core';
import { Post, PostService } from '../../service/postservice';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
interface PostWithLikeState extends Post {
  likeState: {
    liked: boolean;
    count: number;
  };
}
@Component({
  selector: 'app-my-link',
  imports: [CommonModule],
  templateUrl: './my-link.html',
  styleUrl: './my-link.scss',
})
export class MyLink {
  posts: PostWithLikeState[] = [];
  loading = true;
  error   = false;

  constructor(
    private postService: PostService,
    private toastr:      ToastrService,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOAD POSTS
  // ───────────────────────────────────────────────────────────────────────────

  loadPosts(): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    this.postService.getAllPosts().subscribe({
      next: (res) => {
        const oldPostsMap = new Map(
          this.posts.map(post => [post._id, post])
        );

        this.posts = (res.data ?? []).map((post: Post) => {
          const existingPost = oldPostsMap.get(post._id);
          return {
            ...post,
            likeState: {
              liked: existingPost?.likeState?.liked ?? false,
              count: post.likesCount,
            },
          };
        });

        this.loading = false;
        this.error   = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.error   = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIKE
  // ───────────────────────────────────────────────────────────────────────────

  toggleLike(post: PostWithLikeState): void {
    const wasLiked = post.likeState.liked;

    // Optimistic UI update
    post.likeState = {
      liked: !wasLiked,
      count: wasLiked
        ? post.likeState.count - 1
        : post.likeState.count + 1,
    };
    this.posts = [...this.posts];
    this.cdr.markForCheck();

    const api$ = wasLiked
      ? this.postService.unlikePost(post._id)
      : this.postService.likePost(post._id);

    api$.subscribe({
      error: () => {
        // Revert on failure
        post.likeState = {
          liked: wasLiked,
          count: wasLiked
            ? post.likeState.count + 1
            : post.likeState.count - 1,
        };
        this.posts = [...this.posts];
        this.cdr.markForCheck();
        this.toastr.error('Failed to update like');
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BOOKMARK
  // ───────────────────────────────────────────────────────────────────────────

  toggleBookmark(post: any): void {
    post.bookmarked = !post.bookmarked;
    this.posts = [...this.posts];
    this.cdr.markForCheck();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name: string | undefined): string {
    const colors = [
      '#1d9bf0',
      '#00ba7c',
      '#f4212e',
      '#ff7a00',
      '#7856ff',
      '#ff3cac',
      '#00c9ff',
      '#f7c948',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000
    );
    if (diff < 60)    return diff + 's';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }
}
