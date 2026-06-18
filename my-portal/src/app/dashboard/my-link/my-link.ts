import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Post, PostService }  from '../../service/postservice';
import { ToastrService }      from 'ngx-toastr';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { Subject }            from 'rxjs';
import { takeUntil }          from 'rxjs/operators';

interface Comment {
  _id:             string;
  userId:          { _id: string; name: string };
  postId:          string;
  text:            string;
  parentCommentId: string | null;
  createdAt:       string;
  updatedAt:       string;
  replies?:        Comment[];
}

interface PostWithLikeState extends Post {
  likeState: {
    liked: boolean;
    count: number;
  };
  showComments?:    boolean;
  comments?:        Comment[];
  commentsLoaded?:  boolean;
  commentsLoading?: boolean;
  commentText?:     string;
  replyingTo?:      { commentId: string; userName: string } | null;
}

@Component({
  selector:    'app-my-link',
  imports:     [CommonModule, FormsModule],
  templateUrl: './my-link.html',
  styleUrl:    './my-link.scss',
})
export class MyLink implements OnInit, OnDestroy {

  posts:   PostWithLikeState[] = [];
  loading = true;
  error   = false;

  private destroy$ = new Subject<void>();

  constructor(
    private postService: PostService,
    private toastr:      ToastrService,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPosts();
    this.listenToLikeAck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        const oldPostsMap = new Map(this.posts.map(p => [p._id, p]));

        this.posts = (res.data ?? []).map((post: Post) => {
          const existing = oldPostsMap.get(post._id);
          return {
            ...post,
            likeState: {
              liked: existing?.likeState?.liked ?? false,
              count: post.likesCount,
            },
            showComments:    existing?.showComments    ?? false,
            comments:        existing?.comments        ?? [],
            commentsLoaded:  existing?.commentsLoaded  ?? false,
            commentsLoading: existing?.commentsLoading ?? false,
            commentText:     existing?.commentText     ?? '',
            replyingTo:      existing?.replyingTo      ?? null,
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
  // LIKE  (socket)
  // ───────────────────────────────────────────────────────────────────────────

  toggleLike(post: PostWithLikeState): void {
    const wasLiked = post.likeState.liked;

    // Optimistic update — instant feedback
    post.likeState = {
      liked: !wasLiked,
      count: wasLiked ? post.likeState.count - 1 : post.likeState.count + 1,
    };
    this.posts = [...this.posts];
    this.cdr.markForCheck();

    // Emit via socket
    wasLiked
      ? this.postService.unlikePostSocket(post._id)
      : this.postService.likePostSocket(post._id);
  }

  // Server ack — correct count or roll back on failure
  private listenToLikeAck(): void {
    this.postService.onLikeAck()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ postId, success, likesCount }) => {
        const post = this.posts.find(p => p._id === postId);
        if (!post) return;

        if (success) {
          post.likeState.count = likesCount;
        } else {
          // Roll back
          post.likeState = {
            liked:  !post.likeState.liked,
            count:  post.likeState.liked
                      ? post.likeState.count - 1
                      : post.likeState.count + 1,
          };
          this.toastr.error('Failed to update like');
        }

        this.posts = [...this.posts];
        this.cdr.markForCheck();
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
  // COMMENTS
  // ───────────────────────────────────────────────────────────────────────────

  toggleComments(post: PostWithLikeState): void {
    post.showComments = !post.showComments;

    if (post.showComments && !post.commentsLoaded && !post.commentsLoading) {
      this.loadComments(post);
    }

    this.posts = [...this.posts];
    this.cdr.markForCheck();
  }

  loadComments(post: PostWithLikeState): void {
    post.commentsLoading = true;
    this.cdr.markForCheck();

    this.postService.getComments(post._id).subscribe({
      next: (res) => {
        const flat: Comment[] = res.data ?? [];
        post.comments        = this.buildCommentTree(flat);
        post.commentsLoading = false;
        post.commentsLoaded  = true;
        this.posts = [...this.posts];
        this.cdr.markForCheck();
      },
      error: () => {
        post.commentsLoading = false;
        this.toastr.error('Failed to load comments');
        this.cdr.markForCheck();
      },
    });
  }

  private buildCommentTree(flat: Comment[]): Comment[] {
    const map = new Map<string, Comment>();
    flat.forEach(c => map.set(c._id, { ...c, replies: [] }));
    const roots: Comment[] = [];
    map.forEach(c => {
      if (c.parentCommentId && map.has(c.parentCommentId)) {
        map.get(c.parentCommentId)!.replies!.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }

  submitComment(post: PostWithLikeState): void {
    const text = post.commentText?.trim();
    if (!text) return;

    const parentCommentId = post.replyingTo?.commentId ?? null;

    this.postService.postComment(post._id, text, parentCommentId).subscribe({
      next: () => {
        post.commentText    = '';
        post.replyingTo     = null;
        post.commentsLoaded = false;
        this.toastr.success('Comment posted');
        this.loadComments(post);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastr.error('Failed to post comment');
      },
    });
  }

  setReply(post: PostWithLikeState, comment: Comment): void {
    post.replyingTo = { commentId: comment._id, userName: comment.userId.name };
    this.posts = [...this.posts];
    this.cdr.markForCheck();
  }

  cancelReply(post: PostWithLikeState): void {
    post.replyingTo = null;
    this.posts = [...this.posts];
    this.cdr.markForCheck();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string | undefined): string {
    const colors = ['#1d9bf0','#00ba7c','#f4212e','#ff7a00','#7856ff','#ff3cac','#00c9ff','#f7c948'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return diff + 's';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }
}