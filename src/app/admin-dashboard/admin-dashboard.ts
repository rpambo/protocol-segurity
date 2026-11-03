import { UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DirectoryAccountType, DirectoryAdminLevel, DirectoryPerson, DirectoryTitle, MemberDirectory } from '../member-directory';
import { AdminSession } from '../admin-session';
import { DirectoryLocations } from '../directory-locations';
import { AdminChatPanel } from '../admin-chat-panel';
import { AdminHelpPanel } from '../admin-help-panel';
import { AdminHelpCenter } from '../admin-help-center';
import { CommunityNoteMediaType, GlobalCommunityNoteStore } from '../global-community-note';

type SecurityPreference = 'forcePasswordChange' | 'auditLogging' | 'allowSelfRegistration';
type ReportRange = 'Last 7 days' | 'Last 30 days' | 'This year';

interface AuditRow {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  module: string;
  scope: string;
  time: string;
  outcome: 'Success' | 'Blocked';
}

interface AuditSummary {
  signIns: number;
  signOuts: number;
  accountChanges: number;
  blockedSignIns: number;
}

interface RegionBranchSummary {
  city: string;
  branchNames: readonly string[];
  members: number;
  localAdmins: readonly DirectoryPerson[];
}

interface RegionSummary {
  country: string;
  code: string;
  regionalAdmin: DirectoryPerson | null;
  branches: readonly RegionBranchSummary[];
  branchCount: number;
  members: number;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminChatPanel, AdminHelpPanel, AdminHelpCenter, UpperCasePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  private readonly memberDirectory = inject(MemberDirectory);
  protected readonly adminSession = inject(AdminSession);
  private readonly router = inject(Router);
  private readonly directoryLocations = inject(DirectoryLocations);
  private readonly communityNoteStore = inject(GlobalCommunityNoteStore);
  protected activeSection = 'Overview';
  protected activeScope = 'All scopes';
  protected searchQuery = '';
  protected showSearch = false;
  protected showNotifications = false;
  protected showProfileMenu = false;
  protected showProfileModal = false;
  protected showHelpCenter = false;
  protected mobileMenuOpen = false;
  protected activeSettingsTab = 'general';
  protected showPersonModal = false;
  protected personToRemove: DirectoryPerson | null = null;
  protected newPersonName = '';
  protected newPersonEmail = '';
  protected newPersonTitle: DirectoryTitle = 'Member';
  protected newAccountType: DirectoryAccountType = 'member';
  protected countries: string[] = [];
  protected newCountry = '';
  protected newCity = '';
  protected locationLoading = false;
  protected locationError = '';
  protected personCreationError = '';
  protected personCreationNotice = '';
  protected accountActionError = '';
  private locationRequestId = 0;
  protected selectedWeek = 0;
  protected reportRange: ReportRange = 'Last 7 days';
  protected settingsSaved = false;
  protected settingsError = '';
  protected communityNoteTitle = '';
  protected communityNoteMessage = '';
  protected communityNoteMediaType: CommunityNoteMediaType = 'none';
  protected communityNoteMediaUrl = '';
  protected communityNoteError = '';
  protected communityNoteNotice = '';
  protected readonly securityPreferences = {
    forcePasswordChange: true,
    auditLogging: true,
    allowSelfRegistration: false
  };
  protected workspaceName = 'The Goodnews World';
  protected departmentName = 'Protocol & Security Department';
  protected defaultScope = 'Global';
  protected platformLanguage = 'English';
  protected protocolReadingReminders = true;
  protected securityAccountAlerts = true;
  protected readonly platformLanguages = ['English'];
  private readonly settingsStorageKey = 'spirit-embassy:admin-settings:v1';

  constructor() {
    try {
      this.loadSettings();
    } catch (error) {
      this.settingsError = error instanceof Error ? error.message : 'Saved workspace settings could not be loaded.';
    }
    this.loadCommunityNote();
  }

