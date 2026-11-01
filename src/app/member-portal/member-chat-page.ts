import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DirectoryScope } from '../member-directory';
import { ChatIdentity, ChatMessage, MemberChat, PrivateChatInvite } from '../member-chat';
import { PortalSession } from '../portal-session';

type ChatView = 'room' | 'direct';

@Component({
  selector: 'app-member-chat-page',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="chat-heading">
      <div>
        <div class="member-kicker"><span></span> COMMUNITY CONVERSATIONS</div>
        <h1>Community chat</h1>
        <p>Share with your community, or connect privately by invitation.</p>
      </div>
      <span class="local-notice">LOCAL DEMO</span>
    </header>

    <section class="chat-layout">
      <aside class="chat-sidebar">
        <div class="chat-sidebar-label">COMMUNITY ROOMS</div>
        @for (scope of scopes; track scope) {
          <button class="room-choice" [class.selected]="view === 'room' && selectedScope === scope" type="button" (click)="selectRoom(scope)">
            <span class="room-icon" aria-hidden="true">
              @if (scope === 'Global') {
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5Z"></path></svg>
              } @else if (scope === 'Regional') {
                <svg viewBox="0 0 24 24"><path d="M4 20V8l8-4 8 4v12M8 20v-6h8v6M7 9h.01M12 9h.01M17 9h.01"></path></svg>
              } @else {
                <svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M8 10h.01M16 10h.01"></path></svg>
              }
            </span>
            <span><strong>{{ scope }} chat</strong><small>{{ roomDescription(scope) }}</small></span>
          </button>
        }

        <div class="chat-sidebar-label direct-label">PRIVATE MESSAGES</div>
        <button class="room-choice" [class.selected]="view === 'direct'" type="button" (click)="selectDirect()">
          <span class="room-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h8m-8 3h5"></path></svg></span>
          <span><strong>Private invitations</strong><small>{{ pendingInvitations.length }} awaiting your response</small></span>
          @if (pendingInvitations.length) { <i>{{ pendingInvitations.length }}</i> }
        </button>
        @if (view === 'direct') {
          @if (chatError) { <p class="chat-error" role="alert">{{ chatError }}</p> }
          <div class="chat-sidebar-label invitation-label">CONVERSATIONS &amp; INVITATIONS</div>
          @for (invite of myInvitations; track invite.id) {
            <button class="invite-choice" [class.selected]="selectedInviteId === invite.id" type="button" (click)="selectInvite(invite.id)">
              <span class="contact-avatar">{{ inviteInitials(invite) }}</span>
              <span><strong>{{ otherPersonName(invite) }}</strong><small>{{ invite.status === 'accepted' ? 'Private conversation' : invite.status === 'pending' ? (isRecipient(invite) ? 'Invitation received' : 'Invitation sent') : 'Declined' }}</small></span>
              @if (invite.status === 'pending' && isRecipient(invite)) { <i>NEW</i> }
            </button>
          } @empty {
            <p class="empty-invites">No conversations yet. Send a private message invitation from a member’s profile.</p>
          }
        }
      </aside>

      <main class="chat-main">
        @if (view === 'room') {
          <header class="conversation-heading">
            <span class="conversation-icon">
              @if (selectedScope === 'Global') { <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5s1.1-6.2 3.3-8.5Z"></path></svg> }
              @else if (selectedScope === 'Regional') { <svg viewBox="0 0 24 24"><path d="M4 20V8l8-4 8 4v12M8 20v-6h8v6M7 9h.01M12 9h.01M17 9h.01"></path></svg> }
              @else { <svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M8 10h.01M16 10h.01"></path></svg> }
            </span>
            <span><h2>{{ selectedScope }} chat</h2><p>{{ roomDescription(selectedScope) }} · Community room</p></span>
            <span class="member-count">{{ roomMessages.length }} messages</span>
          </header>
          <div class="messages-area" aria-live="polite">
            @if (roomMessages.length === 0) {
              <div class="empty-chat"><span>✳</span><strong>Start the {{ selectedScope.toLowerCase() }} conversation</strong><p>Share an update or a word of encouragement with your community.</p></div>
            }
            @for (message of roomMessages; track message.id) {
              <article class="message-row" [class.own-message]="isOwnMessage(message)">
                <span class="message-avatar">{{ initials(message.senderName) }}</span>
                <div class="message-body"><div class="message-meta"><strong>{{ message.senderName }}</strong><time>{{ message.sentAt | date:'shortTime' }}</time></div><p>{{ message.text }}</p></div>
              </article>
            }
          </div>
          <form class="composer" (submit)="sendRoomMessage($event)">
            <label class="sr-only" for="room-message">Write a message</label>
            <input id="room-message" [value]="draftMessage" (input)="setDraftMessage($event)" placeholder="Write a message to the {{ selectedScope.toLowerCase() }} community…" maxlength="1000">
            <button type="submit" [disabled]="!draftMessage.trim()" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.4-7.1L3 10.5 21 3Z"></path><path d="M10.1 13.9 15 9"></path></svg> Send</button>
          </form>
          @if (chatError && view === 'room') { <p class="composer-error" role="alert">{{ chatError }}</p> }
        } @else if (selectedInvite) {
          <header class="conversation-heading">
            <span class="contact-avatar large">{{ inviteInitials(selectedInvite) }}</span>
            <span><h2>{{ otherPersonName(selectedInvite) }}</h2><p>{{ selectedInvite.status === 'accepted' ? 'Private conversation' : selectedInvite.status === 'pending' ? 'Invitation pending' : 'Invitation declined' }}</p></span>
          </header>
          @if (selectedInvite.status === 'accepted') {
            <div class="messages-area" aria-live="polite">
              @if (privateMessages.length === 0) {
                <div class="empty-chat"><span>✳</span><strong>Your private conversation is open</strong><p>You can message one another now that the invitation was accepted.</p></div>
              }
              @for (message of privateMessages; track message.id) {
                <article class="message-row" [class.own-message]="isOwnMessage(message)">
                  <span class="message-avatar">{{ initials(message.senderName) }}</span>
                  <div class="message-body"><div class="message-meta"><strong>{{ message.senderName }}</strong><time>{{ message.sentAt | date:'shortTime' }}</time></div><p>{{ message.text }}</p></div>
                </article>
              }
            </div>
            <form class="composer" (submit)="sendPrivateMessage($event)">
              <label class="sr-only" for="private-message">Write a private message</label>
              <input id="private-message" [value]="draftMessage" (input)="setDraftMessage($event)" placeholder="Write a private message…" maxlength="1000">
              <button type="submit" [disabled]="!draftMessage.trim()" aria-label="Send private message"><svg viewBox="0 0 24 24"><path d="m21 3-7.5 18-3.4-7.1L3 10.5 21 3Z"></path><path d="M10.1 13.9 15 9"></path></svg> Send</button>
            </form>
          } @else {
            <div class="invitation-pending"><span>✉</span><strong>{{ isRecipient(selectedInvite) ? 'Invitation received' : 'Invitation sent' }}</strong><p>Private messages are locked until it is accepted on the member’s profile.</p><a [routerLink]="['/portal/people', profilePersonId(selectedInvite)]">Open member profile <span>→</span></a></div>
          }
          @if (chatError) { <p class="composer-error" role="alert">{{ chatError }}</p> }
        } @else {
          <div class="direct-welcome">
            <span class="welcome-chat-icon"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h8m-8 3h5"></path></svg></span>
            <h2>Private messages</h2><p>Select an invitation or choose a person to invite. A private conversation opens only after they accept.</p>
          </div>
        }
      </main>
    </section>
  `,
  styles: [`
    :host{display:block;color:#38473b;font-family:Arial,"Segoe UI",sans-serif}
    .chat-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px}
    .member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}
    .member-kicker>span{width:17px;height:1px;background:#b49a4d}
    .chat-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}
    .chat-heading p{margin:0;color:#8c9186;font-size:10px}
    .local-notice{padding:6px 8px;border:1px solid #e8e2ce;border-radius:3px;color:#857344;background:#faf8ef;font-size:7px;letter-spacing:.1em}
    .chat-layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:570px;overflow:hidden;border:1px solid #e6e5dc;border-radius:5px;background:#fffefa}
    .chat-sidebar{padding:15px 11px;border-right:1px solid #e9e8e0;background:#fbfaf6}
    .chat-sidebar-label{margin:3px 8px 8px;color:#9b9b8e;font-size:7px;letter-spacing:.13em}
    .room-choice,.invite-choice{display:flex;width:100%;align-items:center;gap:9px;padding:9px 8px;border:0;border-radius:4px;color:#596657;background:transparent;text-align:left;cursor:pointer}
    .room-choice:hover,.room-choice.selected,.invite-choice:hover,.invite-choice.selected{background:#eeeee5}
    .room-icon{display:grid;place-items:center;flex:0 0 auto;width:32px;height:32px;border:1px solid #e9e5d6;border-radius:4px;color:#8e7c47;background:#fffefa}
    .room-icon svg,.conversation-icon svg,.welcome-chat-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}
    .room-choice>span:nth-child(2),.invite-choice>span:nth-child(2){display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}
    .room-choice strong,.invite-choice strong{overflow:hidden;color:#526052;font-size:9px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
    .room-choice small,.invite-choice small{overflow:hidden;color:#989b90;font-size:7px;text-overflow:ellipsis;white-space:nowrap}
    .room-choice>i{padding:3px 5px;border-radius:10px;color:#776633;background:#eee9d6;font-size:7px;font-style:normal}
    .direct-label{margin-top:20px}
    .invitation-label{margin-top:15px}
    .invite-choice{padding:8px}
    .contact-avatar{display:grid;place-items:center;flex:0 0 auto;width:32px;height:32px;border-radius:50%;color:#637b61;background:#e6ebdf;font-size:8px;font-weight:600}
    .contact-avatar.large{width:39px;height:39px;font-size:10px}
    .invite-choice>i{color:#9a8347;font-size:6px;font-style:normal;letter-spacing:.08em}
    .empty-invites{margin:8px;color:#999c91;font-size:8px;line-height:1.5}
    .chat-error{margin:8px;padding:8px;border:1px solid #e4c9c4;border-radius:3px;color:#8a3d32;background:#fff5f3;font-size:8px;line-height:1.5}
    .chat-main{display:flex;min-width:0;flex-direction:column;min-height:570px}
    .conversation-heading{display:flex;align-items:center;gap:10px;min-height:65px;padding:11px 16px;border-bottom:1px solid #eeede6}
    .conversation-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid #e9e5d6;border-radius:4px;color:#8e7c47;background:#fffefa}
    .conversation-heading>span:nth-child(2){flex:1;min-width:0}
    .conversation-heading h2{margin:0 0 4px;color:#435143;font:500 14px Georgia,serif}
    .conversation-heading p{margin:0;color:#92968b;font-size:8px}
    .member-count{color:#9a9c92;font-size:7px}
    .messages-area{display:flex;flex:1;flex-direction:column;gap:13px;min-height:380px;max-height:calc(100vh - 350px);overflow-y:auto;padding:17px}
    .message-row{display:flex;align-items:flex-start;gap:9px;max-width:85%}
    .message-row.own-message{align-self:flex-end;flex-direction:row-reverse}
    .message-avatar{display:grid;place-items:center;flex:0 0 auto;width:28px;height:28px;border-radius:50%;color:#697a60;background:#e9ecdf;font-size:7px;font-weight:600}
    .message-body{min-width:0}
    .message-meta{display:flex;align-items:center;gap:8px;margin:0 0 4px}
    .message-meta strong{color:#566255;font-size:8px}
    .message-meta time{color:#a2a397;font-size:7px}
    .message-body>p{margin:0;padding:9px 11px;border:1px solid #ecebe3;border-radius:2px 9px 9px 9px;color:#586256;background:#f8f8f3;font-size:9px;line-height:1.55;overflow-wrap:anywhere;white-space:pre-wrap}
    .own-message .message-body>p{border-color:#e8e2ce;border-radius:9px 2px 9px 9px;background:#f8f5eb}
    .own-message .message-meta{justify-content:flex-end}
    .empty-chat,.direct-welcome,.invitation-pending{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}
    .empty-chat>span{margin-bottom:10px;color:#b29b52;font-size:22px}
    .empty-chat strong,.invitation-pending strong{color:#596557;font:15px Georgia,serif}
    .empty-chat p,.invitation-pending p,.direct-welcome p{max-width:300px;color:#92968b;font-size:9px;line-height:1.6}
    .composer{display:flex;gap:8px;padding:12px;border-top:1px solid #eeede6}
    .composer input{min-width:0;flex:1;height:38px;padding:0 11px;border:1px solid #e4e5dc;border-radius:4px;color:#596658;background:#fff;font:9px Arial,sans-serif}
    .composer button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:82px;padding:0 11px;border:0;border-radius:4px;color:#fff;background:#75663e;font:8px Arial,sans-serif;cursor:pointer}
    .composer button:disabled{opacity:.45;cursor:not-allowed}
    .composer button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .composer-error{margin:0;padding:0 12px 10px;color:#8a3d32;font-size:8px}
    .invitation-pending>span{margin-bottom:10px;color:#ad9855;font-size:23px}
    .invitation-pending>a{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid #75663e;border-radius:3px;color:#fff;background:#75663e;font-size:8px;text-decoration:none}
    .direct-welcome{min-height:450px}
    .welcome-chat-icon{display:grid;place-items:center;width:56px;height:56px;border:1px solid #e8e3d2;border-radius:50%;color:#8e7c47;background:#fbfaf5}
    .welcome-chat-icon svg{width:25px;height:25px}
    .direct-welcome h2{margin:15px 0 0;color:#465245;font:20px Georgia,serif}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:760px){.chat-layout{grid-template-columns:1fr}.chat-sidebar{border-right:0;border-bottom:1px solid #e9e8e0}.chat-sidebar-label{margin-top:5px}.room-choice{display:inline-flex;width:calc(33.333% - 5px);vertical-align:top;gap:6px;padding:7px 5px}.room-choice>span:nth-child(2){overflow:hidden}.room-choice strong{font-size:8px}.room-choice small{display:none}.room-choice>i{display:none}.direct-label{margin-top:13px}.chat-sidebar>.room-choice:last-of-type{display:flex;width:100%}.chat-main{min-height:470px}.messages-area{max-height:52vh}}
    @media(max-width:500px){.chat-heading{align-items:flex-start}.chat-heading h1{font-size:29px}.local-notice{margin-top:4px}.chat-layout{min-height:0}.chat-main{min-height:440px}.conversation-heading{padding:10px}.messages-area{min-height:320px;padding:12px}.message-row{max-width:96%}.invite-actions{flex-direction:column}.composer{padding:9px}.composer button{min-width:68px}.member-count{display:none}}
  `]
})
export class MemberChatPage {
  private readonly chat = inject(MemberChat);
  protected readonly session = inject(PortalSession);
  protected readonly scopes: DirectoryScope[] = ['Global', 'Regional', 'Local'];
  protected view: ChatView = 'room';
  protected selectedScope: DirectoryScope = 'Global';
  protected selectedInviteId: string | null = null;
  protected draftMessage = '';
  protected chatError = '';

  protected get currentUser(): ChatIdentity {
    return {
      id: this.session.memberEmail.toLowerCase(),
      name: this.session.memberName,
      email: this.session.memberEmail
    };
  }

  protected get roomMessages(): ChatMessage[] {
    return this.chat.getRoomMessages(this.selectedScope);
  }

  protected get myInvitations(): PrivateChatInvite[] {
    return this.chat.getInvitations(this.session.memberEmail)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  protected get pendingInvitations(): PrivateChatInvite[] {
    return this.myInvitations.filter((invite) =>
      invite.recipientEmail === this.session.memberEmail.toLowerCase() && invite.status === 'pending'
    );
  }

  protected get selectedInvite(): PrivateChatInvite | null {
    return this.myInvitations.find((invite) => invite.id === this.selectedInviteId) ?? null;
  }

  protected get privateMessages(): ChatMessage[] {
    return this.selectedInvite ? this.chat.getPrivateMessages(this.selectedInvite) : [];
  }

  protected selectRoom(scope: DirectoryScope): void {
    this.view = 'room';
    this.selectedScope = scope;
    this.chatError = '';
    this.draftMessage = '';
  }

  protected selectDirect(): void {
    this.view = 'direct';
    this.selectedInviteId = null;
    this.chatError = '';
    this.draftMessage = '';
  }

  protected selectInvite(inviteId: string): void {
    this.selectedInviteId = inviteId;
    this.chatError = '';
    this.draftMessage = '';
  }

  protected setDraftMessage(event: Event): void {
    this.draftMessage = (event.target as HTMLInputElement).value;
  }

  protected sendRoomMessage(event: Event): void {
    event.preventDefault();
    this.sendMessage(() => this.chat.sendRoomMessage(this.selectedScope, this.currentUser, this.draftMessage));
  }

  protected sendPrivateMessage(event: Event): void {
    event.preventDefault();
    if (!this.selectedInvite) {
      return;
    }
    this.sendMessage(() => this.chat.sendPrivateMessage(this.selectedInvite!.id, this.currentUser, this.draftMessage));
  }

  protected roomDescription(scope: DirectoryScope): string {
    if (scope === 'Global') {
      return 'All members';
    }
    if (scope === 'Regional') {
      return 'West Africa';
    }
    return 'Lagos Central';
  }

  protected inviteInitials(invite: PrivateChatInvite): string {
    return this.initials(this.otherPersonName(invite));
  }

  protected otherPersonName(invite: PrivateChatInvite): string {
    return this.isRecipient(invite) ? invite.senderName : invite.recipientName;
  }

  protected isRecipient(invite: PrivateChatInvite): boolean {
    return invite.recipientEmail === this.session.memberEmail.toLowerCase();
  }

  protected profilePersonId(invite: PrivateChatInvite): string {
    return this.isRecipient(invite) ? invite.senderId : invite.recipientId;
  }

  protected isOwnMessage(message: ChatMessage): boolean {
    return message.senderId === this.currentUser.id;
  }

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }

  private sendMessage(save: () => void): void {
    const text = this.draftMessage.trim();
    if (!text) {
      return;
    }
    try {
      save();
      this.draftMessage = '';
      this.chatError = '';
    } catch (error) {
      this.chatError = error instanceof Error ? error.message : 'Your message could not be sent.';
    }
  }
}
