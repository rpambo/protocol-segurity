import { Injectable } from '@angular/core';

export type DirectoryScope = 'Global' | 'Regional' | 'Local';
export type DirectoryTitle = 'Member' | 'Officer' | 'Leader';
export type DirectoryAdminLevel = 'global-admin' | 'regional-admin' | 'local-admin';
export type DirectoryAccountType = 'admin' | 'member' | DirectoryAdminLevel;

export interface DirectoryLocation {
  country: string;
  city: string;
}

export interface DirectoryPerson {
  id: string;
  name: string;
  role: string;
  email?: string;
  emailVisible?: boolean;
  accountType?: DirectoryAccountType;
  country?: string;
  city?: string;
  scope: DirectoryScope;
  region: string;
  branch: string;
  status: 'Active' | 'Invite pending' | 'Blocked';
  statusBeforeBlock?: 'Active' | 'Invite pending';
  initials: string;
  tone: 'gold' | 'sage' | 'plum' | 'blue';
  about: string;
}

export interface DirectoryAuditEvent {
  id: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  module: string;
  scope: DirectoryScope;
  country: string;
  city: string;
  occurredAt: string;
  result: 'Success' | 'Blocked';
}

@Injectable({ providedIn: 'root' })
export class MemberDirectory {
  private readonly storageKey = 'spirit-embassy:directory-people:v1';
  private readonly storedState = this.loadPeople();
  private readonly peopleState = this.storedState.people;
  private readonly removedEmails = this.storedState.removedEmails;
  private readonly auditState = this.storedState.auditEvents;

  get people(): readonly DirectoryPerson[] {
    return this.peopleState;
  }

  get auditEvents(): readonly DirectoryAuditEvent[] {
    return this.auditState;
  }

  getAssignableAccountTypes(adminLevel: DirectoryAdminLevel): readonly DirectoryAccountType[] {
    switch (adminLevel) {
      case 'global-admin':
        return ['member', 'global-admin', 'regional-admin', 'local-admin'];
      case 'regional-admin':
        return ['member', 'regional-admin', 'local-admin'];
      case 'local-admin':
        return ['member'];
    }
  }

  addPerson(
    name: string,
    email: string,
    title: DirectoryTitle,
    accountType: DirectoryAccountType,
    adminLevel: DirectoryAdminLevel,
    creatorLocation: DirectoryLocation,
    selectedLocation: DirectoryLocation,
    actorEmail: string
  ): void {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName) {
      throw new Error("Enter a person's full name.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.');
    }
    if (this.peopleState.some((person) => person.email?.toLowerCase() === normalizedEmail)) {
      throw new Error('An entry with this email address already exists.');
    }
    if (!this.getAssignableAccountTypes(adminLevel).includes(accountType)) {
      throw new Error('Your Admin level cannot create this account type.');
    }

    let location: DirectoryLocation;
    if (adminLevel === 'local-admin') {
      location = creatorLocation;
    } else {
      location = selectedLocation;
      if (adminLevel === 'regional-admin' && location.country !== creatorLocation.country) {
        throw new Error('Regional Admins can only create entries in their assigned country.');
      }
    }
    if (!location.country || !location.city) {
      throw new Error('A country and city must be assigned before creating this entry.');
    }

    const person: DirectoryPerson = {
      id: this.createPersonId(),
      name: normalizedName,
      email: normalizedEmail,
      accountType,
      country: location.country,
      city: location.city,
      role: title,
      scope: accountType === 'global-admin' ? 'Global' : accountType === 'regional-admin' ? 'Regional' : 'Local',
      region: location.country,
      branch: location.city,
      status: 'Invite pending',
      initials: normalizedName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      tone: title === 'Leader' ? 'gold' : title === 'Officer' ? 'sage' : 'blue',
      about: `A ${title.toLowerCase()} in the community.`
    };

    this.peopleState.push(person);
    this.recordAuditEvent({
      actorEmail,
      actorRole: this.accountLevelLabel(adminLevel),
      action: 'Account created',
      target: person.name,
      module: 'Protocol & Security',
      scope: person.scope,
      country: person.country ?? '',
      city: person.city ?? '',
      result: 'Success'
    });
    this.persistPeople();
  }

  findPerson(id: string | null): DirectoryPerson | null {
    return id ? this.peopleState.find((person) => person.id === id) ?? null : null;
  }

  findByEmail(email: string): DirectoryPerson | null {
    const normalizedEmail = email.trim().toLowerCase();
    return this.peopleState.find((person) => person.email?.toLowerCase() === normalizedEmail) ?? null;
  }

