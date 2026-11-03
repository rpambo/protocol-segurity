import { Component, inject } from '@angular/core';
import { AdminSession } from './admin-session';
import { MemberDirectory } from './member-directory';
import { MemberHelp, MemberHelpRequest } from './member-help';

@Component({
  selector: 'app-admin-help-panel',
  template: `
    <section class="help-page">
      @if (errorMessage) { <p class="help-alert error" role="alert">{{ errorMessage }}</p> }
      @if (notice) { <p class="help-alert success" role="status">{{ notice }}</p> }
      <div class="help-layout">
        <section class="help-list panel">
          <header class="help-tabs">
            <button type="button" [class.selected]="statusTab === 'pending'" (click)="selectStatus('pending')">Pending <i>{{ pendingCount }}</i></button>
            <button type="button" [class.selected]="statusTab === 'resolved'" (click)="selectStatus('resolved')">Resolved</button>
            <button class="help-refresh" type="button" (click)="loadRequests()">Refresh</button>
          </header>
          <div class="help-request-list">
            @for (request of requests; track request.id) {
              <button class="help-request-choice" [class.selected]="selectedRequestId === request.id" type="button" (click)="selectRequest(request.id)">
                <span class="help-request-top"><strong>{{ request.title }}</strong><i [class.resolved]="request.status === 'Resolved'">{{ request.status }}</i></span>
                <span>{{ request.memberName }} · {{ request.city || 'Location unavailable' }}{{ request.country ? ', ' + request.country : '' }}</span>
                <small>{{ formatDate(request.updatedAt) }}</small>
              </button>
            } @empty {
              <p class="help-empty">No {{ statusTab }} help requests in your assigned scope.</p>
            }
          </div>
        </section>
        <section class="help-detail panel">
          @if (selectedRequest; as request) {
            <header class="help-detail-heading">
              <div><span class="help-kicker">PRIVATE MEMBER REQUEST</span><h2>{{ request.title }}</h2><p>{{ request.status }} · Received {{ formatDate(request.createdAt) }}</p></div>
              <span class="help-location">{{ request.city || 'No city' }}{{ request.country ? ', ' + request.country : '' }}</span>
            </header>
            <div class="help-member-meta"><strong>{{ request.memberName }}</strong><span>{{ request.memberEmail }}</span></div>
            <article class="help-original-message"><p>{{ request.message }}</p></article>
            @for (response of request.responses; track response.id) {
              <article class="help-response">
                <div><strong>{{ response.responderName }}</strong><time>{{ formatDate(response.sentAt) }}</time></div>
                <p>{{ response.message }}</p>
              </article>
            }
            @if (request.status !== 'Resolved') {
              <form class="help-reply-form" (submit)="sendReply($event)">
                <label for="help-reply">Private reply to {{ request.memberName }}</label>
                <textarea id="help-reply" rows="4" maxlength="4000" [value]="replyDraft" (input)="setReply($event)" placeholder="Write your response..."></textarea>
                <div class="help-reply-actions">
                  <button class="help-send" type="submit" [disabled]="!replyDraft.trim()">Send reply</button>
                  <button class="help-resolve" type="button" [disabled]="!request.responses.length" (click)="resolveRequest()">Mark as resolved</button>
                </div>
              </form>
            }
            <p class="help-privacy-note">Only administrators in the permitted hierarchy scope can view this request. It is not part of the public chat or directory.</p>
          } @else {
            <div class="help-empty help-detail-empty"><strong>Select a help request</strong><span>Member messages and private replies will appear here.</span></div>
          }
        </section>
      </div>
      <p class="help-storage-note">Prototype: requests are stored in this browser only. Shared delivery between member and Admin devices requires a connected backend.</p>
    </section>
  `,
  styles: [`
    :host{display:block;color:#46564a;font-family:Arial,"Segoe UI",sans-serif}
    .help-alert{margin:0 0 12px;padding:9px 11px;border-radius:5px;font-size:9px}.help-alert.error{color:#a34e43;background:#f8e9e6}.help-alert.success{color:#55745b;background:#e9f1e8}
    .help-layout{display:grid;grid-template-columns:minmax(230px,.75fr) minmax(0,1.5fr);gap:12px;min-height:360px}.panel{min-width:0;border:1px solid #e9e9e1;border-radius:8px;background:#fff}
    .help-tabs{display:flex;gap:4px;padding:9px;border-bottom:1px solid #edede6}.help-tabs button{padding:7px 9px;border:0;border-radius:5px;color:#7e887d;background:transparent;font:9px Arial,sans-serif;cursor:pointer}.help-tabs button.selected{color:#62532d;background:#f6f2e6;font-weight:600}.help-tabs i{margin-left:4px;padding:2px 5px;border-radius:9px;color:#fff;background:#8b773f;font-size:8px;font-style:normal}.help-tabs button.help-refresh{margin-left:auto}
    .help-request-list{display:flex;max-height:calc(100vh - 360px);min-height:280px;flex-direction:column;overflow:auto}.help-request-choice{display:flex;flex-direction:column;gap:6px;padding:12px;border:0;border-bottom:1px solid #f0f0e9;color:#7d867b;background:#fff;text-align:left;cursor:pointer}.help-request-choice.selected{background:#f8f6ef}.help-request-choice>span:nth-child(2){font-size:8px}.help-request-choice small{color:#999e95;font-size:8px}.help-request-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.help-request-top strong{color:#45564a;font-size:10px}.help-request-top i{padding:3px 6px;border-radius:9px;color:#8d7436;background:#f7f1df;font-size:7px;font-style:normal;white-space:nowrap}.help-request-top i.resolved{color:#55745d;background:#e9f1e8}
    .help-detail{padding:16px}.help-detail-heading{display:flex;justify-content:space-between;gap:12px;padding-bottom:13px;border-bottom:1px solid #edede6}.help-kicker{color:#9b8750;font-size:7px;font-weight:650;letter-spacing:.14em}.help-detail-heading h2{margin:6px 0;color:#35483e;font:500 19px Georgia,serif}.help-detail-heading p{margin:0;color:#92988e;font-size:8px}.help-location{align-self:flex-start;padding:5px 7px;border-radius:4px;color:#718075;background:#f1f2ed;font-size:8px}
    .help-member-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;margin:12px 0;color:#526057;font-size:9px}.help-member-meta span{color:#92988e;font-size:8px}.help-original-message,.help-response{padding:11px;border:1px solid #eeeee7;border-radius:5px;background:#fbfbf8}.help-original-message p,.help-response p{margin:0;color:#657064;font-size:9px;line-height:1.55;white-space:pre-wrap}.help-response{margin-top:8px;background:#f4f6f1}.help-response>div{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}.help-response strong{color:#4f6853;font-size:8px}.help-response time{color:#92988e;font-size:8px}
    .help-reply-form{margin-top:14px}.help-reply-form label{display:block;margin-bottom:6px;color:#526057;font-size:9px;font-weight:600}.help-reply-form textarea{width:100%;padding:9px;border:1px solid #e2e5dc;border-radius:5px;outline:0;color:#435148;font:9px Arial,sans-serif;resize:vertical}.help-reply-form textarea:focus{border-color:#82997e;box-shadow:0 0 0 2px #82997e24}.help-reply-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.help-reply-actions button{min-height:31px;padding:0 10px;border:1px solid #756019;border-radius:5px;font:9px Arial,sans-serif;cursor:pointer}.help-send{color:#fff;background:#756019}.help-resolve{color:#55745b;background:#fff}.help-reply-actions button:disabled{opacity:.5;cursor:not-allowed}
    .help-privacy-note,.help-storage-note{color:#999e95;font-size:8px;line-height:1.5}.help-privacy-note{margin:13px 0 0}.help-storage-note{margin:11px 0}.help-empty{padding:22px 12px;color:#969c91;font-size:9px;text-align:center}.help-empty strong,.help-empty span{display:block}.help-empty span{margin-top:6px;font-size:8px}.help-detail-empty{display:flex;min-height:300px;flex-direction:column;align-items:center;justify-content:center}
    @media(max-width:700px){.help-layout{grid-template-columns:1fr}.help-request-list{max-height:230px;min-height:0}.help-detail{min-height:290px}}
  `]
})
export class AdminHelpPanel {
  private readonly adminSession = inject(AdminSession);
  private readonly directory = inject(MemberDirectory);
  private readonly memberHelp = inject(MemberHelp);

