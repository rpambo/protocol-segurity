import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DirectoryPerson, MemberDirectory } from '../member-directory';
import { MemberChat, PrivateChatInvite } from '../member-chat';
import { PortalSession } from '../portal-session';

@Component({
  selector: 'app-member-people',
  imports: [RouterLink],
  template: `
    <header class="page-heading">
      <div>
        <div class="member-kicker"><span></span> YOUR COMMUNITY</div>
        <h1>People</h1>
        <p>Meet the people serving across our global, regional and local communities.</p>
      </div>
      <span class="heading-seal" aria-hidden="true">✳</span>
    </header>

    @if (selectedPerson; as person) {
      <section class="person-detail panel">
        <a class="back-link" routerLink="/portal/people">← All people</a>
        <div class="profile-heading">
          <span class="person-avatar large" [class]="person.tone">{{ person.initials }}</span>
          <div>
            <span class="scope-pill">{{ person.scope }}</span>
            <h2>{{ person.name }}</h2>
            <p>{{ person.role }}</p>
          </div>
        </div>
        <div class="profile-actions">
          @if (profileInvite(person); as invite) {
            @if (invite.status === 'accepted') {
              <button class="message-person-button" type="button" (click)="openChat()">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h8m-8 3h5"></path></svg>
                Open private chat
              </button>
            } @else if (invite.status === 'pending' && isInviteRecipient(invite)) {
              <button class="message-person-button" type="button" (click)="respondToInvite(invite, true)">Accept message invitation</button>
              <button class="decline-invite-button" type="button" (click)="respondToInvite(invite, false)">Decline</button>
            } @else if (invite.status === 'pending') {
              <span class="invite-status">Message invitation sent · awaiting response</span>
            }
          } @else if (!isOwnProfile(person) && person.status === 'Active') {
            <button class="message-person-button" type="button" (click)="inviteToMessage(person)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h8m-8 3h5"></path></svg>
              Invite to message
            </button>
          }
          @if (inviteFeedback) { <p class="invite-feedback" role="status">{{ inviteFeedback }}</p> }
        </div>
        <p class="person-about">{{ person.about }}</p>
        <div class="profile-facts">
          <div><small><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5Z"></path></svg> REGION</small><strong>{{ person.region }}</strong></div>
          <div><small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5h17M5 20V9l7-5 7 5v11M9 20v-6h6v6M8 10h.01M16 10h.01"></path></svg> BRANCH / OFFICE</small><strong>{{ person.branch }}</strong></div>
          <div><small><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="m8 12 2.6 2.6L16.5 9"></path></svg> ACCOUNT STATUS</small><strong><i [class.pending]="person.status !== 'Active'"></i>{{ person.status }}</strong></div>
          @if (person.email) {
            <div><small><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"></rect><path d="m4.5 7 7.5 6 7.5-6"></path></svg> EMAIL</small><strong><a [href]="'mailto:' + person.email">{{ person.email }}</a></strong></div>
          }
        </div>
      </section>
    } @else {
      <section class="people-tools panel">
        <div class="scope-switcher" aria-label="Filter people by scope">
          @for (scope of scopes; track scope) {
            <button type="button" [class.selected]="activeScope === scope" (click)="activeScope = scope">{{ scope }}</button>
          }
        </div>
        <label class="people-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg>
          <input type="search" aria-label="Search people" placeholder="Search people..." [value]="query" (input)="query = $any($event.target).value">
        </label>
      </section>

      <section class="people-results">
        <div class="results-label">{{ filteredPeople.length }} PEOPLE <span>·</span> {{ activeScope.toUpperCase() }} SCOPE</div>
        <div class="people-grid">
          @for (person of filteredPeople; track person.id) {
            <a class="person-card panel" [routerLink]="['/portal/people', person.id]">
              <span class="person-avatar" [class]="person.tone">{{ person.initials }}</span>
              <span class="person-card-copy">
                <span class="person-card-top"><span class="scope-pill">{{ person.scope }}</span><span class="status-text" [class.pending]="person.status !== 'Active'">{{ person.status }}</span></span>
                <strong>{{ person.name }}</strong>
                <small>{{ person.role }}</small>
                <span class="person-location"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"></path><circle cx="12" cy="10" r="2.2"></circle></svg>{{ person.region }} <i>·</i> {{ person.branch }}</span>
                <span class="profile-link">View profile <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"></path></svg></span>
              </span>
            </a>
          } @empty {
            <div class="empty-state panel"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M2.8 20v-1.3a5 5 0 0 1 5-5h2.4a5 5 0 0 1 5 5V20m1-12a3 3 0 1 0 0-6m1 11a4.5 4.5 0 0 1 3 4"></path></svg><strong>No people in this view</strong><p>Try another scope or search term.</p></div>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block;color:#39483b;font-family:Arial,"Segoe UI",sans-serif}
    .member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}
    .member-kicker>span{width:17px;height:1px;background:#b49a4d}
    .page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:21px}
    .page-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}
    .page-heading p{margin:0;color:#8c9186;font-size:10px}
    .heading-seal{color:#af9751;font-size:21px}
    .panel{border:1px solid #e7e6de;border-radius:4px;background:#fffefa}
    .people-tools{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}
    .scope-switcher{display:flex;gap:3px}
    .scope-switcher button{padding:7px 11px;border:0;border-radius:3px;color:#858b80;background:transparent;font:9px Arial,sans-serif;cursor:pointer}
    .scope-switcher button.selected{color:#65552b;background:#f4f0e3;font-weight:600}
    .people-search{display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid #e6e7df;border-radius:3px;color:#95988e;font-size:17px}
    .people-search>svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.7}
    .people-search input{width:176px;height:30px;border:0;outline:0;color:#536055;background:transparent;font:9px Arial,sans-serif}
    .people-search input::placeholder{color:#a0a39a}
    .people-results{margin-top:17px}
    .results-label{margin:0 2px 9px;color:#96988d;font-size:7px;letter-spacing:.13em}
    .results-label span{margin:0 4px;color:#b6a25f}
    .people-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .person-card{display:flex;align-items:flex-start;gap:13px;padding:15px;color:inherit;text-decoration:none;transition:border-color .14s,transform .14s}
    .person-card:hover{transform:translateY(-1px);border-color:#c9b773}
    .person-avatar{display:grid;place-items:center;flex:0 0 auto;width:42px;height:42px;border:1px solid #e6dfca;border-radius:50%;font:13px Georgia,serif}
    .person-avatar.large{width:66px;height:66px;font-size:20px}
    .person-avatar.gold{color:#92763b;background:#f5efdF}
    .person-avatar.sage{color:#587458;background:#edf2e9}
    .person-avatar.plum{color:#79657c;background:#f1edf3}
    .person-avatar.blue{color:#5d7186;background:#edf1f5}
    .person-card-copy{display:flex;flex:1;flex-direction:column;gap:7px;min-width:0}
    .person-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .scope-pill{padding:4px 6px;border-radius:2px;color:#81703d;background:#f4f0e4;font-size:7px}
    .status-text{color:#69876b;font-size:8px}
    .status-text.pending{color:#a1743e}
    .person-card-copy>strong{color:#455347;font:500 15px Georgia,serif}
    .person-card-copy>small,.person-location{color:#898f84;font-size:9px}
    .person-location{display:flex;align-items:center;gap:4px;font-size:8px}
    .person-location>svg{width:12px;height:12px;flex:0 0 auto;fill:none;stroke:#9b874d;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.6}
    .person-location i{margin:0 3px;color:#b49a4d;font-style:normal}
    .profile-link{display:flex;align-items:center;justify-content:space-between;margin-top:3px;padding-top:8px;border-top:1px solid #f0efe9;color:#927a3d;font-size:8px}
    .profile-link>svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.7}
    .empty-state{display:flex;grid-column:1/-1;flex-direction:column;align-items:center;padding:35px;color:#8b9085;text-align:center}
    .empty-state>svg{width:28px;height:28px;margin-bottom:8px;fill:none;stroke:#a58d44;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5}
    .empty-state strong{color:#536055;font:15px Georgia,serif}
    .empty-state p{font-size:9px}
    .person-detail{padding:22px}
    .back-link{color:#817044;font-size:9px;text-decoration:none}
    .profile-heading{display:flex;align-items:center;gap:15px;margin-top:22px}
    .profile-heading h2{margin:8px 0 4px;color:#3c493d;font:400 27px Georgia,serif}
    .profile-heading p{margin:0;color:#858b80;font-size:10px}
    .profile-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:17px 0}
    .message-person-button,.decline-invite-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:0 12px;border:1px solid #75663e;border-radius:4px;color:#fff;background:#75663e;font:9px Arial,sans-serif;text-decoration:none;cursor:pointer}
    .message-person-button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .decline-invite-button{border-color:#e4e1d7;color:#797b70;background:#fff}
    .invite-status{color:#81703d;font-size:8px}
    .invite-feedback{flex-basis:100%;margin:0;color:#7a6840;font-size:8px}
    .person-about{max-width:640px;margin:22px 0;color:#737b70;font-size:10px;line-height:1.75}
    .profile-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;border-top:1px solid #ecebe4}
    .profile-facts>div{display:flex;flex-direction:column;gap:7px;padding:14px 0;border-bottom:1px solid #f0efe9}
    .profile-facts small{display:flex;align-items:center;gap:6px;color:#9d9d90;font-size:7px;letter-spacing:.1em}
    .profile-facts small svg{width:13px;height:13px;fill:none;stroke:#a58d44;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.6}
    .profile-facts strong{display:flex;align-items:center;gap:7px;color:#5e685b;font-size:9px;font-weight:600}
    .profile-facts a{color:inherit;text-decoration:none}
    .profile-facts a:hover{color:#927a3d}
    .profile-facts i{width:6px;height:6px;border-radius:50%;background:#85a57c}
    .profile-facts i.pending{background:#c59b5b}
    @media(max-width:700px){.people-grid{grid-template-columns:1fr}}
    @media(max-width:500px){.page-heading{align-items:flex-start}.page-heading h1{font-size:30px}.page-heading p{max-width:270px;line-height:1.5}.people-tools{align-items:stretch;flex-direction:column;gap:9px}.scope-switcher{justify-content:space-between}.scope-switcher button{flex:1;padding:7px 4px}.people-search input{width:100%}.person-detail{padding:15px}.profile-facts{grid-template-columns:1fr}}
  `]
})
export class MemberPeople {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly directory = inject(MemberDirectory);
  private readonly chat = inject(MemberChat);
  protected readonly session = inject(PortalSession);

