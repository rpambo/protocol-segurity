import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortalSession } from '../portal-session';
import { ProtocolCatalog } from '../protocol-catalog';

interface MemberProtocol {
  id: string;
  title: string;
  category: string;
  scope: string;
  date: string;
  summary: string;
  detail: string;
  status: string;
  initials: string;
}

@Component({
  selector: 'app-member-protocols',
  imports: [RouterLink],
  template: `
    <header class="page-heading"><div><div class="member-kicker"><span></span> GUIDANCE FOR OUR COMMUNITY</div><h1>Protocols</h1><p>Clear guidance for gathering, serving and caring for one another.</p></div><span class="heading-seal">✳ <small>THE GOODNEWS WORLD</small></span></header>
    @if (selectedProtocol; as protocol) {
      <section class="protocol-detail panel">
        <a class="back-button" style="display:inline-block;text-decoration:none" routerLink="/portal/protocols">← All protocols</a>
        <div class="detail-heading"><span class="protocol-detail-mark">{{ protocol.initials }}</span><span class="scope-pill">{{ protocol.scope }}</span><span class="detail-category">{{ protocol.category }}</span></div>
        <h2>{{ protocol.title }}</h2><p class="detail-summary">{{ protocol.summary }}</p>
        <div class="detail-meta"><span>LAST UPDATED <strong>{{ protocol.date }}</strong></span><span>VERSION <strong>1.0</strong></span><span>PREPARED BY <strong>Protocol &amp; Security</strong></span></div>
        <div class="detail-copy"><h3>A shared standard, held with care.</h3><p>{{ protocol.detail }}</p><h3>Before your next gathering</h3><ul><li>Take a moment to review the guidance with your team.</li><li>Ask your local leader if you need clarification for your branch.</li><li>Help us welcome every person with warmth and respect.</li></ul></div>
        <div class="attachment-row"><span class="attachment-icon">PDF</span><span><strong>{{ protocol.title }} — printable guide</strong><small>PDF document · 1.2 MB</small></span><button type="button" aria-label="Download protocol attachment">↓</button></div>
        <div class="acknowledgement" [class.confirmed]="protocol.status === 'Read'"><span>{{ protocol.status === 'Read' ? '✓' : '!' }}</span><p><strong>{{ protocol.status === 'Read' ? 'Thank you for taking the time to read this.' : 'A moment to acknowledge.' }}</strong><small>{{ protocol.status === 'Read' ? 'Your reading confirmation is recorded on this device.' : 'Please confirm once you have read and understood this protocol.' }}</small></p><button type="button" [disabled]="protocol.status === 'Read'" (click)="confirmRead(protocol)">{{ protocol.status === 'Read' ? 'Read' : 'Mark as read' }}</button></div>
      </section>
    } @else {
      <section class="protocol-tools panel"><div class="scope-switcher">@for (scope of scopes; track scope) { <button type="button" [class.selected]="activeScope === scope" (click)="activeScope = scope">{{ scope }}</button> }</div><label class="member-search"><span>⌕</span><input placeholder="Search protocols..." [value]="query" (input)="query = $any($event.target).value"></label></section>
      <div class="protocols-layout"><section class="protocol-results"><div class="results-label">{{ filteredProtocols.length }} GUIDES <span>·</span> {{ activeScope.toUpperCase() }} SCOPE</div>
        @for (protocol of filteredProtocols; track protocol.id) {
          <a class="protocol-card panel" style="text-decoration:none" [routerLink]="['/portal/protocols', protocol.id]"><span class="protocol-card-mark">{{ protocol.initials }}</span><span class="protocol-card-copy"><span class="protocol-card-meta"><span>{{ protocol.category }}</span><i class="scope-pill">{{ protocol.scope }}</i>@if (protocol.status === 'Draft') { <i class="scope-pill draft-pill">Draft</i> }</span><strong>{{ protocol.title }}</strong><small>{{ protocol.summary }}</small><span class="protocol-card-foot"><span>{{ protocol.date }}</span><b [class.read-status]="protocol.status === 'Read'">{{ protocol.status === 'Read' ? '✓ Read' : 'Read protocol →' }}</b></span></span></a>
        } @empty { <div class="empty-protocols panel"><span>▤</span><strong>No protocols in this view</strong><p>Try another scope or search term.</p></div> }
      </section><aside class="protocol-aside"><div class="aside-note"><span>✦</span><div><strong>Guidance that grows with us.</strong><p>Protocols can be global, regional or local. Your branch guidance sits alongside the standards we share as one community.</p></div></div><div class="aside-reading"><div class="member-kicker"><span></span> YOUR READING</div><strong>{{ readCount }} <small>of {{ protocols.length }}</small></strong><p>protocols acknowledged</p><div class="read-progress"><i [style.width]="readPercentage"></i></div><small>{{ readPercentage }} complete</small></div></aside></div>
    }
  `,
  styles: [`
    :host{display:block;color:#39483b;font-family:Arial,"Segoe UI",sans-serif}.member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}.member-kicker>span{width:17px;height:1px;background:#b49a4d}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:21px}.page-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}.page-heading>div>p{margin:0;color:#8c9186;font-size:10px}.heading-seal{display:flex;align-items:center;gap:7px;color:#af9751;font-size:19px}.heading-seal small{color:#98998e;font-size:7px;letter-spacing:.1em}.panel{border:1px solid #e7e6de;border-radius:4px;background:#fffefa}.protocol-tools{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}.scope-switcher{display:flex;gap:3px}.scope-switcher button{padding:7px 11px;border:0;border-radius:3px;color:#858b80;background:transparent;font:9px Arial,sans-serif;cursor:pointer}.scope-switcher button.selected{color:#65552b;background:#f4f0e3;font-weight:600}.member-search{display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid #e6e7df;border-radius:3px;color:#95988e;font-size:17px}.member-search input{width:176px;height:30px;border:0;outline:0;color:#536055;background:transparent;font:9px Arial,sans-serif}.member-search input::placeholder{color:#a0a39a}.protocols-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:14px;margin-top:17px}.protocol-results{display:flex;flex-direction:column;gap:8px}.results-label{margin:0 2px 2px;color:#96988d;font-size:7px;letter-spacing:.13em}.results-label span{margin:0 4px;color:#b6a25f}.protocol-card{display:flex;align-items:flex-start;gap:13px;width:100%;padding:14px;border-radius:4px;color:inherit;text-align:left;cursor:pointer;transition:border-color .14s}.protocol-card:hover{border-color:#c9b773}.protocol-card-mark,.protocol-detail-mark{display:grid;place-items:center;flex:0 0 auto;width:37px;height:37px;border:1px solid #e6dfca;border-radius:4px;color:#987e3e;background:#f6f2e6;font:13px Georgia,serif}.protocol-card-copy{display:flex;flex:1;flex-direction:column;gap:7px;min-width:0}.protocol-card-meta{display:flex;align-items:center;gap:8px;color:#9b8d64;font-size:8px}.scope-pill{padding:4px 6px;border-radius:2px;color:#81703d;background:#f4f0e4;font-size:7px;font-style:normal}.protocol-card-copy>strong{color:#455347;font:500 15px Georgia,serif}.protocol-card-copy>small{color:#898f84;font-size:9px;line-height:1.5}.protocol-card-foot{display:flex;align-items:center;justify-content:space-between;padding-top:7px;border-top:1px solid #f0efe9;color:#9a9d92;font-size:7px}.protocol-card-foot b{color:#927a3d;font-size:8px;font-weight:500}.protocol-card-foot b.read-status{color:#69876b}.protocol-aside{display:flex;flex-direction:column;gap:12px}.aside-note,.aside-reading{padding:13px;border:1px solid #e7e3d6;border-radius:4px;background:#f7f5ed}.aside-note{display:flex;align-items:flex-start;gap:9px}.aside-note>span{color:#b1994e;font-size:16px}.aside-note strong{color:#5a6254;font:13px Georgia,serif}.aside-note p{margin:6px 0 0;color:#85887d;font-size:8px;line-height:1.65}.aside-reading{background:#fffefa}.aside-reading>strong{display:block;margin-top:13px;color:#425243;font:30px Georgia,serif}.aside-reading>strong small{color:#a2a397;font:11px Arial,sans-serif}.aside-reading>p{margin:3px 0 10px;color:#8a8f84;font-size:8px}.read-progress{height:4px;overflow:hidden;border-radius:3px;background:#ebeee7}.read-progress i{display:block;height:100%;border-radius:3px;background:#8ca27a}.aside-reading>small{display:block;margin-top:6px;color:#9a9e93;font-size:7px}.empty-protocols{display:flex;flex-direction:column;align-items:center;padding:35px;color:#8b9085;text-align:center}.empty-protocols>span{color:#ae9650;font-size:23px}.empty-protocols strong{margin-top:10px;color:#536055;font:15px Georgia,serif}.empty-protocols p{font-size:9px}.protocol-detail{padding:20px 22px}.back-button{padding:0;border:0;color:#817044;background:transparent;font:9px Arial,sans-serif;cursor:pointer}.detail-heading{display:flex;align-items:center;gap:9px;margin-top:20px}.protocol-detail-mark{width:34px;height:34px}.detail-category{color:#918d7b;font-size:8px}.protocol-detail>h2{margin:14px 0 7px;color:#3c493d;font:400 28px Georgia,serif}.detail-summary{color:#82897e;font-size:10px}.detail-meta{display:flex;flex-wrap:wrap;gap:35px;margin-top:18px;padding:13px 0;border-top:1px solid #ecebe4;border-bottom:1px solid #ecebe4}.detail-meta span{display:flex;flex-direction:column;gap:5px;color:#9d9d90;font-size:7px;letter-spacing:.1em}.detail-meta strong{color:#5e685b;font-size:8px;font-weight:600;letter-spacing:0}.detail-copy{max-width:700px;padding:12px 0;color:#737b70;font-size:10px;line-height:1.8}.detail-copy h3{margin:13px 0 4px;color:#455448;font:16px Georgia,serif}.detail-copy p{margin:6px 0}.detail-copy ul{padding-left:18px}.attachment-row{display:flex;align-items:center;gap:10px;max-width:700px;padding:10px;border:1px solid #e9e8e0;border-radius:4px}.attachment-icon{display:grid;place-items:center;width:30px;height:31px;border-radius:3px;color:#9d8040;background:#f3efe3;font-size:8px}.attachment-row>span:nth-child(2){display:flex;flex:1;flex-direction:column;gap:4px}.attachment-row strong{color:#5b665a;font-size:8px}.attachment-row small{color:#9b9d92;font-size:7px}.attachment-row button{border:0;color:#897441;background:transparent;font-size:15px;cursor:pointer}.acknowledgement{display:flex;align-items:center;gap:10px;max-width:700px;margin-top:13px;padding:11px;border:1px solid #e7dfc6;border-radius:4px;background:#f8f5e9}.acknowledgement>span{display:grid;place-items:center;flex:0 0 auto;width:25px;height:25px;border-radius:50%;color:#9a7e39;background:#eee6ca}.acknowledgement p{display:flex;flex:1;flex-direction:column;gap:4px;margin:0}.acknowledgement p strong{color:#595d4d;font-size:8px}.acknowledgement p small{color:#898b7e;font-size:7px}.acknowledgement button{padding:8px 10px;border:1px solid #a18a49;border-radius:3px;color:#fff;background:#81703d;font:8px Arial,sans-serif;cursor:pointer}.acknowledgement.confirmed{border-color:#dae5d7;background:#f0f5ed}.acknowledgement.confirmed>span{color:#5c805e;background:#dfeadd}.acknowledgement.confirmed button{border-color:#d5e0d3;color:#658067;background:#e7efe4;cursor:default}@media(max-width:750px){.protocols-layout{grid-template-columns:1fr}.protocol-aside{display:grid;grid-template-columns:1fr 1fr}.heading-seal{display:none}}@media(max-width:500px){.page-heading{align-items:flex-start}.page-heading h1{font-size:30px}.page-heading>div>p{max-width:270px;line-height:1.5}.protocol-tools{align-items:stretch;flex-direction:column;gap:9px}.scope-switcher{justify-content:space-between}.scope-switcher button{flex:1;padding:7px 4px}.member-search input{width:100%}.protocol-aside{grid-template-columns:1fr}.protocol-card{gap:9px;padding:11px}.protocol-card-copy>strong{font-size:13px}.protocol-detail{padding:15px}.protocol-detail>h2{font-size:23px}.detail-meta{gap:14px}.acknowledgement{align-items:flex-start;flex-wrap:wrap}.acknowledgement p{min-width:calc(100% - 45px)}.acknowledgement button{margin-left:35px}}\n      `]
})
export class MemberProtocols {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(ProtocolCatalog);
  private readonly session = inject(PortalSession);