  canManageAccount(
    target: DirectoryPerson,
    adminLevel: DirectoryAdminLevel,
    creatorLocation: DirectoryLocation,
    actorEmail: string
  ): boolean {
    if (target.email?.toLowerCase() === actorEmail.trim().toLowerCase()) {
      return false;
    }

    const targetLevel = this.accountLevel(target);
    if (adminLevel === 'global-admin') {
      return targetLevel < 3;
    }
    if (adminLevel === 'regional-admin') {
      return targetLevel < 2 && Boolean(creatorLocation.country) &&
        target.country?.toLowerCase() === creatorLocation.country.toLowerCase();
    }
    return targetLevel === 0 && Boolean(creatorLocation.country && creatorLocation.city) &&
      target.country?.toLowerCase() === creatorLocation.country.toLowerCase() &&
      target.city?.toLowerCase() === creatorLocation.city.toLowerCase();
  }

  setAccountBlocked(
    id: string,
    blocked: boolean,
    adminLevel: DirectoryAdminLevel,
    creatorLocation: DirectoryLocation,
    actorEmail: string
  ): void {
    const target = this.peopleState.find((person) => person.id === id);
    if (!target || !this.canManageAccount(target, adminLevel, creatorLocation, actorEmail)) {
      throw new Error('You do not have permission to change this account.');
    }

    if (blocked && target.status !== 'Blocked') {
      target.statusBeforeBlock = target.status === 'Active' ? 'Active' : 'Invite pending';
      target.status = 'Blocked';
      this.recordAuditEvent({
        actorEmail,
        actorRole: this.accountLevelLabel(adminLevel),
        action: 'Account blocked',
        target: target.name,
        module: 'Admins & accounts',
        scope: target.scope,
        country: target.country ?? '',
        city: target.city ?? '',
        result: 'Success'
      });
    } else if (!blocked && target.status === 'Blocked') {
      target.status = target.statusBeforeBlock ?? 'Invite pending';
      delete target.statusBeforeBlock;
      this.recordAuditEvent({
        actorEmail,
        actorRole: this.accountLevelLabel(adminLevel),
        action: 'Account unblocked',
        target: target.name,
        module: 'Admins & accounts',
        scope: target.scope,
        country: target.country ?? '',
        city: target.city ?? '',
        result: 'Success'
      });
    }
    this.persistPeople();
  }

  removeAccount(
    id: string,
    adminLevel: DirectoryAdminLevel,
    creatorLocation: DirectoryLocation,
    actorEmail: string
  ): void {
    const index = this.peopleState.findIndex((person) => person.id === id);
    const target = this.peopleState[index];
    if (!target || !this.canManageAccount(target, adminLevel, creatorLocation, actorEmail)) {
      throw new Error('You do not have permission to remove this account.');
    }
    this.peopleState.splice(index, 1);
    if (target.email) {
      this.removedEmails.push(target.email.toLowerCase());
    }
    this.recordAuditEvent({
      actorEmail,
      actorRole: this.accountLevelLabel(adminLevel),
      action: 'Account removed',
      target: target.name,
      module: 'Admins & accounts',
      scope: target.scope,
      country: target.country ?? '',
      city: target.city ?? '',
      result: 'Success'
    });
    this.persistPeople();
  }

  recordSuccessfulSignIn(email: string, surface: 'Admin' | 'Member'): void {
    const person = this.findByEmail(email);
    this.recordAuditEvent({
      actorEmail: email,
      actorRole: person && this.isAdminAccount(person)
        ? this.accountLevelLabel(this.levelForAccount(person))
        : surface === 'Admin' ? 'Admin' : 'Member',
      action: 'Successful sign-in',
      target: surface,
      module: 'Authentication',
      scope: person?.scope ?? 'Local',
      country: person?.country ?? '',
      city: person?.city ?? '',
      result: 'Success'
    });
    this.persistPeople();
  }

  recordBlockedSignIn(email: string, surface: 'Admin' | 'Member'): void {
    const person = this.findByEmail(email);
    this.recordAuditEvent({
      actorEmail: email,
      actorRole: surface === 'Admin' && person ? this.accountLevelLabel(this.levelForAccount(person)) : surface,
      action: 'Sign-in denied',
      target: surface,
      module: 'Authentication',
      scope: person?.scope ?? 'Local',
      country: person?.country ?? '',
      city: person?.city ?? '',
      result: 'Blocked'
    });
    this.persistPeople();
  }

  recordSuccessfulSignOut(email: string, surface: 'Admin' | 'Member'): void {
    const person = this.findByEmail(email);
    this.recordAuditEvent({
      actorEmail: email,
      actorRole: person && this.isAdminAccount(person)
        ? this.accountLevelLabel(this.levelForAccount(person))
        : surface === 'Admin' ? 'Admin' : 'Member',
      action: 'Successful sign-out',
      target: surface,
      module: 'Authentication',
      scope: person?.scope ?? 'Local',
      country: person?.country ?? '',
      city: person?.city ?? '',
      result: 'Success'
    });
    this.persistPeople();
  }

