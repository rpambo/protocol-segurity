import { Component, EventEmitter, Output } from '@angular/core';

interface HelpArticle {
  title: string;
  category: string;
  description: string;
  section: string;
  actionLabel: string;
  keywords: string;
}

@Component({
  selector: 'app-admin-help-center',
  template: `
    <div class="help-center-backdrop" (click)="close.emit()">
      <section class="help-center-dialog" role="dialog" aria-modal="true" aria-labelledby="help-center-title" (click)="$event.stopPropagation()">
        <header class="help-center-header">
          <div>
            <span class="help-center-kicker">THE GOODNEWS WORLD · ADMIN GUIDE</span>
            <h2 id="help-center-title">Help centre</h2>
            <p>Find guidance for using your platform.</p>
          </div>
          <button class="help-center-close" type="button" aria-label="Close help centre" (click)="close.emit()">×</button>
        </header>

        <label class="help-center-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg>
          <input type="search" placeholder="Search guidance..." [value]="query" (input)="query = $any($event.target).value">
        </label>

        <div class="help-center-content">
          @for (article of filteredArticles; track article.title) {
            <article class="help-center-article">
              <span>{{ article.category }}</span>
              <h3>{{ article.title }}</h3>
              <p>{{ article.description }}</p>
              <button type="button" (click)="openSection(article.section)">{{ article.actionLabel }} <b aria-hidden="true">→</b></button>
            </article>
          } @empty {
            <div class="help-center-empty"><strong>No guidance found</strong><p>Try a different search term.</p></div>
          }
        </div>
        <footer class="help-center-footer">
          <span>Need personal assistance?</span>
          <button type="button" (click)="openSection('Help messages')">Open member help requests <b aria-hidden="true">→</b></button>
        </footer>
      </section>
    </div>
  `,
  styles: [`
    :host{position:fixed;inset:0;z-index:30}
    .help-center-backdrop{display:grid;place-items:center;width:100%;height:100%;padding:20px;background:#14251dcc;backdrop-filter:blur(3px)}
    .help-center-dialog{display:flex;width:min(760px,100%);max-height:min(88vh,780px);flex-direction:column;overflow:hidden;border:1px solid #e8e8df;border-radius:12px;background:#fffefa;box-shadow:0 24px 80px #1020164d}
    .help-center-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:22px 24px 17px;border-bottom:1px solid #eeeee7}
    .help-center-kicker{color:#9b8750;font-size:8px;font-weight:650;letter-spacing:.15em}
    .help-center-header h2{margin:8px 0 4px;color:#2f4539;font:500 27px Georgia,serif}
    .help-center-header p{margin:0;color:#858c83;font-size:10px}
    .help-center-close{width:31px;height:31px;border:0;border-radius:5px;color:#778279;background:#f3f4ee;font-size:21px;cursor:pointer}
    .help-center-search{display:flex;align-items:center;gap:8px;margin:15px 24px 0;padding:0 10px;border:1px solid #e4e6de;border-radius:5px;color:#92988e}
    .help-center-search svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
    .help-center-search input{width:100%;height:36px;border:0;outline:0;color:#435148;background:transparent;font:10px Arial,sans-serif}
    .help-center-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;overflow:auto;padding:16px 24px}
    .help-center-article{padding:13px;border:1px solid #e9e9e1;border-radius:7px;background:#fff}
    .help-center-article>span{color:#a18a4a;font-size:7px;font-weight:650;letter-spacing:.12em;text-transform:uppercase}
    .help-center-article h3{margin:7px 0 5px;color:#435348;font:500 15px Georgia,serif}
    .help-center-article p{min-height:38px;margin:0;color:#858c83;font-size:9px;line-height:1.55}
    .help-center-article button,.help-center-footer button{margin-top:10px;padding:0;border:0;color:#806c36;background:transparent;font:600 9px Arial,sans-serif;cursor:pointer}
    .help-center-article button b,.help-center-footer button b{margin-left:5px;color:#b49a4d;font-size:12px;font-weight:400}
    .help-center-empty{grid-column:1/-1;padding:35px;text-align:center;color:#59675b}
    .help-center-empty p{margin:6px 0 0;color:#92988e;font-size:9px}
    .help-center-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px;border-top:1px solid #eeeee7;background:#fbfbf8}
    .help-center-footer>span{color:#858c83;font-size:9px}.help-center-footer button{margin:0}
    @media(max-width:580px){.help-center-backdrop{padding:10px}.help-center-header{padding:17px}.help-center-search{margin:12px 17px 0}.help-center-content{grid-template-columns:1fr;padding:12px 17px}.help-center-footer{align-items:flex-start;flex-direction:column;padding:11px 17px}.help-center-article p{min-height:0}}
  `]
})
export class AdminHelpCenter {
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly navigate = new EventEmitter<string>();

  protected query = '';

  private readonly articles: HelpArticle[] = [
    {
      category: 'Getting started',
      title: 'Overview and daily activity',
      description: 'Review directory totals, recent account activity and workspace summaries from your assigned area.',
      section: 'Overview',
      actionLabel: 'Open overview',
      keywords: 'dashboard overview activity home'
    },
    {
      category: 'People',
      title: 'Create a Protocol & Security entry',
      description: 'Add a member or eligible Admin. Account type and location options follow your Admin level.',
      section: 'Protocols',
      actionLabel: 'Open Protocol & Security',
      keywords: 'create people member officer leader protocol security'
    },
    {
      category: 'Administration',
      title: 'Manage Admin accounts',
      description: 'Review Admin levels, check assigned locations and manage accounts permitted by your hierarchy.',
      section: 'Admins',
      actionLabel: 'Open Admins',
      keywords: 'admin global regional local block remove accounts'
    },
    {
      category: 'Locations',
      title: 'Regions and branches',
      description: 'See countries, cities and people grouped by location within your administrative scope.',
      section: 'Regions & branches',
      actionLabel: 'Open regions',
      keywords: 'country city location region branch'
    },
    {
      category: 'Privacy & support',
      title: 'Reply to a private help request',
      description: 'Open a member request, respond privately, then mark it resolved to keep it in the resolved history.',
      section: 'Help messages',
      actionLabel: 'Open help requests',
      keywords: 'help message privacy private response reply resolved support'
    },
    {
      category: 'Reports',
      title: 'Review account activity',
      description: 'Filter sign-ins, sign-outs and account changes by date range and administrative location.',
      section: 'Reports & audit',
      actionLabel: 'Open reports',
      keywords: 'audit reports login logout sign in sign out history'
    },
    {
      category: 'Communication',
      title: 'Use Admin chat rooms',
      description: 'Choose the Global, Regional or Local room available to your Admin level and assigned location.',
      section: 'Admin chat',
      actionLabel: 'Open Admin chat',
      keywords: 'chat global regional local messages'
    },
    {
      category: 'Workspace',
      title: 'Workspace preferences',
      description: 'Review local security, notification and language preferences. Some settings are prototype-only.',
      section: 'Settings',
      actionLabel: 'Open settings',
      keywords: 'settings security notifications language preferences'
    }
  ];

  protected get filteredArticles(): HelpArticle[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.articles.filter((article) =>
      !query || `${article.title} ${article.category} ${article.description} ${article.keywords}`.toLocaleLowerCase().includes(query)
    );
  }

  protected openSection(section: string): void {
    this.navigate.emit(section);
    this.close.emit();
  }
}