  protected readonly navigation = [
    {
      label: 'Workspace',
      items: [
        { name: 'Overview', icon: 'overview' },
        { name: 'Protocols', icon: 'protocols' },
        { name: 'Dress code', icon: 'dress-code' },
        { name: 'Media library', icon: 'media' }
      ]
    },
    {
      label: 'Administration',
      items: [
        { name: 'Admins', icon: 'users' },
        { name: 'Regions & branches', icon: 'regions' },
        { name: 'Reports & audit', icon: 'reports' },
        { name: 'A Note for Our Community', icon: 'note' },
        { name: 'Help messages', icon: 'help' },
        { name: 'Admin chat', icon: 'chat' },
        { name: 'Settings', icon: 'settings' }
      ]
    }
  ];

  protected readonly dressCodes = [
    { day: 'SUNDAY', title: 'Sunday service', detail: 'White shirt · Dark trousers', scope: 'Global', color: 'gold', attire: 'Formal', image: 'sun' },
    { day: 'MONDAY', title: 'Office & administration', detail: 'Business attire · Dark colours', scope: 'Global', color: 'green', attire: 'Business', image: 'office' },
    { day: 'WEDNESDAY', title: 'Midweek gathering', detail: 'Smart casual · Neutral tones', scope: 'Regional', color: 'blue', attire: 'Smart casual', image: 'midweek' },
    { day: 'FRIDAY', title: 'Youth fellowship', detail: 'Youth ministry t-shirt', scope: 'Local', color: 'plum', attire: 'Ministry wear', image: 'youth' }
  ];

  protected readonly mediaItems = [
    { title: 'The Goodnews World — Introduction', type: 'Video', format: 'MP4 · 08:42', scope: 'Global', date: 'Oct 24, 2026', tone: 'video', icon: 'video' },
    { title: 'Sunday Service Protocol', type: 'Document', format: 'PDF · 2.4 MB', scope: 'Global', date: 'Oct 22, 2026', tone: 'document', icon: 'document' },
    { title: 'Welcome to Lagos Central', type: 'Image', format: 'JPG · 4.1 MB', scope: 'Regional', date: 'Oct 20, 2026', tone: 'image', icon: 'image' },
    { title: 'Worship Team Guidelines', type: 'Document', format: 'PDF · 1.8 MB', scope: 'Local', date: 'Oct 18, 2026', tone: 'guide', icon: 'document' },
    { title: 'Community Outreach Highlights', type: 'Video', format: 'MP4 · 12:16', scope: 'Regional', date: 'Oct 16, 2026', tone: 'outreach', icon: 'video' },
    { title: 'Global Gathering — October', type: 'Image', format: 'PNG · 3.2 MB', scope: 'Global', date: 'Oct 12, 2026', tone: 'gathering', icon: 'image' }
  ];

  protected get sectionTitle(): string {
    const titles: Record<string, string> = {
      Overview: 'Dashboard',
      Protocols: 'Protocol & Security',
      'Dress code': 'Dress Code Management',
      'Media library': 'Media Library',
      'Reports & audit': 'Reports & Audit',
      'Admin chat': 'Admin chat'
    };
    return titles[this.activeSection] ?? this.activeSection;
  }

  protected get peopleCount(): number {
    return this.memberDirectory.people.length;
  }

  protected get currentAdmin(): DirectoryPerson | null {
    return this.memberDirectory.findByEmail(this.adminSession.adminEmail);
  }

  protected get currentAdminName(): string {
    return this.currentAdmin?.name ?? this.adminSession.adminEmail.split('@')[0] ?? 'Admin';
  }

