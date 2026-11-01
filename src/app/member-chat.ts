import { Injectable } from '@angular/core';
import { DirectoryScope } from './member-directory';

export interface ChatIdentity {
  id: string;
  name: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
}

export interface PrivateChatInvite {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: string;
}

interface ChatState {
  rooms: Partial<Record<DirectoryScope, ChatMessage[]>>;
  invitations: PrivateChatInvite[];
  privateMessages: Record<string, ChatMessage[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['senderId'] === 'string' &&
    typeof value['senderName'] === 'string' &&
    typeof value['text'] === 'string' &&
    typeof value['sentAt'] === 'string';
}

function isPrivateChatInvite(value: unknown): value is PrivateChatInvite {
  return isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['senderId'] === 'string' &&
    typeof value['senderName'] === 'string' &&
    typeof value['senderEmail'] === 'string' &&
    typeof value['recipientId'] === 'string' &&
    typeof value['recipientName'] === 'string' &&
    typeof value['recipientEmail'] === 'string' &&
    (value['status'] === 'pending' || value['status'] === 'accepted' || value['status'] === 'declined') &&
    typeof value['sentAt'] === 'string';
}

function isChatState(value: unknown): value is ChatState {
  if (!isRecord(value) || !isRecord(value['rooms']) || !Array.isArray(value['invitations']) || !isRecord(value['privateMessages'])) {
    return false;
  }

  const validRooms = Object.entries(value['rooms']).every(([scope, messages]) =>
    (scope === 'Global' || scope === 'Regional' || scope === 'Local') &&
    Array.isArray(messages) &&
    messages.every(isChatMessage)
  );
  const validPrivateMessages = Object.values(value['privateMessages']).every((messages) =>
    Array.isArray(messages) && messages.every(isChatMessage)
  );
  return validRooms && value['invitations'].every(isPrivateChatInvite) && validPrivateMessages;
}

@Injectable({ providedIn: 'root' })
export class MemberChat {
  private readonly storageKey = 'member-chat-prototype-v1';

  getRoomMessages(scope: DirectoryScope): ChatMessage[] {
    return this.readState().rooms[scope] ?? [];
  }

  sendRoomMessage(scope: DirectoryScope, sender: ChatIdentity, text: string): void {
    const state = this.readState();
    const messages = state.rooms[scope] ?? [];
    messages.push(this.createMessage(sender, text));
    state.rooms[scope] = messages;
    this.writeState(state);
  }

  getInvitations(email: string): PrivateChatInvite[] {
    const normalizedEmail = email.toLowerCase();
    return this.readState().invitations.filter(
      (invite) => invite.senderEmail === normalizedEmail || invite.recipientEmail === normalizedEmail
    );
  }

  sendInvite(sender: ChatIdentity, recipient: ChatIdentity): void {
    const state = this.readState();
    const senderEmail = sender.email.toLowerCase();
    const recipientEmail = recipient.email.toLowerCase();
    if (senderEmail === recipientEmail) {
      throw new Error('You cannot invite yourself to a private conversation.');
    }

    const existing = state.invitations.find((invite) =>
      invite.status !== 'declined' &&
      ((invite.senderEmail === senderEmail && invite.recipientEmail === recipientEmail) ||
        (invite.senderEmail === recipientEmail && invite.recipientEmail === senderEmail))
    );
    if (existing) {
      throw new Error(existing.status === 'accepted'
        ? 'A private conversation with this person is already open.'
        : 'There is already a pending invitation with this person.');
    }

    state.invitations.push({
      id: this.createId(),
      senderId: sender.id,
      senderName: sender.name,
      senderEmail,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientEmail,
      status: 'pending',
      sentAt: new Date().toISOString()
    });
    this.writeState(state);
  }

  respondToInvite(inviteId: string, recipientEmail: string, accepted: boolean): void {
    const state = this.readState();
    const invite = state.invitations.find((item) => item.id === inviteId);
    if (!invite || invite.recipientEmail !== recipientEmail.toLowerCase() || invite.status !== 'pending') {
      throw new Error('This invitation is no longer available for your account.');
    }
    invite.status = accepted ? 'accepted' : 'declined';
    this.writeState(state);
  }

  getPrivateMessages(invite: PrivateChatInvite): ChatMessage[] {
    if (invite.status !== 'accepted') {
      return [];
    }
    return this.readState().privateMessages[invite.id] ?? [];
  }

  sendPrivateMessage(inviteId: string, sender: ChatIdentity, text: string): void {
    const state = this.readState();
    const invite = state.invitations.find((item) =>
      item.id === inviteId &&
      item.status === 'accepted' &&
      (item.senderEmail === sender.email.toLowerCase() || item.recipientEmail === sender.email.toLowerCase())
    );
    if (!invite) {
      throw new Error('Accept a private invitation before sending messages.');
    }

    const messages = state.privateMessages[inviteId] ?? [];
    messages.push(this.createMessage(sender, text));
    state.privateMessages[inviteId] = messages;
    this.writeState(state);
  }

  private createMessage(sender: ChatIdentity, text: string): ChatMessage {
    return {
      id: this.createId(),
      senderId: sender.id,
      senderName: sender.name,
      text: text.trim(),
      sentAt: new Date().toISOString()
    };
  }

  private createId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private readState(): ChatState {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return { rooms: {}, invitations: [], privateMessages: {} };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      throw new Error('Saved chat data is unreadable. Clear this browser’s chat storage and reload the page.', { cause: error });
    }
    if (!isChatState(parsed)) {
      throw new Error('Saved chat data is invalid. Clear this browser’s chat storage and reload the page.');
    }
    return parsed;
  }

  private writeState(state: ChatState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
