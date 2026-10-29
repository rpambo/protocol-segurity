import { Component, inject } from '@angular/core';
import { ProtocolCatalog, ProtocolRecord, ProtocolScope } from '../protocol-catalog';

type SecurityPreference = 'forcePasswordChange' | 'auditLogging' | 'allowSelfRegistration';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  private readonly protocolCatalog = inject(ProtocolCatalog);
  protected activeSection = 'Overview';
  protected activeScope = 'All scopes';
  protected searchQuery = '';
  protected showNotifications = false;
  protected showProfileMenu = false;
  protected showProtocolModal = false;
  protected newProtocolTitle = '';
  protected newProtocolCategory = '';
  protected newProtocolScope: ProtocolScope = 'Global';
  protected newProtocolContent = '';
  protected selectedWeek = 0;
  protected reportRange = 'Last 7 days';
  protected settingsSaved = false;
  protected readonly securityPreferences = {
    forcePasswordChange: true,
    auditLogging: true,
    allowSelfRegistration: false
  };
  protected workspaceName = 'The Goodnews World';
  protected departmentName = 'Protocol & Security Department';
  protected defaultScope = 'Global';

  protected readonly navigation = [
    {
      label: 'Workspace',
      items: [
        { name: 'Overview', icon: '◫' },
        { name: 'Protocols', icon: '▤' },
        { name: 'Dress code', icon: '◇' },
        { name: 'Media library', icon: '▧' }
      ]
    },
    {
      label: 'Administration',
      items: [
        { name: 'Users', icon: '♙' },
        { name: 'Regions & branches', icon: '⌖' },
        { name: 'Reports & audit', icon: '⌁' },
        { name: 'Settings', icon: '⚙' }
      ]
    }
  ];

  protected readonly stats = [
    { label: 'Active protocols', value: '24', change: '+3 this month', icon: '▤', tone: 'gold' },
    { label: 'Members reached', value: '1,284', change: '+8.2% this month', icon: '♙', tone: 'sage' },
    { label: 'Read confirmations', value: '86%', change: 'Across all protocols', icon: '✓', tone: 'blue' },
    { label: 'Active regions', value: '12', change: 'Across 8 countries', icon: '⌖', tone: 'plum' }
  ];

  protected readonly dressCodes = [
    { day: 'SUNDAY', title: 'Sunday service', detail: 'White shirt · Dark trousers', scope: 'Global', color: 'gold', attire: 'Formal', image: 'sun' },
    { day: 'MONDAY', title: 'Office & administration', detail: 'Business attire · Dark colours', scope: 'Global', color: 'green', attire: 'Business', image: 'office' },
    { day: 'WEDNESDAY', title: 'Midweek gathering', detail: 'Smart casual · Neutral tones', scope: 'Regional', color: 'blue', attire: 'Smart casual', image: 'midweek' },
    { day: 'FRIDAY', title: 'Youth fellowship', detail: 'Youth ministry t-shirt', scope: 'Local', color: 'plum', attire: 'Ministry wear', image: 'youth' }
  ];

  protected readonly mediaItems = [
    { title: 'The Goodnews World — Introduction', type: 'Video', format: 'MP4 · 08:42', scope: 'Global', date: 'Oct 24, 2026', tone: 'video', icon: '▶' },
    { title: 'Sunday Service Protocol', type: 'Document', format: 'PDF · 2.4 MB', scope: 'Global', date: 'Oct 22, 2026', tone: 'document', icon: 'PDF' },
    { title: 'Welcome to Lagos Central', type: 'Image', format: 'JPG · 4.1 MB', scope: 'Regional', date: 'Oct 20, 2026', tone: 'image', icon: '✦' },
    { title: 'Worship Team Guidelines', type: 'Document', format: 'PDF · 1.8 MB', scope: 'Local', date: 'Oct 18, 2026', tone: 'guide', icon: 'PDF' },
    { title: 'Community Outreach Highlights', type: 'Video', format: 'MP4 · 12:16', scope: 'Regional', date: 'Oct 16, 2026', tone: 'outreach', icon: '▶' },
    { title: 'Global Gathering — October', type: 'Image', format: 'PNG · 3.2 MB', scope: 'Global', date: 'Oct 12, 2026', tone: 'gathering', icon: '✦' }
  ];

  protected readonly users = [
    { name: 'Amina Mensah', email: 'amina.mensah@example.org', role: 'Regional Administrator', location: 'West Africa', status: 'Active', initials: 'AM', tone: 'sage', lastActive: 'Today, 9:42 AM' },
    { name: 'Daniel Kofi', email: 'daniel.kofi@example.org', role: 'Local Leader', location: 'Lagos Central', status: 'Active', initials: 'DK', tone: 'amber', lastActive: 'Today, 8:16 AM' },
    { name: 'Sarah Okoro', email: 'sarah.okoro@example.org', role: 'Local Leader', location: 'Accra North', status: 'Active', initials: 'SO', tone: 'plum', lastActive: 'Yesterday' },
    { name: 'Samuel Adeyemi', email: 'samuel.adeyemi@example.org', role: 'Member', location: 'Lagos Central', status: 'Invite pending', initials: 'SA', tone: 'blue', lastActive: 'Not signed in' },
    { name: 'Grace Ndlovu', email: 'grace.ndlovu@example.org', role: 'Member', location: 'Harare East', status: 'Active', initials: 'GN', tone: 'sage', lastActive: 'Oct 23, 2026' }
  ];

  protected readonly regions = [
    { name: 'West Africa', country: 'Ghana · Nigeria · Côte d’Ivoire', lead: 'Amina Mensah', branches: 28, members: '4,820', status: 'Active', code: 'WA' },
    { name: 'Southern Africa', country: 'South Africa · Zimbabwe · Zambia', lead: 'Grace Ndlovu', branches: 19, members: '3,140', status: 'Active', code: 'SA' },
    { name: 'East Africa', country: 'Kenya · Uganda · Tanzania', lead: 'Peter Mwangi', branches: 16, members: '2,670', status: 'Active', code: 'EA' },
    { name: 'Europe', country: 'United Kingdom · Portugal · France', lead: 'Esther Boateng', branches: 9, members: '1,305', status: 'Active', code: 'EU' }
  ];

  protected readonly auditEvents = [
    { initials: 'AM', user: 'Amina Mensah', action: 'Published protocol', item: 'Global Protocol for Sunday Service', module: 'Protocols', scope: 'Global', time: 'Oct 26, 2026 · 9:42 AM', outcome: 'Success' },
    { initials: 'DK', user: 'Daniel Kofi', action: 'Confirmed reading', item: 'Safety & Emergency Procedures', module: 'Compliance', scope: 'Local', time: 'Oct 26, 2026 · 8:16 AM', outcome: 'Success' },
    { initials: 'RK', user: 'Rafael Kitoco', action: 'Invited a member', item: 'Samuel Adeyemi', module: 'Users', scope: 'Local', time: 'Oct 25, 2026 · 4:31 PM', outcome: 'Success' },
    { initials: 'SO', user: 'Sarah Okoro', action: 'Updated dress code', item: 'Midweek gathering', module: 'Dress code', scope: 'Regional', time: 'Oct 25, 2026 · 2:08 PM', outcome: 'Success' },
    { initials: 'GN', user: 'Grace Ndlovu', action: 'Failed sign-in attempt', item: 'Account authentication', module: 'Security', scope: 'Regional', time: 'Oct 25, 2026 · 11:14 AM', outcome: 'Blocked' }
  ];

  protected readonly activity = [
    { initials: 'AM', person: 'Amina Mensah', action: 'confirmed reading', subject: 'Global Protocol for Sunday Service', time: '12 min ago', color: 'sage' },
    { initials: 'DK', person: 'Daniel Kofi', action: 'published a new protocol', subject: 'Guest Welcome Protocol', time: '1 hour ago', color: 'amber' },
    { initials: 'SO', person: 'Sarah Okoro', action: 'updated dress code for', subject: 'Lagos Central Branch', time: '3 hours ago', color: 'plum' }
  ];

  protected get sectionTitle(): string {
    const titles: Record<string, string> = {
      Overview: 'Dashboard',
      Protocols: 'Protocol Management',
      'Dress code': 'Dress Code Management',
      'Media library': 'Media Library',
      'Reports & audit': 'Reports & Audit'
    };
    return titles[this.activeSection] ?? this.activeSection;
  }

  protected get protocols(): readonly ProtocolRecord[] {
    return this.protocolCatalog.protocols;
  }

  protected get sectionDescription(): string {
    const descriptions: Record<string, string> = {
      Protocols: 'Keep every gathering aligned with clear, accessible guidance.',
      'Dress code': 'A shared view of what to wear, wherever you gather.',
      'Media library': 'Videos, documents and images for every community.',
      Users: 'Manage member access and responsibilities across the organisation.',
      'Regions & branches': 'Organise local communities and regional leadership.',
      'Reports & audit': 'A clear record of access, reading and administrative activity.',
      Settings: 'Manage platform preferences and security policies.'
    };
    return descriptions[this.activeSection] ?? 'Welcome back. Here is what is happening across your community.';
  }

  protected get filteredProtocols() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.protocols.filter((protocol) => {
      const matchesScope = this.activeScope === 'All scopes' || protocol.scope === this.activeScope;
      const matchesQuery = !query || `${protocol.title} ${protocol.category} ${protocol.scope} ${protocol.content}`.toLowerCase().includes(query);
      return matchesScope && matchesQuery;
    });
  }

  protected get filteredMediaItems() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.mediaItems.filter((item) =>
      (this.activeScope === 'All scopes' || item.scope === this.activeScope) &&
      (!query || `${item.title} ${item.type} ${item.scope}`.toLowerCase().includes(query))
    );
  }

  protected get filteredUsers() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.users.filter((user) =>
      (!query || `${user.name} ${user.email} ${user.role} ${user.location}`.toLowerCase().includes(query))
    );
  }

  protected get filteredRegions() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.regions.filter((region) =>
      !query || `${region.name} ${region.country} ${region.lead}`.toLowerCase().includes(query)
    );
  }

  protected get filteredAuditEvents() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.auditEvents.filter((event) =>
      !query || `${event.user} ${event.action} ${event.item} ${event.module} ${event.scope} ${event.outcome}`.toLowerCase().includes(query)
    );
  }

  protected get weekLabel(): string {
    return this.selectedWeek === 0 ? 'OCT 26 — NOV 1, 2026' : this.selectedWeek < 0 ? 'OCT 19 — OCT 25, 2026' : 'NOV 2 — NOV 8, 2026';
  }

  protected selectSection(section: string): void {
    this.activeSection = section;
    this.searchQuery = '';
    this.activeScope = 'All scopes';
    this.showNotifications = false;
    this.showProfileMenu = false;
  }

  protected startProtocolCreation(): void {
    this.selectSection('Protocols');
    this.showProtocolModal = true;
  }

  protected closeProtocolModal(): void {
    this.showProtocolModal = false;
  }

  protected createProtocol(): void {
    const title = this.newProtocolTitle.trim();
    const category = this.newProtocolCategory.trim();

    if (!title || !category) {
      return;
    }

    this.protocolCatalog.createProtocol({
      title,
      category,
      content: this.newProtocolContent.trim(),
      scope: this.newProtocolScope
    });
    this.searchQuery = '';
    this.activeScope = 'All scopes';
    this.newProtocolTitle = '';
    this.newProtocolCategory = '';
    this.newProtocolScope = 'Global';
    this.newProtocolContent = '';
    this.showProtocolModal = false;
  }

  protected setScope(scope: string): void {
    this.activeScope = scope;
  }

  protected changeWeek(direction: number): void {
    this.selectedWeek = Math.max(-1, Math.min(1, this.selectedWeek + direction));
  }

  protected setReportRange(range: string): void {
    this.reportRange = range;
  }

  protected initialsFor(name: string): string {
    return name.split(' ').map((part) => part[0]).join('');
  }

  protected saveSettings(): void {
    this.settingsSaved = true;
    setTimeout(() => this.settingsSaved = false, 2500);
  }

  protected toggleSecurityPreference(preference: SecurityPreference): void {
    this.securityPreferences[preference] = !this.securityPreferences[preference];
  }

  protected toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  protected toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }
}