  protected statusTab: 'pending' | 'resolved' = 'pending';
  protected requests: MemberHelpRequest[] = [];
  protected selectedRequestId = '';
  protected replyDraft = '';
  protected errorMessage = '';
  protected notice = '';
  protected pendingCount = 0;

  constructor() {
    this.loadRequests();
  }

  protected get selectedRequest(): MemberHelpRequest | null {
    return this.requests.find((request) => request.id === this.selectedRequestId) ?? null;
  }

  protected selectStatus(status: 'pending' | 'resolved'): void {
    this.statusTab = status;
    this.selectedRequestId = '';
    this.replyDraft = '';
    this.notice = '';
    this.loadRequests();
  }

  protected selectRequest(requestId: string): void {
    this.selectedRequestId = requestId;
    this.replyDraft = '';
    this.errorMessage = '';
    this.notice = '';
  }

  protected setReply(event: Event): void {
    this.replyDraft = (event.target as HTMLTextAreaElement).value;
    this.errorMessage = '';
    this.notice = '';
  }

  protected sendReply(event: Event): void {
    event.preventDefault();
    const request = this.selectedRequest;
    if (!request || !this.replyDraft.trim()) {
      return;
    }
    this.errorMessage = '';
    this.notice = '';
    try {
      const account = this.directory.findByEmail(this.adminSession.adminEmail);
      this.memberHelp.reply(
        request.id,
        this.adminSession.adminLevel,
        this.adminSession.adminCountry,
        this.adminSession.adminCity,
        { email: this.adminSession.adminEmail, name: account?.name ?? this.adminSession.adminEmail },
        this.replyDraft
      );
      this.replyDraft = '';
      this.notice = 'Your private reply was sent to the member.';
      this.loadRequests();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'The reply could not be sent.';
    }
  }

