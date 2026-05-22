import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { PostService } from '../../service/postservice';

interface MediaPreview {
  url: string | ArrayBuffer | null;
  type: 'image' | 'video' | 'gif';
  file: File;
}

interface EmojiItem {
  slug: string;
  character: string;
  unicodeName: string;
  codePoint: string;
  group: string;
  subGroup: string;
}

interface EmojiCategory {
  group: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
  loaded: boolean;
}

@Component({
  selector: 'app-post-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './post-create.html',
  styleUrl: './post-create.scss'
})
export class PostCreateComponent implements OnInit {

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  // ── Post state ──────────────────────────────────────────────────────────────
  postContent = '';
  mediaPreviews: MediaPreview[] = [];
  isLoading = false;

  // ── Emoji picker state ──────────────────────────────────────────────────────
  showEmojiPicker = false;
  cursorPosition = 0;
  emojiSearchQuery = '';
  searchResults: EmojiItem[] = [];
  isSearching = false;
  isLoadingEmojis = false;
  private searchDebounce: any = null;

  // ── Emoji API ───────────────────────────────────────────────────────────────
  // Free API key from https://emoji-api.com — replace with your own key
  private readonly EMOJI_API_KEY = 'fbc4b0fc4e1497373f1f51efaf115ca8ee781e73';
  private readonly EMOJI_API_BASE = 'https://emoji-api.com';

  emojiCategories: EmojiCategory[] = [
    { group: 'smileys-emotion',  label: 'Smileys',    icon: '😊', emojis: [], loaded: false },
    { group: 'people-body',      label: 'People',     icon: '👋', emojis: [], loaded: false },
    { group: 'animals-nature',   label: 'Nature',     icon: '🐾', emojis: [], loaded: false },
    { group: 'food-drink',       label: 'Food',       icon: '🍕', emojis: [], loaded: false },
    { group: 'travel-places',    label: 'Travel',     icon: '✈️', emojis: [], loaded: false },
    { group: 'activities',       label: 'Activities', icon: '⚽', emojis: [], loaded: false },
    { group: 'objects',          label: 'Objects',    icon: '💡', emojis: [], loaded: false },
    { group: 'symbols',          label: 'Symbols',    icon: '❤️', emojis: [], loaded: false },
  ];

  activeEmojiCategoryIndex = 0;

  constructor(
    private postService: PostService,
    private toastr: ToastrService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCategoryEmojis(0);
  }

  // ── Emoji API calls ─────────────────────────────────────────────────────────

  loadCategoryEmojis(index: number): void {
    const cat = this.emojiCategories[index];
    if (cat.loaded) return;

    this.isLoadingEmojis = true;

    this.http.get<EmojiItem[]>(
      `${this.EMOJI_API_BASE}/emojis?category=${cat.group}&access_key=${this.EMOJI_API_KEY}`
    ).subscribe({
      next: (data) => {
        cat.emojis = data || [];
        cat.loaded = true;
        this.isLoadingEmojis = false;
      },
      error: () => {
        this.isLoadingEmojis = false;
        this.toastr.error('Failed to load emojis');
      }
    });
  }

  onEmojiSearch(query: string): void {
    clearTimeout(this.searchDebounce);

    if (!query.trim()) {
      this.searchResults = [];
      this.isSearching = false;
      this.isLoadingEmojis = false;
      return;
    }

    this.isSearching = true;
    this.isLoadingEmojis = true;

    this.searchDebounce = setTimeout(() => {
      this.http.get<EmojiItem[]>(
        `${this.EMOJI_API_BASE}/emojis?search=${encodeURIComponent(query)}&access_key=${this.EMOJI_API_KEY}`
      ).subscribe({
        next: (data) => {
          this.searchResults = data || [];
          this.isLoadingEmojis = false;
        },
        error: () => {
          this.isLoadingEmojis = false;
        }
      });
    }, 350);
  }

  onCategoryChange(index: number): void {
    this.activeEmojiCategoryIndex = index;
    this.emojiSearchQuery = '';
    this.isSearching = false;
    this.loadCategoryEmojis(index);
  }

  get activeEmojis(): EmojiItem[] {
    return this.isSearching
      ? this.searchResults
      : this.emojiCategories[this.activeEmojiCategoryIndex].emojis;
  }

  // ── Emoji insertion ─────────────────────────────────────────────────────────

  insertEmoji(character: string): void {
    const before = this.postContent.slice(0, this.cursorPosition);
    const after  = this.postContent.slice(this.cursorPosition);
    this.postContent = before + character + after;
    this.cursorPosition += character.length;

    setTimeout(() => {
      if (this.textareaRef) {
        this.textareaRef.nativeElement.focus();
        this.textareaRef.nativeElement.setSelectionRange(
          this.cursorPosition,
          this.cursorPosition
        );
      }
    }, 0);
  }

  toggleEmojiPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.textareaRef) {
      this.cursorPosition = this.textareaRef.nativeElement.selectionStart;
    }
  }

  // ── Close picker on outside click ───────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-wrapper')) {
      this.showEmojiPicker = false;
    }
  }

  // ── Cursor tracking ─────────────────────────────────────────────────────────

  onTextareaClick(event: MouseEvent): void {
    this.cursorPosition = (event.target as HTMLTextAreaElement).selectionStart;
  }

  onTextareaKeyup(event: KeyboardEvent): void {
    this.cursorPosition = (event.target as HTMLTextAreaElement).selectionStart;
  }

  // ── Media handling ──────────────────────────────────────────────────────────

  onMediaSelect(event: any, type: 'image' | 'video' | 'gif'): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const remaining = 4 - this.mediaPreviews.length;
    const toAdd = Math.min(files.length, remaining);

    for (let i = 0; i < toAdd; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        this.mediaPreviews.push({ url: reader.result, type, file });
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }

  removeMedia(index: number): void {
    this.mediaPreviews.splice(index, 1);
  }

  getMediaGridClass(): string {
    const count = this.mediaPreviews.length;
    if (count === 1) return 'grid-1';
    if (count === 2) return 'grid-2';
    if (count === 3) return 'grid-3';
    return 'grid-4';
  }

  // ── Post submission ─────────────────────────────────────────────────────────

  createPost(): void {
    if (!this.postContent.trim() && this.mediaPreviews.length === 0) {
      this.toastr.warning('Please add some text or media');
      return;
    }

    const formData = new FormData();
    formData.append('text', this.postContent);

    this.mediaPreviews.forEach((preview, index) => {
      formData.append(`media_${index}`, preview.file);
      formData.append(`media_type_${index}`, preview.type);
    });

    this.isLoading = true;

    this.postService.createPost(formData).subscribe({
      next: () => {
        this.toastr.success('Post created successfully');
        this.postContent = '';
        this.mediaPreviews = [];
        this.isLoading = false;
        this.showEmojiPicker = false;
      },
      error: () => {
        this.toastr.error('Failed to create post');
        this.isLoading = false;
      }
    });
  }
}