  isBlockedEmail(email: string): boolean {
    return this.findByEmail(email)?.status === 'Blocked';
  }

  isRemovedEmail(email: string): boolean {
    return this.removedEmails.includes(email.trim().toLowerCase());
  }

  isAdminAccount(person: DirectoryPerson): boolean {
    return person.accountType === 'admin' ||
      person.accountType === 'global-admin' ||
      person.accountType === 'regional-admin' ||
      person.accountType === 'local-admin';
  }

  private accountLevel(person: DirectoryPerson): number {
    switch (person.accountType) {
      case 'global-admin':
        return 3;
      case 'regional-admin':
        return 2;
      case 'local-admin':
        return 1;
      case 'admin':
        return person.scope === 'Global' ? 3 : person.scope === 'Regional' ? 2 : 1;
      default:
        return 0;
    }
  }

  private levelForAccount(person: DirectoryPerson | null): DirectoryAdminLevel {
    if (person?.accountType === 'global-admin' || person?.accountType === 'regional-admin' || person?.accountType === 'local-admin') {
      return person.accountType;
    }
    if (person?.accountType === 'admin') {
      return person.scope === 'Global' ? 'global-admin' : person.scope === 'Regional' ? 'regional-admin' : 'local-admin';
    }
    return 'local-admin';
  }

  private accountLevelLabel(adminLevel: DirectoryAdminLevel): string {
    switch (adminLevel) {
      case 'global-admin':
        return 'Global Admin';
      case 'regional-admin':
        return 'Regional Admin';
      case 'local-admin':
        return 'Local Admin';
    }
  }

  private recordAuditEvent(event: Omit<DirectoryAuditEvent, 'id' | 'actorName' | 'actorEmail' | 'actorRole' | 'occurredAt'> & {
    actorEmail: string;
    actorRole: string;
  }): void {
    const actorEmail = event.actorEmail.trim().toLowerCase();
    const actor = this.findByEmail(actorEmail);
    this.auditState.unshift({
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorName: actor?.name ?? actorEmail,
      actorEmail,
      occurredAt: new Date().toISOString()
    });
    this.auditState.length = Math.min(this.auditState.length, 500);
  }