  protected readonly scopes = ['All', 'Global', 'Regional', 'Local'];
  protected activeScope = 'All';
  protected query = '';
  protected inviteFeedback = '';

  protected get selectedPerson(): DirectoryPerson | null {
    return this.directory.findPerson(this.route.snapshot.paramMap.get('id'));
  }

  protected isOwnProfile(person: DirectoryPerson): boolean {
    return this.personEmail(person).toLowerCase() === this.session.memberEmail.toLowerCase();
  }

  protected profileInvite(person: DirectoryPerson): PrivateChatInvite | null {
    const profileEmail = this.personEmail(person).toLowerCase();
    const accountEmail = this.session.memberEmail.toLowerCase();
    return this.chat.getInvitations(profileEmail).find((invite) =>
      invite.senderEmail === accountEmail || invite.recipientEmail === accountEmail
    ) ?? null;
  }

  protected isInviteRecipient(invite: PrivateChatInvite): boolean {
    return invite.recipientEmail === this.session.memberEmail.toLowerCase();
  }

  protected inviteToMessage(person: DirectoryPerson): void {
    this.inviteFeedback = '';
    try {
      this.chat.sendInvite(
        { id: this.session.memberEmail.toLowerCase(), name: this.session.memberName, email: this.session.memberEmail },
        { id: person.id, name: person.name, email: this.personEmail(person) }
      );
      this.inviteFeedback = 'Invitation sent. You can message after it is accepted.';
    } catch (error) {
      this.inviteFeedback = error instanceof Error ? error.message : 'The invitation could not be sent.';
    }
  }

  protected respondToInvite(invite: PrivateChatInvite, accepted: boolean): void {
    this.inviteFeedback = '';
    try {
      this.chat.respondToInvite(invite.id, this.session.memberEmail, accepted);
      this.inviteFeedback = accepted ? 'Invitation accepted. You can now message privately.' : 'Invitation declined.';
    } catch (error) {
      this.inviteFeedback = error instanceof Error ? error.message : 'The invitation could not be updated.';
    }
  }

  protected openChat(): void {
    void this.router.navigate(['/portal/chat']);
  }

  private personEmail(person: DirectoryPerson): string {
    return person.email ?? `${person.id}@example.org`;
  }

  protected get filteredPeople(): DirectoryPerson[] {
    const query = this.query.trim().toLowerCase();
    return this.directory.people.filter((person) =>
      (this.activeScope === 'All' || person.scope === this.activeScope) &&
      (!query || `${person.name} ${person.role} ${person.region} ${person.branch} ${person.email ?? ''}`.toLowerCase().includes(query))
    );
  }
}
