import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AdminChat, AdminChatIdentity, AdminChatMessage, AdminChatRoom } from './admin-chat';
import { AdminSession } from './admin-session';
import { DirectoryScope, MemberDirectory } from './member-directory';

@Component({
  selector: 'app-admin-chat-panel',
  imports: [DatePipe],
  template: `
    <section class="admin-chat-page">
      <header class="admin-chat-heading">
        <div>
          <div class="admin-chat-kicker"><span></span> ADMINISTRATORS ONLY</div>
          <h1>Admin chat</h1>
          <p>Separate conversations for Global, Regional and Local Admins.</p>
        </div>
        <span class="admin-chat-local-tag">LOCAL DEMO</span>
      </header>

      @if (errorMessage) {
        <p class="admin-chat-error" role="alert">{{ errorMessage }}</p>
      } @else if (!currentAdmin) {
        <section class="admin-chat-unavailable">
          <h2>Admin account required</h2>
          <p>This conversation is available only to an Admin account.</p>
        </section>
      } @else {
        <section class="admin-chat-layout">
          <nav class="admin-chat-sidebar" aria-label="Admin chat rooms">
            <p class="admin-chat-sidebar-label">ADMIN ROOMS</p>
            @for (scope of availableScopes; track scope) {
              <button class="admin-chat-room-choice" [class.selected]="selectedScope === scope" type="button" (click)="selectRoom(scope)">
                <span class="admin-chat-choice-icon" aria-hidden="true">{{ scope === 'Global' ? '◎' : scope === 'Regional' ? '⌂' : '⌖' }}</span>
                <span><strong>{{ scope }} chat</strong><small>{{ roomDescription(scope) }}</small></span>
              </button>
            }
            @if (selectedScope !== 'Global' && isGlobalAdmin) {
              <label class="admin-chat-location-label" for="admin-chat-country">Country</label>
              <select id="admin-chat-country" [value]="selectedCountry" (change)="setCountry($event)">
                <option value="">Choose a country</option>
                @for (country of countries; track country) { <option [value]="country">{{ country }}</option> }
              </select>
            }
            @if (selectedScope === 'Local' && isGlobalAdmin) {
              <label class="admin-chat-location-label" for="admin-chat-city">City</label>
              <select id="admin-chat-city" [value]="selectedCity" (change)="setCity($event)" [disabled]="!selectedCountry">
                <option value="">Choose a city</option>
                @for (city of cities; track city) { <option [value]="city">{{ city }}</option> }
              </select>
            }
          </nav>

          <section class="admin-chat-room panel">
            <header class="admin-chat-room-heading">
              <span class="admin-chat-room-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h8m-8 3h5"></path></svg>
              </span>
              <span><strong>{{ selectedScope }} Admin room</strong><small>{{ roomDescription(selectedScope) }} · Admins only · {{ adminCount }} Admins</small></span>
              <span class="admin-chat-message-count">{{ messages.length }} messages</span>
            </header>
            @if (roomUnavailable) {
              <div class="admin-chat-empty"><span>⌖</span><strong>Location unavailable</strong><p>{{ roomUnavailableMessage }}</p></div>
            } @else {
              <div class="admin-chat-messages" aria-live="polite">
                @if (!messages.length) {
                  <div class="admin-chat-empty"><span>✳</span><strong>Start the {{ selectedScope }} conversation</strong><p>Share an update with administrators in this room.</p></div>
                }
                @for (message of messages; track message.id) {
                  <article class="admin-chat-message" [class.own]="message.senderId === currentAdmin.id">
                    <span class="admin-chat-avatar">{{ initials(message.senderName) }}</span>
                    <div class="admin-chat-message-body">
                      <div class="admin-chat-message-meta"><strong>{{ message.senderName }}</strong><time>{{ message.sentAt | date:'short' }}</time></div>
                      <p>{{ message.text }}</p>
                    </div>
                  </article>
                }
              </div>
              <form class="admin-chat-composer" (submit)="sendMessage($event)">
                <label class="sr-only" for="admin-chat-message">Write an Admin message</label>
                <input id="admin-chat-message" [value]="draftMessage" (input)="setDraft($event)" placeholder="Write a message to {{ selectedScope }} Admins…" maxlength="1000" [disabled]="!canUseRoom">
                <button type="submit" [disabled]="!draftMessage.trim() || !canUseRoom">Send</button>
              </form>
              @if (sendError) { <p class="admin-chat-error" role="alert">{{ sendError }}</p> }
            }
            <p class="admin-chat-storage-note">Messages are stored in this browser only. A shared, real-time chat requires a backend.</p>
          </section>
        </section>
      }
    </section>
  `,
  styleUrl: './admin-chat-panel.css'
})
export class AdminChatPanel {
  private readonly adminChat = inject(AdminChat);
  private readonly adminSession = inject(AdminSession);
  private readonly directory = inject(MemberDirectory);