  private loadPeople(): { people: DirectoryPerson[]; removedEmails: string[]; auditEvents: DirectoryAuditEvent[] } {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) {
      return { people: this.defaultPeople(), removedEmails: [], auditEvents: [] };
    }

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      if (!parsed.every((person) => this.isDirectoryPerson(person))) {
        throw new Error('Saved Protocol & Security data is invalid.');
      }
      return { people: [...this.defaultPeople(), ...parsed], removedEmails: [], auditEvents: [] };
    }

    if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) ||
      (parsed['version'] !== 2 && parsed['version'] !== 3) || !('people' in parsed) || !Array.isArray(parsed['people']) ||
      !parsed['people'].every((person) => this.isDirectoryPerson(person))) {
      throw new Error('Saved Protocol & Security data is invalid.');
    }
    const removedEmails = 'removedEmails' in parsed ? parsed['removedEmails'] : [];
    if (!this.isStringArray(removedEmails)) {
      throw new Error('Saved Protocol & Security data is invalid.');
    }
    const auditEvents = parsed['version'] === 3 && 'auditEvents' in parsed ? parsed['auditEvents'] : [];
    if (!this.isAuditEventArray(auditEvents)) {
      throw new Error('Saved Reports & Audit data is invalid.');
    }
    return {
      people: parsed['people'],
      removedEmails,
      auditEvents
    };
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  private isAuditEventArray(value: unknown): value is DirectoryAuditEvent[] {
    return Array.isArray(value) && value.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const event = item as Record<string, unknown>;
      return typeof event['id'] === 'string' &&
        typeof event['actorName'] === 'string' &&
        typeof event['actorEmail'] === 'string' &&
        typeof event['actorRole'] === 'string' &&
        typeof event['action'] === 'string' &&
        typeof event['target'] === 'string' &&
        typeof event['module'] === 'string' &&
        (event['scope'] === 'Global' || event['scope'] === 'Regional' || event['scope'] === 'Local') &&
        typeof event['country'] === 'string' &&
        typeof event['city'] === 'string' &&
        typeof event['occurredAt'] === 'string' &&
        !Number.isNaN(Date.parse(event['occurredAt'])) &&
        (event['result'] === 'Success' || event['result'] === 'Blocked');
    });
  }

  private persistPeople(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      version: 3,
      people: this.peopleState,
      removedEmails: this.removedEmails,
      auditEvents: this.auditState
    }));
  }

  private defaultPeople(): DirectoryPerson[] {
    return [
    {
      id: 'rafael-kitoco',
      name: 'Rafael Kitoco',
      role: 'Global Administrator',
      email: 'rafael.kitoco@example.org',
      accountType: 'global-admin',
      scope: 'Global',
      country: '',
      city: '',
      region: 'The Goodnews World',
      branch: 'Global Office',
      status: 'Active',
      initials: 'RK',
      tone: 'gold',
      about: 'Supports the global workspace and helps keep teams connected across regions and branches.'
    },
    {
      id: 'amina-mensah',
      name: 'Amina Mensah',
      role: 'Regional Administrator',
      accountType: 'regional-admin',
      email: 'amina.mensah@example.org',
      scope: 'Regional',
      country: 'Nigeria',
      city: 'Lagos',
      region: 'Nigeria',
      branch: 'Regional Office',
      status: 'Active',
      initials: 'AM',
      tone: 'sage',
      about: 'Coordinates regional teams and supports local leaders across West Africa.'
    },
    {
      id: 'grace-ndlovu',
      name: 'Grace Ndlovu',
      role: 'Regional Administrator',
      accountType: 'regional-admin',
      email: 'grace.ndlovu@example.org',
      scope: 'Regional',
      country: 'South Africa',
      city: 'Johannesburg',
      region: 'South Africa',
      branch: 'Regional Office',
      status: 'Active',
      initials: 'GN',
      tone: 'sage',
      about: 'Works with branch teams across Southern Africa to support the community.'
    },
    {
      id: 'daniel-kofi',
      name: 'Daniel Kofi',
      role: 'Local Leader',
      accountType: 'member',
      email: 'daniel.kofi@example.org',
      scope: 'Local',
      country: 'Nigeria',
      city: 'Lagos',
      region: 'Nigeria',
      branch: 'Lagos Central',
      status: 'Active',
      initials: 'DK',
      tone: 'gold',
      about: 'Serves the Lagos Central community and supports local gatherings.'
    },
    {
      id: 'sarah-okoro',
      name: 'Sarah Okoro',
      role: 'Local Leader',
      accountType: 'member',
      email: 'sarah.okoro@example.org',
      scope: 'Local',
      country: 'Ghana',
      city: 'Accra',
      region: 'Ghana',
      branch: 'Accra North',
      status: 'Active',
      initials: 'SO',
      tone: 'plum',
      about: 'Serves the Accra North community and helps members stay connected.'
    },
    {
      id: 'samuel-adeyemi',
      name: 'Samuel Adeyemi',
      role: 'Member',
      accountType: 'member',
      email: 'samuel.adeyemi@example.org',
      scope: 'Local',
      country: 'Nigeria',
      city: 'Lagos',
      region: 'Nigeria',
      branch: 'Lagos Central',
      status: 'Invite pending',
      initials: 'SA',
      tone: 'blue',
      about: 'A member joining the Lagos Central community.'
    }
    ];
  }

  private isDirectoryPerson(value: unknown): value is DirectoryPerson {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const person = value as Record<string, unknown>;
    return typeof person['id'] === 'string' &&
      typeof person['name'] === 'string' &&
      typeof person['role'] === 'string' &&
      (!('email' in person) || typeof person['email'] === 'string') &&
      (!('emailVisible' in person) || typeof person['emailVisible'] === 'boolean') &&
      (!('country' in person) || typeof person['country'] === 'string') &&
      (!('city' in person) || typeof person['city'] === 'string') &&
      (!('accountType' in person) ||
        person['accountType'] === 'admin' ||
        person['accountType'] === 'member' ||
        person['accountType'] === 'global-admin' ||
        person['accountType'] === 'regional-admin' ||
        person['accountType'] === 'local-admin') &&
      (person['scope'] === 'Global' || person['scope'] === 'Regional' || person['scope'] === 'Local') &&
      typeof person['region'] === 'string' &&
      typeof person['branch'] === 'string' &&
      (person['status'] === 'Active' || person['status'] === 'Invite pending' || person['status'] === 'Blocked') &&
      (!('statusBeforeBlock' in person) || person['statusBeforeBlock'] === 'Active' || person['statusBeforeBlock'] === 'Invite pending') &&
      typeof person['initials'] === 'string' &&
      (person['tone'] === 'gold' || person['tone'] === 'sage' || person['tone'] === 'plum' || person['tone'] === 'blue') &&
      typeof person['about'] === 'string';
  }

  private createPersonId(): string {
    return `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
