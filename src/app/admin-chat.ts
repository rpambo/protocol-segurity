import { Injectable } from '@angular/core';
import { DirectoryScope } from './member-directory';

export interface AdminChatIdentity {
  id: string;
  name: string;
  accountType: 'admin';
  status: 'Active';
}

export interface AdminChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
}

export interface AdminChatRoom {
  scope: DirectoryScope;
  country?: string;
  city?: string;
}

interface AdminChatState {
  rooms: Record<string, AdminChatMessage[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAdminChatMessage(value: unknown): value is AdminChatMessage {
  return isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['senderId'] === 'string' &&
    typeof value['senderName'] === 'string' &&
    typeof value['text'] === 'string' &&
    typeof value['sentAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['sentAt']));
}

function isAdminChatState(value: unknown): value is AdminChatState {
  if (!isRecord(value) || !isRecord(value['rooms'])) {
    return false;
  }
  return Object.entries(value['rooms']).every(([key, messages]) =>
    (key === 'Global' || key.startsWith('Regional:') || key.startsWith('Local:')) &&
    Array.isArray(messages) &&
    messages.every(isAdminChatMessage)
  );
}

@Injectable({ providedIn: 'root' })
export class AdminChat {
  private readonly storageKey = 'admin-chat-prototype-v1';

  getMessages(room: AdminChatRoom): AdminChatMessage[] {
    return this.readState().rooms[this.roomKey(room)] ?? [];
  }

  sendMessage(room: AdminChatRoom, sender: AdminChatIdentity, text: string): void {
    if (sender.accountType !== 'admin' || sender.status !== 'Active') {
      throw new Error('Only an active Admin account can send messages in this chat.');
    }

    const normalizedText = text.trim();
    if (!normalizedText || normalizedText.length > 1000) {
      throw new Error('Enter a message of 1 to 1,000 characters.');
    }
    if (room.scope !== 'Global' && !room.country?.trim()) {
      throw new Error('Choose a country for this Admin chat room.');
    }
    if (room.scope === 'Local' && !room.city?.trim()) {
      throw new Error('Choose a city for this Local Admin chat room.');
    }

    const state = this.readState();
    const key = this.roomKey(room);
    state.rooms[key] ??= [];
    state.rooms[key].push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderId: sender.id,
      senderName: sender.name,
      text: normalizedText,
      sentAt: new Date().toISOString()
    });
    state.rooms[key] = state.rooms[key].slice(-500);
    this.writeState(state);
  }

  private roomKey(room: AdminChatRoom): string {
    const country = room.country?.trim().toLocaleLowerCase() ?? '';
    const city = room.city?.trim().toLocaleLowerCase() ?? '';
    switch (room.scope) {
      case 'Global':
        return 'Global';
      case 'Regional':
        return `Regional:${country}`;
      case 'Local':
        return `Local:${country}:${city}`;
    }
  }

  private readState(): AdminChatState {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) {
      return { rooms: {} };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      throw new Error('Saved Admin chat data is unreadable. Clear this browser’s Admin chat storage and reload.', { cause: error });
    }
    if (Array.isArray(parsed) && parsed.every(isAdminChatMessage)) {
      return { rooms: { Global: parsed } };
    }
    if (!isAdminChatState(parsed)) {
      throw new Error('Saved Admin chat data is invalid. Clear this browser’s Admin chat storage and reload.');
    }
    return parsed;
  }

  private writeState(state: AdminChatState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
