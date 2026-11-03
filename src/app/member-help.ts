import { Injectable } from '@angular/core';
import { DirectoryAdminLevel } from './member-directory';

export type HelpRequestStatus = 'Open' | 'In progress' | 'Resolved';

export interface HelpResponse {
  id: string;
  responderEmail: string;
  responderName: string;
  message: string;
  sentAt: string;
}

export interface MemberHelpRequest {
  id: string;
  memberEmail: string;
  memberName: string;
  country: string;
  city: string;
  title: string;
  message: string;
  status: HelpRequestStatus;
  createdAt: string;
  updatedAt: string;
  responses: HelpResponse[];
}

interface HelpState {
  requests: MemberHelpRequest[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isResponse(value: unknown): value is HelpResponse {
  return isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['responderEmail'] === 'string' &&
    typeof value['responderName'] === 'string' &&
    typeof value['message'] === 'string' &&
    typeof value['sentAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['sentAt']));
}

function isHelpRequest(value: unknown): value is MemberHelpRequest {
  return isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['memberEmail'] === 'string' &&
    typeof value['memberName'] === 'string' &&
    typeof value['country'] === 'string' &&
    typeof value['city'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['message'] === 'string' &&
    (value['status'] === 'Open' || value['status'] === 'In progress' || value['status'] === 'Resolved') &&
    typeof value['createdAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['createdAt'])) &&
    typeof value['updatedAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['updatedAt'])) &&
    Array.isArray(value['responses']) &&
    value['responses'].every(isResponse);
}

function isHelpState(value: unknown): value is HelpState {
  return isRecord(value) && Array.isArray(value['requests']) && value['requests'].every(isHelpRequest);
}

@Injectable({ providedIn: 'root' })
export class MemberHelp {
  private readonly storageKey = 'spirit-embassy:member-help:v1';

  getForMember(email: string): MemberHelpRequest[] {
    const normalizedEmail = email.trim().toLowerCase();
    return this.readState().requests
      .filter((request) => request.memberEmail === normalizedEmail)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  getForAdmin(
    level: DirectoryAdminLevel,
    country: string,
    city: string,
    status: 'pending' | 'resolved'
  ): MemberHelpRequest[] {
    return this.readState().requests
      .filter((request) => {
        const isResolved = request.status === 'Resolved';
        const matchesStatus = status === 'resolved' ? isResolved : !isResolved;
        if (!matchesStatus) {
          return false;
        }
        if (level === 'global-admin') {
          return true;
        }
        if (!country.trim() || !this.sameLocation(request.country, country)) {
          return false;
        }
        return level === 'regional-admin' ||
          (Boolean(city.trim()) && this.sameLocation(request.city, city));
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  create(
    member: { email: string; name: string; country: string; city: string },
    title: string,
    message: string
  ): void {
    const normalizedTitle = title.trim();
    const normalizedMessage = message.trim();
    const normalizedEmail = member.email.trim().toLowerCase();
    if (!normalizedEmail || !member.name.trim()) {
      throw new Error('Your account details are not available. Sign in again and retry.');
    }
    if (!normalizedTitle || normalizedTitle.length > 120) {
      throw new Error('Enter a title between 1 and 120 characters.');
    }
    if (!normalizedMessage || normalizedMessage.length > 4000) {
      throw new Error('Enter a message between 1 and 4,000 characters.');
    }

    const state = this.readState();
    const now = new Date().toISOString();
    state.requests.unshift({
      id: `help-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      memberEmail: normalizedEmail,
      memberName: member.name.trim(),
      country: member.country.trim(),
      city: member.city.trim(),
      title: normalizedTitle,
      message: normalizedMessage,
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      responses: []
    });
    this.writeState(state);
  }

  reply(
    requestId: string,
    level: DirectoryAdminLevel,
    country: string,
    city: string,
    responder: { email: string; name: string },
    message: string
  ): void {
    const normalizedMessage = message.trim();
    if (!normalizedMessage || normalizedMessage.length > 4000) {
      throw new Error('Enter a response between 1 and 4,000 characters.');
    }
    const state = this.readState();
    const request = this.findAccessibleRequest(state, requestId, level, country, city);
    if (request.status === 'Resolved') {
      throw new Error('This request has already been resolved.');
    }
    request.responses.push({
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      responderEmail: responder.email.trim().toLowerCase(),
      responderName: responder.name.trim(),
      message: normalizedMessage,
      sentAt: new Date().toISOString()
    });
    request.status = 'In progress';
    request.updatedAt = new Date().toISOString();
    this.writeState(state);
  }

  resolve(requestId: string, level: DirectoryAdminLevel, country: string, city: string): void {
    const state = this.readState();
    const request = this.findAccessibleRequest(state, requestId, level, country, city);
    if (request.status === 'Resolved') {
      return;
    }
    if (!request.responses.length) {
      throw new Error('Send a response before marking this request as resolved.');
    }
    request.status = 'Resolved';
    request.updatedAt = new Date().toISOString();
    this.writeState(state);
  }

  private findAccessibleRequest(
    state: HelpState,
    requestId: string,
    level: DirectoryAdminLevel,
    country: string,
    city: string
  ): MemberHelpRequest {
    const request = state.requests.find((item) => item.id === requestId);
    if (!request || !this.canAccess(request, level, country, city)) {
      throw new Error('This help request is unavailable in your administrative scope.');
    }
    return request;
  }

  private canAccess(request: MemberHelpRequest, level: DirectoryAdminLevel, country: string, city: string): boolean {
    if (level === 'global-admin') {
      return true;
    }
    if (!country.trim() || !this.sameLocation(request.country, country)) {
      return false;
    }
    return level === 'regional-admin' ||
      (Boolean(city.trim()) && this.sameLocation(request.city, city));
  }

  private sameLocation(first: string, second: string): boolean {
    return first.trim().toLocaleLowerCase() === second.trim().toLocaleLowerCase();
  }

  private readState(): HelpState {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) {
      return { requests: [] };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      throw new Error('Saved help requests are unreadable. Clear this browser’s help-message storage and reload.', { cause: error });
    }
    if (!isHelpState(parsed)) {
      throw new Error('Saved help requests are invalid. Clear this browser’s help-message storage and reload.');
    }
    return parsed;
  }

  private writeState(state: HelpState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
