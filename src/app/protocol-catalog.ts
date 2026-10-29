import { Injectable } from '@angular/core';

export type ProtocolScope = 'Global' | 'Regional' | 'Local';

export interface ProtocolRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  summary: string;
  scope: ProtocolScope;
  date: string;
  status: 'Published' | 'Needs review' | 'Draft';
  initials: string;
  color: string;
  reads: string;
}

interface NewProtocol {
  title: string;
  category: string;
  content: string;
  scope: ProtocolScope;
}

@Injectable({ providedIn: 'root' })
export class ProtocolCatalog {
  private readonly storageKey = 'spirit-embassy:protocols:v1';
  private readonly protocolsState = this.loadProtocols();

  get protocols(): readonly ProtocolRecord[] {
    return this.protocolsState;
  }

  createProtocol(input: NewProtocol): void {
    const title = input.title.trim();
    const content = input.content.trim();
    const summary = content
      ? content.length > 150 ? `${content.slice(0, 147).trimEnd()}...` : content
      : `Guidance for ${input.category.trim()} at ${input.scope.toLowerCase()} level.`;

    this.protocolsState.unshift({
      id: this.createId(),
      title,
      category: input.category.trim(),
      content,
      summary,
      scope: input.scope,
      date: new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()),
      status: 'Draft',
      initials: title.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase(),
      color: 'amber',
      reads: '0%'
    });
    this.persistProtocols();
  }

  isRead(protocolId: string, memberEmail: string): boolean {
    return localStorage.getItem(this.readKey(protocolId, memberEmail)) === 'true';
  }

  markAsRead(protocolId: string, memberEmail: string): void {
    localStorage.setItem(this.readKey(protocolId, memberEmail), 'true');
  }

  private loadProtocols(): ProtocolRecord[] {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) {
      const defaults = this.defaultProtocols();
      localStorage.setItem(this.storageKey, JSON.stringify(defaults));
      return defaults;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((item) => this.isProtocol(item))) {
      throw new Error('Stored protocol data is invalid and could not be loaded.');
    }
    return parsed;
  }

  private defaultProtocols(): ProtocolRecord[] {
    return [
      {
        id: 'global-sunday-service',
        title: 'Global Protocol for Sunday Service',
        category: 'Worship & Service',
        scope: 'Global',
        date: 'Oct 24, 2026',
        summary: 'A shared standard for welcoming, serving and gathering together.',
        content: 'Our Sunday gathering is a time to worship, welcome guests and serve our community. Every team member plays a part in creating a warm, safe and well-prepared environment. Arrive with enough time to prepare, follow your team lead and treat each person with care.',
        status: 'Published',
        initials: 'GS',
        color: 'amber',
        reads: '92%'
      },
      {
        id: 'safety-emergency-procedures',
        title: 'Safety & Emergency Procedures',
        category: 'Safety',
        scope: 'Global',
        date: 'Oct 18, 2026',
        summary: 'Know what to do and who to contact if an urgent situation arises.',
        content: 'Keep exits and walkways clear. If an emergency occurs, alert the designated local safety lead, follow their direction and contact emergency services where necessary. Do not share unverified information; keep members calm and account for the people in your care.',
        status: 'Needs review',
        initials: 'SE',
        color: 'blue',
        reads: '64%'
      },
      {
        id: 'guest-welcome-protocol',
        title: 'Guest Welcome Protocol',
        category: 'Hospitality',
        scope: 'Regional',
        date: 'Oct 12, 2026',
        summary: 'A thoughtful first welcome for visitors to our gatherings.',
        content: 'Greet every guest warmly, offer practical information about the gathering and ask before sharing contact details. Make space for questions without pressure and connect guests with a local host when they would like support.',
        status: 'Published',
        initials: 'GW',
        color: 'sage',
        reads: '78%'
      },
      {
        id: 'midweek-gathering-guidelines',
        title: 'Midweek Gathering Guidelines',
        category: 'Community',
        scope: 'Local',
        date: 'Oct 08, 2026',
        summary: 'Local guidance for our Wednesday community gathering.',
        content: 'The local team prepares the room, confirms the schedule and welcomes everyone as they arrive. Check with the branch leader if you have a question about the programme or your role.',
        status: 'Published',
        initials: 'MG',
        color: 'plum',
        reads: '89%'
      }
    ];
  }

  private persistProtocols(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.protocolsState));
  }

  private readKey(protocolId: string, memberEmail: string): string {
    return `spirit-embassy:protocol-read:${memberEmail.trim().toLowerCase()}:${protocolId}`;
  }

  private createId(): string {
    return `protocol-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private isProtocol(value: unknown): value is ProtocolRecord {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const protocol = value as Record<string, unknown>;
    return typeof protocol['id'] === 'string' &&
      typeof protocol['title'] === 'string' &&
      typeof protocol['category'] === 'string' &&
      typeof protocol['content'] === 'string' &&
      typeof protocol['summary'] === 'string' &&
      (protocol['scope'] === 'Global' || protocol['scope'] === 'Regional' || protocol['scope'] === 'Local') &&
      typeof protocol['date'] === 'string' &&
      (protocol['status'] === 'Published' || protocol['status'] === 'Needs review' || protocol['status'] === 'Draft') &&
      typeof protocol['initials'] === 'string' &&
      typeof protocol['color'] === 'string' &&
      typeof protocol['reads'] === 'string';
  }
}
