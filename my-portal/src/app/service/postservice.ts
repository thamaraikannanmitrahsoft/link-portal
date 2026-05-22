import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable }               from '@angular/core';
import { Observable }               from 'rxjs';
import { environment }              from '../../app/environments/environment';

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
  // UI-only flags (not from server)
  bookmarked?: boolean;
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

  constructor(private http: HttpClient) {}

  // ─── Auth header helper ────────────────────────────────────────────────────

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    });
  }

  // ─── Feed ──────────────────────────────────────────────────────────────────

  getAllPosts(): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(
      `${this.baseUrl}/feed`,
      { headers: this.getHeaders().set('Cache-Control', 'no-cache') },
    );
  }

  // ─── User posts ────────────────────────────────────────────────────────────

  getUserPosts(): Observable<UserPostsResponse> {
    return this.http.get<UserPostsResponse>(
      `${this.baseUrl}/user`,
      { headers: this.getHeaders().set('Cache-Control', 'no-cache') },
    );
  }

  // ─── Likes ─────────────────────────────────────────────────────────────────
  // POST   /api/userPost/:postId/like  →  like a post
  // DELETE /api/userPost/:postId/like  →  unlike a post

  likePost(postId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/userPost/${postId}/like`,
      {},
      { headers: this.getHeaders() },
    );
  }

  unlikePost(postId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/userPost/${postId}/like`,
      { headers: this.getHeaders() },
    );
  }

  // ─── Create / Delete post ──────────────────────────────────────────────────

  createPost(formData: FormData): Observable<any> {
    const token   = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post(`${this.baseUrl}/userPost`, formData, { headers });
  }

  deletePost(postId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/userPost/${postId}`,
      { headers: this.getHeaders().set('Cache-Control', 'no-cache') },
    );
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  getComments(postId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/feed/comments/${postId}`,
      { headers: this.getHeaders() },
    );
  }

  addComment(postId: string, text: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/feed/comments/${postId}`,
      { text },
      { headers: this.getHeaders() },
    );
  }
 getFollowers(userId: string): Observable<any> {
  return this.http.get(
    `${this.baseUrl}/followers/${userId}`,
    { headers: this.getHeaders() }
  );
}

getFollowing(): Observable<any> {
  return this.http.get(
    `${this.baseUrl}/following/me`,
    { headers: this.getHeaders() }
  );
}

followUser(userId: string): Observable<any> {
  return this.http.post(
    `${this.baseUrl}/follow/${userId}`,
    {},
    { headers: this.getHeaders() }
  );
}

unfollowUser(userId: string): Observable<any> {
  return this.http.delete(
    `${this.baseUrl}/follow/${userId}`,
    { headers: this.getHeaders() }
  );
}
}