  private readonly allScopes: DirectoryScope[] = ['Global', 'Regional', 'Local'];
  protected currentAdmin: AdminChatIdentity | null = null;
  protected messages: AdminChatMessage[] = [];
  protected draftMessage = '';
  protected errorMessage = '';
  protected sendError = '';
  protected selectedScope: DirectoryScope = 'Global';
  protected selectedCountry = '';
  protected selectedCity = '';
  private assignedCountry = '';
  private assignedCity = '';

  constructor() {
    const account = this.directory.findByEmail(this.adminSession.adminEmail);
    if (!this.adminSession.adminEmail || this.directory.isRemovedEmail(this.adminSession.adminEmail) ||
      account?.status === 'Blocked' || (account && !this.directory.isAdminAccount(account))) {
      return;
    }
    this.currentAdmin = {
      id: account?.id ?? this.adminSession.adminEmail.trim().toLowerCase(),
      name: account?.name ?? this.nameFromEmail(this.adminSession.adminEmail),
      accountType: 'admin',
      status: 'Active'
    };
    this.assignedCountry = account?.country ?? this.adminSession.adminCountry;
    this.assignedCity = account?.city ?? this.adminSession.adminCity;
    this.selectedCountry = this.assignedCountry;
    this.selectedCity = this.assignedCity;
    this.selectedScope = this.adminSession.adminLevel === 'global-admin' ? 'Global'
      : this.adminSession.adminLevel === 'regional-admin' ? 'Regional' : 'Local';
    this.refreshMessages();
  }

  protected get availableScopes(): DirectoryScope[] {
    return this.adminSession.adminLevel === 'regional-admin'
      ? ['Global', 'Regional']
      : this.allScopes;
  }

  protected get isGlobalAdmin(): boolean {
    return this.adminSession.adminLevel === 'global-admin';
  }

  protected get countries(): string[] {
    const knownCountries = this.directory.people
      .map((person) => person.country?.trim() ?? '')
      .filter(Boolean);
    if (this.adminSession.adminCountry) {
      knownCountries.push(this.adminSession.adminCountry);
    }
    return [...new Set(knownCountries)].sort((a, b) => a.localeCompare(b));
  }

  protected get cities(): string[] {
    if (!this.selectedCountry) {
      return [];
    }
    const knownCities = this.directory.people
      .filter((person) => this.sameLocation(person.country, this.selectedCountry))
      .map((person) => person.city?.trim() ?? '')
      .filter(Boolean);
    if (this.assignedCity && this.sameLocation(this.assignedCountry, this.selectedCountry)) {
      knownCities.push(this.assignedCity);
    }
    return [...new Set(knownCities)].sort((a, b) => a.localeCompare(b));
  }

  protected get roomUnavailable(): boolean {
    return this.selectedScope === 'Regional'
      ? !this.selectedCountry
      : this.selectedScope === 'Local' && (!this.selectedCountry || !this.selectedCity);
  }

