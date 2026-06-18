import { HttpClient }    from '@angular/common/http';
import { Injectable }    from '@angular/core';
import { Observable }    from 'rxjs';
import { environment }   from '../../app/environments/environment';
import { SocketService } from '../service/socket-service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface MediaItem {
  type: string;
  url:  string;
  _id:  string;
}

export interface PostUser {
  _id:   string;
  name:  string;
  email: string;
}

export interface Post {
  _id:           string;
  userId:        PostUser;
  text:          string;
  media:         MediaItem[];
  likesCount:    number;
  commentsCount: number;
  createdAt:     string;
  updatedAt:     string;
  __v:           number;
  bookmarked?:   boolean;
}

export interface PostsResponse {
  status: number;
  data:   Post[];
}

export interface UserProfile {
  _id:            string;
  name:           string;
  email:          string;
  followersCount: number;
  followingCount: number;
  postsCount:     number;
  deviceToken?:   string;
}

export interface UserPostsResponse {
  status: number;
  user:   UserProfile;
  posts:  Post[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PostService {

  private baseUrl = environment.apiUrl;

  // ✅ No getHeaders() helper needed — interceptor adds withCredentials automatically

  constructor(
    private http:          HttpClient,
    private socketService: SocketService,
  ) {}

  // ─── Feed ──────────────────────────────────────────────────────────────────

  getAllPosts(): Observable<PostsResponse> {
    // ✅ No headers — interceptor sends cookie automatically
    return this.http.get<PostsResponse>(`${this.baseUrl}/feed`)
  }

  // ─── User posts ────────────────────────────────────────────────────────────

  getUserPosts(): Observable<UserPostsResponse> {
    return this.http.get<UserPostsResponse>(`${this.baseUrl}/user`);
  }

  // ─── Socket Likes ──────────────────────────────────────────────────────────

  likePostSocket(postId: string): void {
    this.socketService.emit('like:post', { postId });
  }

  unlikePostSocket(postId: string): void {
    this.socketService.emit('unlike:post', { postId });
  }

  onLikeAck(): Observable<{ postId: string; success: boolean; likesCount: number }> {
    return this.socketService.on('like:ack');
  }

  // ─── Create / Delete post ──────────────────────────────────────────────────

  createPost(formData: FormData): Observable<any> {
    // ✅ No Authorization header — interceptor handles it
    // ✅ Do NOT set Content-Type for FormData — browser sets boundary automatically
    return this.http.post(`${this.baseUrl}/userPost`, formData);
  }

  deletePost(postId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/userPost/${postId}`);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  getComments(postId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/userPost/${postId}/comments`);
  }

  postComment(
    postId:          string,
    text:            string,
    parentCommentId: string | null,
  ): Observable<any> {
    const body: Record<string, any> = { text };
    if (parentCommentId) body['parentCommentId'] = parentCommentId;
    return this.http.post(`${this.baseUrl}/userPost/${postId}/comments`, body);
  }

  // ─── Follow ────────────────────────────────────────────────────────────────

  getFollowers(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/followers/${userId}`);
  }

  getFollowing(): Observable<any> {
    return this.http.get(`${this.baseUrl}/following/me`);
  }

  followUser(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/follow/${userId}`, {});
  }

  unfollowUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/follow/${userId}`);
  }
}