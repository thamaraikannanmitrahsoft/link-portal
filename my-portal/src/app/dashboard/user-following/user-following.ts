import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { PostService } from '../../service/postservice';
import { ToastrService } from 'ngx-toastr';

export interface FollowingUser {
  _id: string;
  name: string;
  email: string;
  isFollowing: boolean;
}

@Component({
  selector: 'app-user-following',
  imports: [CommonModule],
  templateUrl: './user-following.html',
  styleUrl: './user-following.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFollowing implements OnInit {

  following: FollowingUser[] = [];
  loading = true;
  error   = false;

  constructor(
    private postService: PostService,
    private toastr:      ToastrService,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('id') || '';
    this.loadFollowing(userId);
  }

  loadFollowing(userId: string): void {
    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    this.postService.getFollowing().subscribe({
      next: (res) => {
        this.following = (res.data ?? []).map((u: FollowingUser) => ({
          ...u,
          isFollowing: true,
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error   = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleFollow(user: FollowingUser): void {
    const api$ = user.isFollowing
      ? this.postService.unfollowUser(user._id)
      : this.postService.followUser(user._id);

    api$.subscribe({
      next: () => {
        this.following = this.following.map(u =>
          u._id === user._id ? { ...u, isFollowing: !u.isFollowing } : u
        );
        this.cdr.markForCheck();
      },
      error: () => this.toastr.error('Failed to update follow'),
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#1d9bf0', '#00ba7c', '#f4212e', '#ff7a00',
      '#7856ff', '#ff3cac', '#00c9ff', '#f7c948',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}