  protected get roomUnavailableMessage(): string {
    if (this.selectedScope === 'Regional' && !this.selectedCountry) {
      return 'Assign a country to this Admin account to access its Regional room.';
    }
    if (this.selectedScope === 'Local' && !this.selectedCountry) {
      return 'Assign a country to this Admin account to access its Local room.';
    }
    return 'Assign a city to this Local Admin account to access its Local room.';
  }

  protected get canUseRoom(): boolean {
    if (this.roomUnavailable) {
      return false;
    }
    if (this.adminSession.adminLevel === 'regional-admin') {
      return this.selectedScope === 'Global' ||
        (this.selectedScope === 'Regional' &&
          this.sameLocation(this.selectedCountry, this.assignedCountry));
    }
    if (this.adminSession.adminLevel === 'local-admin' && this.selectedScope !== 'Global') {
      return this.sameLocation(this.selectedCountry, this.assignedCountry) &&
        (this.selectedScope !== 'Local' ||
        this.sameLocation(this.selectedCity, this.assignedCity));
    }
    return true;
  }

  protected get adminCount(): number {
    return this.directory.people.filter((person) =>
      this.directory.isAdminAccount(person) && person.status !== 'Blocked'
    ).length;
  }

  protected initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected roomDescription(scope: DirectoryScope): string {
    if (scope === 'Global') {
      return 'All Admins';
    }
    if (scope === 'Regional') {
      return this.selectedCountry || 'Country room';
    }
    return this.selectedCity ? `${this.selectedCity}, ${this.selectedCountry}` : 'City room';
  }

  protected selectRoom(scope: DirectoryScope): void {
    if (!this.availableScopes.includes(scope)) {
      return;
    }
    this.selectedScope = scope;
    if (this.adminSession.adminLevel !== 'global-admin') {
      this.selectedCountry = this.assignedCountry;
    }
    if (this.adminSession.adminLevel === 'local-admin') {
      this.selectedCity = this.assignedCity;
    } else if (scope === 'Local' && !this.cities.includes(this.selectedCity)) {
      this.selectedCity = '';
    }
    this.sendError = '';
    this.refreshMessages();
  }

  protected setCountry(event: Event): void {
    if (!this.isGlobalAdmin) {
      return;
    }
    this.selectedCountry = (event.target as HTMLSelectElement).value;
    if (!this.cities.includes(this.selectedCity)) {
      this.selectedCity = '';
    }
    this.sendError = '';
    this.refreshMessages();
  }

  protected setCity(event: Event): void {
    if (!this.isGlobalAdmin) {
      return;
    }
    this.selectedCity = (event.target as HTMLSelectElement).value;
    this.sendError = '';
    this.refreshMessages();
  }

  protected setDraft(event: Event): void {
    this.draftMessage = (event.target as HTMLInputElement).value;
    this.sendError = '';
  }

  protected sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.currentAdmin || !this.draftMessage.trim() || !this.canUseRoom) {
      return;
    }

    this.sendError = '';
    try {
      this.adminChat.sendMessage(this.selectedRoom, this.currentAdmin, this.draftMessage);
      this.refreshMessages();
      this.draftMessage = '';
    } catch (error) {
      this.sendError = error instanceof Error ? error.message : 'Your message could not be sent.';
    }
  }

  private get selectedRoom(): AdminChatRoom {
    return {
      scope: this.selectedScope,
      country: this.selectedScope === 'Global' ? undefined : this.selectedCountry,
      city: this.selectedScope === 'Local' ? this.selectedCity : undefined
    };
  }

  private refreshMessages(): void {
    if (!this.currentAdmin || this.roomUnavailable || !this.canUseRoom) {
      this.messages = [];
      return;
    }
    try {
      this.messages = this.adminChat.getMessages(this.selectedRoom);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Admin chat history could not be loaded.';
    }
  }

  private sameLocation(first?: string, second?: string): boolean {
    return (first ?? '').trim().toLocaleLowerCase() === (second ?? '').trim().toLocaleLowerCase();
  }

  private nameFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? email;
    return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Admin';
  }
}
