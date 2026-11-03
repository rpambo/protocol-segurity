import { Injectable } from '@angular/core';

export type CommunityNoteMediaType = 'none' | 'image' | 'video';

export interface GlobalCommunityNote {
  title: string;
  message: string;
  mediaType: CommunityNoteMediaType;
  mediaUrl: string;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
}

const initialNote: GlobalCommunityNote = {
  title: 'Rooted in service. Growing together.',
  message: 'Every gathering is an opportunity to welcome one another, serve with purpose and strengthen the bonds that make us one community.',
  mediaType: 'none',
  mediaUrl: '',
  isPublished: true,
  publishedAt: null,
  updatedAt: null
};

@Injectable({ providedIn: 'root' })
export class GlobalCommunityNoteStore {
  private readonly storageKey = 'spirit-embassy:global-community-note:v1';
  private currentNote = initialNote;
  loadError = '';

  constructor() {
    try {
      this.currentNote = this.load();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'The saved global community note could not be loaded.';
    }
  }

  get note(): GlobalCommunityNote {
    return this.currentNote;
  }

  save(note: GlobalCommunityNote): void {
    const normalizedNote: GlobalCommunityNote = {
      ...note,
      title: note.title.trim(),
      message: note.message.trim(),
      mediaUrl: note.mediaType === 'none' ? '' : note.mediaUrl.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!normalizedNote.title || !normalizedNote.message) {
      throw new Error('Enter a title and message before saving the community note.');
    }

    if (normalizedNote.mediaType !== 'none') {
      let mediaUrl: URL;
      try {
        mediaUrl = new URL(normalizedNote.mediaUrl);
      } catch {
        throw new Error('Enter a valid URL for the image or video.');
      }
      if (mediaUrl.protocol !== 'https:' && mediaUrl.protocol !== 'http:') {
        throw new Error('The image or video URL must use HTTP or HTTPS.');
      }
    }

    localStorage.setItem(this.storageKey, JSON.stringify(normalizedNote));
    this.currentNote = normalizedNote;
    this.loadError = '';
  }

  private load(): GlobalCommunityNote {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return initialNote;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!this.isCommunityNote(parsed)) {
      throw new Error('The saved global community note has an invalid format.');
    }
    return parsed;
  }

  private isCommunityNote(value: unknown): value is GlobalCommunityNote {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const note = value as Partial<GlobalCommunityNote>;
    return typeof note.title === 'string' &&
      typeof note.message === 'string' &&
      (note.mediaType === 'none' || note.mediaType === 'image' || note.mediaType === 'video') &&
      typeof note.mediaUrl === 'string' &&
      typeof note.isPublished === 'boolean' &&
      (note.publishedAt === null || (typeof note.publishedAt === 'string' && !Number.isNaN(Date.parse(note.publishedAt)))) &&
      (note.updatedAt === null || (typeof note.updatedAt === 'string' && !Number.isNaN(Date.parse(note.updatedAt))));
  }
}