  protected resolveRequest(): void {
    const request = this.selectedRequest;
    if (!request) {
      return;
    }
    this.errorMessage = '';
    this.notice = '';
    try {
      this.memberHelp.resolve(
        request.id,
        this.adminSession.adminLevel,
        this.adminSession.adminCountry,
        this.adminSession.adminCity
      );
      this.selectedRequestId = '';
      this.notice = 'The request was moved to Resolved.';
      this.loadRequests();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'The request could not be resolved.';
    }
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  protected loadRequests(): void {
    try {
      this.requests = this.memberHelp.getForAdmin(
        this.adminSession.adminLevel,
        this.adminSession.adminCountry,
        this.adminSession.adminCity,
        this.statusTab
      );
      this.pendingCount = this.statusTab === 'pending'
        ? this.requests.length
        : this.memberHelp.getForAdmin(
          this.adminSession.adminLevel,
          this.adminSession.adminCountry,
          this.adminSession.adminCity,
          'pending'
        ).length;
      if (this.selectedRequestId && !this.requests.some((request) => request.id === this.selectedRequestId)) {
        this.selectedRequestId = '';
      }
    } catch (error) {
      this.requests = [];
      this.pendingCount = 0;
      this.errorMessage = error instanceof Error ? error.message : 'Help requests could not be loaded.';
    }
  }
}