  protected readonly scopes = ['All', 'Global', 'Regional', 'Local'];
  protected activeScope = 'All';
  protected query = '';
  protected get protocols(): MemberProtocol[] {
    return this.catalog.protocols.map((protocol) => ({
      id: protocol.id,
      title: protocol.title,
      category: protocol.category,
      scope: protocol.scope,
      date: protocol.date,
      summary: protocol.summary,
      detail: protocol.content || protocol.summary,
      status: this.catalog.isRead(protocol.id, this.session.memberEmail) ? 'Read' : 'To read',
      initials: protocol.initials
    }));
  }

  protected get selectedProtocol(): MemberProtocol | null {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? this.protocols.find((protocol) => protocol.id === id) ?? null : null;
  }

  protected get filteredProtocols(): MemberProtocol[] {
    const query = this.query.trim().toLowerCase();
    return this.protocols.filter((protocol) =>
      (this.activeScope === 'All' || protocol.scope === this.activeScope) &&
      (!query || `${protocol.title} ${protocol.category} ${protocol.summary}`.toLowerCase().includes(query))
    );
  }

  protected get readCount(): number {
    return this.protocols.filter((protocol) => protocol.status === 'Read').length;
  }

  protected get readPercentage(): string {
    return this.protocols.length ? `${Math.round((this.readCount / this.protocols.length) * 100)}%` : '0%';
  }

  protected confirmRead(protocol: MemberProtocol): void {
    this.catalog.markAsRead(protocol.id, this.session.memberEmail);
    protocol.status = 'Read';
  }
}