  protected get currentAdminInitials(): string {
    return this.currentAdminName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected get currentAdminRole(): string {
    return this.formatAccountTypeLabel(this.adminSession.adminLevel);
  }

  protected get systemDateLabel(): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date());
  }

  protected get systemYear(): number {
    return new Date().getFullYear();
  }

  protected get activity() {
    return this.reportEvents.slice(0, 3).map((event) => ({
      id: event.id,
      initials: event.actorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase(),
      person: event.actorName,
      action: event.action.toLowerCase(),
      subject: event.target,
      time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt)),
      color: event.result === 'Blocked' ? 'plum' : 'sage'
    }));
  }

  protected get activeAdminCount(): number {
    return this.memberDirectory.people.filter((person) =>
      this.memberDirectory.isAdminAccount(person) && person.status === 'Active'
    ).length;
  }

  protected get blockedAdminCount(): number {
    return this.memberDirectory.people.filter((person) =>
      this.memberDirectory.isAdminAccount(person) && person.status === 'Blocked'
    ).length;
  }

  protected get assignableAccountTypes(): { value: DirectoryAccountType; label: string }[] {
    return this.memberDirectory.getAssignableAccountTypes(this.adminSession.adminLevel).map((value) => ({
      value,
      label: this.formatAccountTypeLabel(value)
    }));
  }

  protected get stats() {
    const activePeople = this.memberDirectory.people.filter((person) => person.status === 'Active').length;
    const pendingInvitations = this.memberDirectory.people.filter((person) => person.status === 'Invite pending').length;
    return [
      { label: 'Protocol & Security entries', value: String(this.peopleCount), change: 'Directory entries', icon: 'users', tone: 'gold' },
      { label: 'Active entries', value: String(activePeople), change: 'Across the directory', icon: 'confirmed', tone: 'sage' },
      { label: 'Invitations pending', value: String(pendingInvitations), change: 'Awaiting account access', icon: 'users', tone: 'blue' },
      { label: 'Active regions', value: '12', change: 'Across 8 countries', icon: 'regions', tone: 'plum' }
    ];
  }

  protected get overviewPeople(): readonly DirectoryPerson[] {
    return this.memberDirectory.people.slice(0, 3);
  }

  protected get regions(): readonly RegionSummary[] {
    const countries = new Map<string, DirectoryPerson[]>();
    for (const person of this.locationPeople) {
      const country = person.country?.trim();
      if (!country) {
        continue;
      }
      const key = country.toLowerCase();
      const people = countries.get(key) ?? [];
      people.push(person);
      countries.set(key, people);
    }

    return [...countries.values()]
      .map((people): RegionSummary | null => {
        const country = people[0]?.country?.trim();
        if (!country) {
          return null;
        }
        const cities = new Map<string, DirectoryPerson[]>();
        for (const person of people) {
          const city = person.city?.trim();
          if (!city) {
            continue;
          }
          const key = city.toLowerCase();
          const cityPeople = cities.get(key) ?? [];
          cityPeople.push(person);
          cities.set(key, cityPeople);
        }

        const regionalAdmin = people.find((person) =>
          person.accountType === 'regional-admin' ||
          (person.accountType === 'admin' && person.scope === 'Regional')
        ) ?? null;
        const branches = [...cities.values()]
          .map((cityPeople): RegionBranchSummary => {
            const city = cityPeople[0]?.city?.trim() ?? '';
            const branchNames = [...new Set(cityPeople
              .map((person) => person.branch.trim())
              .filter((name) => name && name.toLowerCase() !== city.toLowerCase() &&
                name.toLowerCase() !== 'regional office' && name.toLowerCase() !== 'global office'))]
              .sort((a, b) => a.localeCompare(b));
            return {
              city,
              branchNames,
              members: cityPeople.filter((person) => !this.memberDirectory.isAdminAccount(person)).length,
              localAdmins: cityPeople.filter((person) =>
              person.accountType === 'local-admin' ||
              (person.accountType === 'admin' && person.scope === 'Local')
              )
            };
          })
          .sort((a, b) => a.city.localeCompare(b.city));

        return {
          country,
          code: country.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
          regionalAdmin,
          branches,
          branchCount: branches.reduce((total, branch) => total + Math.max(branch.branchNames.length, 1), 0),
          members: people.filter((person) => !this.memberDirectory.isAdminAccount(person)).length
        };
      })
      .filter((region): region is RegionSummary => region !== null)
      .sort((a, b) => a.country.localeCompare(b.country));
  }

  protected get branchCount(): number {
    return this.regions.reduce((total, region) => total + region.branchCount, 0);
  }

  protected get locationMemberCount(): number {
    return this.locationPeople.filter((person) => !this.memberDirectory.isAdminAccount(person)).length;
  }

  protected accountTypeLabel(person: DirectoryPerson): string {
    return this.formatAccountTypeLabel(person.accountType);
  }

  private formatAccountTypeLabel(accountType: DirectoryAccountType | undefined): string {
    switch (accountType) {
      case 'global-admin':
        return 'Global Admin';
      case 'regional-admin':
        return 'Regional Admin';
      case 'local-admin':
        return 'Local Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  }

  protected get sectionDescription(): string {
    const descriptions: Record<string, string> = {
      Protocols: 'Manage members, officers and leaders across the community.',
      'Dress code': 'A shared view of what to wear, wherever you gather.',
      'Media library': 'Videos, documents and images for every community.',
      Admins: 'Manage Admin accounts within your hierarchy and assigned location.',
      'Regions & branches': 'Organise local communities and regional leadership.',
      'Reports & audit': 'Review recorded sign-in sessions and account changes within your administrative scope.',
      'A Note for Our Community': 'Publish a message and optional media for members across the whole community.',
      'Help messages': 'Private member requests for help, visible according to your administrative scope.',
      'Admin chat': 'A shared global conversation for administrators only.',
      Settings: 'Manage platform preferences and security policies.'
    };
    return descriptions[this.activeSection] ?? 'Welcome back. Here is what is happening across your community.';
  }

  protected get filteredPeople(): readonly DirectoryPerson[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.memberDirectory.people.filter((person) =>
      (this.activeScope === 'All' || person.scope === this.activeScope) &&
      (!query || `${person.name} ${person.role} ${person.email ?? ''} ${person.region} ${person.branch} ${person.status}`.toLowerCase().includes(query))
    );
  }

  protected get filteredMediaItems() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.mediaItems.filter((item) =>
      (this.activeScope === 'All' || this.activeScope === 'All scopes' || item.scope === this.activeScope) &&
      (!query || `${item.title} ${item.type} ${item.scope}`.toLowerCase().includes(query))
    );
  }

  protected get filteredUsers() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.memberDirectory.people.filter((admin) =>
      this.memberDirectory.isAdminAccount(admin) &&
      (!query || `${admin.name} ${admin.email ?? ''} ${admin.role} ${admin.country ?? ''} ${admin.city ?? ''}`.toLowerCase().includes(query))
    );
  }

  protected canManagePerson(person: DirectoryPerson): boolean {
    return this.memberDirectory.canManageAccount(
      person,
      this.adminSession.adminLevel,
      { country: this.adminSession.adminCountry, city: this.adminSession.adminCity },
      this.adminSession.adminEmail
    );
  }

  protected togglePersonBlocked(person: DirectoryPerson): void {
    this.accountActionError = '';
    try {
      this.memberDirectory.setAccountBlocked(
        person.id,
        person.status !== 'Blocked',
        this.adminSession.adminLevel,
        { country: this.adminSession.adminCountry, city: this.adminSession.adminCity },
        this.adminSession.adminEmail
      );
      this.personCreationNotice = `${person.name}'s account was ${person.status === 'Blocked' ? 'unblocked' : 'blocked'}.`;
    } catch (error) {
      this.accountActionError = error instanceof Error ? error.message : 'The account status could not be changed.';
    }
  }

  protected removePerson(person: DirectoryPerson): void {
    this.personToRemove = person;
    this.accountActionError = '';
  }

  protected closeRemovePersonModal(): void {
    this.personToRemove = null;
  }

  protected confirmRemovePerson(): void {
    const person = this.personToRemove;
    if (!person) {
      return;
    }

    this.accountActionError = '';
    try {
      this.memberDirectory.removeAccount(
        person.id,
        this.adminSession.adminLevel,
        { country: this.adminSession.adminCountry, city: this.adminSession.adminCity },
        this.adminSession.adminEmail
      );
      this.personCreationNotice = `${person.name} was removed from Protocol & Security.`;
      this.personCreationError = '';
      this.closeRemovePersonModal();
    } catch (error) {
      this.accountActionError = error instanceof Error ? error.message : 'The account could not be removed.';
      this.closeRemovePersonModal();
    }
  }

  protected get filteredRegions() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.regions.filter((region) =>
      !query || `${region.country} ${region.regionalAdmin?.name ?? ''} ${region.branches.map((branch) => `${branch.city} ${branch.branchNames.join(' ')} ${branch.localAdmins.map((admin) => admin.name).join(' ')}`).join(' ')}`.toLowerCase().includes(query)
    );
  }

  private get locationPeople(): readonly DirectoryPerson[] {
    const country = this.adminSession.adminCountry.trim().toLowerCase();
    const city = this.adminSession.adminCity.trim().toLowerCase();
    return this.memberDirectory.people.filter((person) => {
      if (!person.country) {
        return false;
      }
      if (this.adminSession.adminLevel === 'global-admin') {
        return true;
      }
      if (person.country.trim().toLowerCase() !== country) {
        return false;
      }
      return this.adminSession.adminLevel === 'regional-admin' ||
        person.city?.trim().toLowerCase() === city;
    });
  }

  protected get filteredAuditEvents() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.reportEvents
      .filter((event) =>
        !query || `${event.actorName} ${event.actorEmail} ${event.actorRole} ${event.action} ${event.target} ${event.module} ${event.scope} ${event.result}`.toLowerCase().includes(query)
      )
      .map((event): AuditRow => ({
        id: event.id,
        actorName: event.actorName,
        actorRole: event.actorRole,
        action: event.action,
        target: event.target,
        module: event.module,
        scope: event.scope,
        time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt)),
        outcome: event.result
      }));
  }

  protected get auditSummary() {
    const events = this.reportEvents;
    return {
      signIns: events.filter((event) => event.module === 'Authentication' && event.action === 'Successful sign-in').length,
      signOuts: events.filter((event) => event.module === 'Authentication' && event.action === 'Successful sign-out').length,
      accountChanges: events.filter((event) => event.module !== 'Authentication').length,
      blockedSignIns: events.filter((event) => event.module === 'Authentication' && event.result === 'Blocked').length
    } satisfies AuditSummary;
  }

  private get reportEvents() {
    const cutoff = this.reportCutoff;
    return this.memberDirectory.auditEvents.filter((event) => {
      const eventTime = Date.parse(event.occurredAt);
      const matchesLocation = this.adminSession.adminLevel === 'global-admin' ||
        (Boolean(this.adminSession.adminCountry) &&
          event.country.toLowerCase() === this.adminSession.adminCountry.trim().toLowerCase() &&
          (this.adminSession.adminLevel === 'regional-admin' ||
            (Boolean(this.adminSession.adminCity) &&
              event.city.toLowerCase() === this.adminSession.adminCity.trim().toLowerCase())));
      return matchesLocation && eventTime >= cutoff;
    });
  }

  private get reportCutoff(): number {
    const now = new Date();
    if (this.reportRange === 'Last 7 days') {
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    if (this.reportRange === 'Last 30 days') {
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }
    return new Date(now.getFullYear(), 0, 1).getTime();
  }

  protected get weekLabel(): string {
    return this.selectedWeek === 0 ? 'OCT 26 — NOV 1, 2026' : this.selectedWeek < 0 ? 'OCT 19 — OCT 25, 2026' : 'NOV 2 — NOV 8, 2026';
  }

  protected selectSection(section: string): void {
    if (section === 'A Note for Our Community' && this.adminSession.adminLevel !== 'global-admin') {
      return;
    }
    this.activeSection = section;
    this.searchQuery = '';
    this.showSearch = false;
    this.activeScope = section === 'Protocols' ? 'All' : 'All scopes';
    this.showNotifications = false;
    this.showProfileMenu = false;
    this.mobileMenuOpen = false;
  }

  protected get communityNotePublished(): boolean {
    return this.communityNoteStore.note.isPublished;
  }

  protected get communityNotePublishedLabel(): string {
    const publishedAt = this.communityNoteStore.note.publishedAt;
    return publishedAt
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(publishedAt))
      : 'Current community note';
  }

  protected saveCommunityNote(isPublished: boolean): void {
    this.communityNoteError = '';
    this.communityNoteNotice = '';
    try {
      const currentNote = this.communityNoteStore.note;
      this.communityNoteStore.save({
        title: this.communityNoteTitle,
        message: this.communityNoteMessage,
        mediaType: this.communityNoteMediaType,
        mediaUrl: this.communityNoteMediaUrl,
        isPublished,
        publishedAt: isPublished ? new Date().toISOString() : currentNote.publishedAt,
        updatedAt: currentNote.updatedAt
      });
      this.communityNoteNotice = isPublished
        ? 'The note is published in this browser.'
        : 'The note has been unpublished.';
    } catch (error) {
      this.communityNoteError = error instanceof Error ? error.message : 'The community note could not be saved.';
    }
  }

  private loadCommunityNote(): void {
    const note = this.communityNoteStore.note;
    this.communityNoteTitle = note.title;
    this.communityNoteMessage = note.message;
    this.communityNoteMediaType = note.mediaType;
    this.communityNoteMediaUrl = note.mediaUrl;
    this.communityNoteError = this.communityNoteStore.loadError;
  }

  protected toggleSearch(): void {
    if (this.showSearch) {
      this.showSearch = false;
      this.searchQuery = '';
      return;
    }

    this.selectSection('Protocols');
    this.showSearch = true;
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  protected selectSettingsTab(tab: 'general' | 'security' | 'notifications' | 'language'): void {
    this.activeSettingsTab = tab;
    document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected startPersonCreation(): void {
    this.selectSection('Protocols');
    this.personCreationError = '';
    this.personCreationNotice = '';
    this.locationError = '';
    this.newCountry = this.adminSession.adminLevel === 'global-admin' ? '' : this.adminSession.adminCountry;
    this.newCity = this.adminSession.adminLevel === 'local-admin' ? this.adminSession.adminCity : '';
    this.showPersonModal = true;

    if (this.adminSession.adminLevel === 'global-admin') {
      void this.loadCountries();
    } else if (!this.newCountry || !this.newCity) {
      this.locationError = 'This Local Admin has no assigned country and city to inherit.';
    }
  }

  protected async loadCountries(): Promise<void> {
    const requestId = ++this.locationRequestId;
    this.locationLoading = true;
    this.locationError = '';
    try {
      this.countries = await this.directoryLocations.getCountries();
    } catch (error) {
      if (requestId === this.locationRequestId) {
        this.locationError = error instanceof Error ? error.message : 'Countries could not be loaded.';
      }
    } finally {
      if (requestId === this.locationRequestId) {
        this.locationLoading = false;
      }
    }
  }

  protected onCountryChanged(country: string): void {
    this.newCountry = country;
    this.newCity = '';
    this.locationError = '';
  }

  protected get canCreateEntry(): boolean {
    if (this.locationLoading || Boolean(this.locationError)) {
      return false;
    }
    if (this.adminSession.adminLevel === 'local-admin') {
      return Boolean(this.adminSession.adminCountry && this.adminSession.adminCity);
    }
    return Boolean(this.newCountry && this.newCity);
  }

  protected closePersonModal(): void {
    this.showPersonModal = false;
    this.personCreationError = '';
    this.locationRequestId++;
    this.locationLoading = false;
  }

  protected createPerson(): void {
    const name = this.newPersonName.trim();
    const email = this.newPersonEmail.trim();
    if (!name || !email) {
      return;
    }
    if (!this.canCreateEntry) {
      this.locationError ||= 'Select a valid country and city before creating this entry.';
      return;
    }

    try {
      const selectedLocation = this.adminSession.adminLevel === 'local-admin'
        ? { country: this.adminSession.adminCountry, city: this.adminSession.adminCity }
        : { country: this.newCountry, city: this.newCity };
      this.memberDirectory.addPerson(
        name,
        email,
        this.newPersonTitle,
        this.newAccountType,
        this.adminSession.adminLevel,
        { country: this.adminSession.adminCountry, city: this.adminSession.adminCity },
        selectedLocation,
        this.adminSession.adminEmail
      );
      this.searchQuery = '';
      this.activeScope = 'All';
      this.newPersonName = '';
      this.newPersonEmail = '';
      this.newPersonTitle = 'Member';
      this.newAccountType = 'member';
      this.showPersonModal = false;
      this.personCreationError = '';
      this.personCreationNotice = 'Protocol & Security entry saved in this browser only. No account or email was created.';
    } catch (error) {
      this.personCreationError = error instanceof Error ? error.message : 'The Protocol & Security entry could not be added.';
    }
  }

  protected setScope(scope: string): void {
    this.activeScope = scope;
  }

  protected changeWeek(direction: number): void {
    this.selectedWeek = Math.max(-1, Math.min(1, this.selectedWeek + direction));
  }

  protected setReportRange(range: ReportRange): void {
    this.reportRange = range;
  }

  protected initialsFor(name: string): string {
    return name.split(' ').map((part) => part[0]).join('');
  }

  protected saveSettings(): void {
    this.settingsError = '';
    if (!this.workspaceName.trim() || !this.departmentName.trim()) {
      this.settingsError = 'Enter both the organisation and department names before saving.';
      return;
    }
    try {
      localStorage.setItem(this.settingsStorageKey, JSON.stringify({
        workspaceName: this.workspaceName.trim(),
        departmentName: this.departmentName.trim(),
        defaultScope: this.defaultScope,
        forcePasswordChange: this.securityPreferences.forcePasswordChange,
        auditLogging: this.securityPreferences.auditLogging,
        allowSelfRegistration: this.securityPreferences.allowSelfRegistration,
        protocolReadingReminders: this.protocolReadingReminders,
        securityAccountAlerts: this.securityAccountAlerts,
        platformLanguage: this.platformLanguage
      }));
      this.settingsSaved = true;
      setTimeout(() => this.settingsSaved = false, 2500);
    } catch (error) {
      this.settingsSaved = false;
      this.settingsError = error instanceof Error ? error.message : 'Settings could not be saved in this browser.';
    }
  }

  protected toggleSecurityPreference(preference: SecurityPreference): void {
    this.securityPreferences[preference] = !this.securityPreferences[preference];
    this.settingsSaved = false;
    this.settingsError = '';
  }

  protected toggleNotificationPreference(preference: 'protocolReadingReminders' | 'securityAccountAlerts'): void {
    this[preference] = !this[preference];
    this.settingsSaved = false;
    this.settingsError = '';
  }

  protected markSettingsChanged(): void {
    this.settingsSaved = false;
    this.settingsError = '';
  }

  private loadSettings(): void {
    const stored = localStorage.getItem(this.settingsStorageKey);
    if (!stored) {
      return;
    }

    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) {
      throw new Error('Saved workspace settings are invalid.');
    }
    const settings = value as Record<string, unknown>;
    if (typeof settings['workspaceName'] !== 'string' ||
      typeof settings['departmentName'] !== 'string' ||
      (settings['defaultScope'] !== 'Global' && settings['defaultScope'] !== 'Regional' && settings['defaultScope'] !== 'Local') ||
      typeof settings['forcePasswordChange'] !== 'boolean' ||
      typeof settings['auditLogging'] !== 'boolean' ||
      typeof settings['allowSelfRegistration'] !== 'boolean' ||
      typeof settings['protocolReadingReminders'] !== 'boolean' ||
      typeof settings['securityAccountAlerts'] !== 'boolean' ||
      typeof settings['platformLanguage'] !== 'string' ||
      !this.platformLanguages.includes(settings['platformLanguage'])) {
      throw new Error('Saved workspace settings are invalid.');
    }
    this.workspaceName = settings['workspaceName'];
    this.departmentName = settings['departmentName'];
    this.defaultScope = settings['defaultScope'];
    this.securityPreferences.forcePasswordChange = settings['forcePasswordChange'];
    this.securityPreferences.auditLogging = settings['auditLogging'];
    this.securityPreferences.allowSelfRegistration = settings['allowSelfRegistration'];
    this.protocolReadingReminders = settings['protocolReadingReminders'];
    this.securityAccountAlerts = settings['securityAccountAlerts'];
    this.platformLanguage = settings['platformLanguage'];
  }

  protected toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  protected toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  protected openHelpCenter(): void {
    this.showHelpCenter = true;
    this.mobileMenuOpen = false;
  }

  protected closeHelpCenter(): void {
    this.showHelpCenter = false;
  }

  protected openProfile(): void {
    this.showProfileMenu = false;
    this.showProfileModal = true;
  }

  protected closeProfile(): void {
    this.showProfileModal = false;
  }

  protected signOut(): void {
    this.showProfileMenu = false;
    this.showProfileModal = false;
    this.adminSession.clearSession();
    void this.router.navigate(['/admin/login']);
  }
}
