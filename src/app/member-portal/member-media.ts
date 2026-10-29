import { Component } from '@angular/core';

@Component({
  selector: 'app-member-media',
  template: `
    <header class="page-heading"><div><div class="member-kicker"><span></span> STORIES, GUIDANCE &amp; RESOURCES</div><h1>Media library</h1><p>Useful resources and moments from our global family.</p></div><span class="library-count">06 <small>RESOURCES</small></span></header>
    <section class="media-toolbar panel"><div class="media-tabs">@for (type of types; track type) { <button type="button" [class.selected]="activeType === type" (click)="activeType = type">{{ type }}</button> }</div><label class="member-search"><span>⌕</span><input placeholder="Search resources..." [value]="query" (input)="query = $any($event.target).value"></label></section>
    <section class="media-grid">
      @for (item of filteredItems; track item.title) {
        <article class="media-card panel"><div class="media-cover" [class]="item.tone"><span class="cover-frame"></span><span class="cover-mark">{{ item.type === 'Video' ? '▶' : item.type === 'Document' ? 'PDF' : '✳' }}</span><span class="cover-name">THE GOODNEWS WORLD</span><span class="cover-kind">{{ item.type }} <i>·</i> {{ item.duration }}</span></div><div class="media-card-body"><div class="media-category"><span>{{ item.category }}</span><span class="scope-pill">{{ item.scope }}</span></div><h2>{{ item.title }}</h2><p>{{ item.description }}</p><div class="media-card-foot"><span>{{ item.date }}</span><button type="button" [attr.aria-label]="'Open ' + item.title" (click)="selectedItem = item">Open resource <b>↗</b></button></div></div></article>
      } @empty { <p class="empty-state">No resources found. Try another search or category.</p> }
    </section>
    @if (selectedItem; as item) {
      <div class="resource-backdrop" (click)="selectedItem = null"><section class="resource-dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()"><button class="close-resource" type="button" aria-label="Close" (click)="selectedItem = null">×</button><div class="media-cover dialog-cover" [class]="item.tone"><span class="cover-frame"></span><span class="cover-mark">{{ item.type === 'Video' ? '▶' : item.type === 'Document' ? 'PDF' : '✳' }}</span><span class="cover-name">THE GOODNEWS WORLD</span></div><span class="media-category">{{ item.category }} · {{ item.scope }}</span><h2>{{ item.title }}</h2><p>{{ item.description }}</p><div class="resource-meta">{{ item.type }} <i>·</i> {{ item.duration }} <i>·</i> {{ item.date }}</div><button class="resource-action" type="button" (click)="selectedItem = null">Done <span>✓</span></button></section></div>
    }
  `,
  styles: [`
    :host{display:block;color:#39483b;font-family:Arial,"Segoe UI",sans-serif}.member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}.member-kicker>span{width:17px;height:1px;background:#b49a4d}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px}.page-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}.page-heading>div>p{margin:0;color:#8c9186;font-size:10px}.library-count{display:flex;align-items:baseline;gap:7px;color:#a18b4b;font:20px Georgia,serif}.library-count small{color:#96988e;font:7px Arial,sans-serif;letter-spacing:.12em}.panel{border:1px solid #e7e6de;border-radius:4px;background:#fffefa}.media-toolbar{display:flex;align-items:center;justify-content:space-between;padding:9px 11px}.media-tabs{display:flex;gap:3px}.media-tabs button{padding:7px 10px;border:0;border-radius:3px;color:#848a80;background:transparent;font:8px Arial,sans-serif;cursor:pointer}.media-tabs button.selected{color:#6f6035;background:#f3f0e4;font-weight:600}.member-search{display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid #e6e7df;border-radius:3px;color:#95988e;font-size:17px}.member-search input{width:167px;height:29px;border:0;outline:0;color:#536055;background:transparent;font:9px Arial,sans-serif}.member-search input::placeholder{color:#a0a39a}.media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:13px}.media-card{overflow:hidden}.media-cover{position:relative;display:grid;place-items:center;height:126px;overflow:hidden;color:#e4cf86;background:radial-gradient(ellipse at center,#625535,#302d22 55%,#20211b)}.media-cover.image{background:radial-gradient(ellipse at center,#71816b,#3a473c 58%,#252a22)}.media-cover.guide{background:radial-gradient(ellipse at center,#665640,#3a3327 58%,#24221d)}.media-cover.outreach{background:radial-gradient(ellipse at center,#5c7063,#353d34 58%,#20241e)}.media-cover.gathering{background:radial-gradient(ellipse at center,#746744,#3d3727 58%,#25231c)}.cover-frame{position:absolute;inset:11px;border:1px solid #d9c66a55}.cover-frame:after{position:absolute;inset:8px;border:1px solid #d9c66a38;content:""}.cover-mark{display:grid;place-items:center;width:36px;height:36px;border:1px solid #e0cb74;border-radius:50%;font-size:14px}.cover-name{position:absolute;bottom:11px;font-size:6px;letter-spacing:.2em}.cover-kind{position:absolute;right:17px;top:17px;color:#d2ccb5;font-size:7px}.cover-kind i{margin:0 3px;color:#c6ac53;font-style:normal}.media-card-body{padding:11px}.media-category{display:flex;align-items:center;justify-content:space-between;color:#9c8953;font-size:7px}.scope-pill{padding:4px 6px;border-radius:2px;color:#7d6d3d;background:#f3f0e4;font-size:7px}.media-card-body h2,.resource-dialog h2{overflow:hidden;margin:9px 0 5px;color:#455246;font:500 14px Georgia,serif;text-overflow:ellipsis;white-space:nowrap}.media-card-body>p,.resource-dialog>p{min-height:28px;margin:0;color:#888e83;font-size:8px;line-height:1.6}.media-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #efeee8;color:#999c91;font-size:7px}.media-card-foot button{padding:0;border:0;color:#806d3d;background:transparent;font:7px Arial,sans-serif;cursor:pointer}.media-card-foot b{margin-left:4px;color:#aa9250;font-size:11px;font-weight:400}.empty-state{grid-column:1/-1;padding:35px;border:1px solid #e7e6de;border-radius:4px;color:#899084;background:#fffefa;font-size:9px;text-align:center}.resource-backdrop{position:fixed;inset:0;z-index:10;display:grid;place-items:center;padding:18px;background:#161a15c9}.resource-dialog{position:relative;width:min(100%,440px);padding:18px;border:1px solid #e6e3d6;border-radius:5px;background:#fffefa}.close-resource{position:absolute;z-index:1;top:24px;right:24px;width:27px;height:27px;border:0;border-radius:50%;color:#fff;background:#16181299;font-size:18px;cursor:pointer}.dialog-cover{height:195px}.resource-dialog>.media-category{display:block;margin-top:14px}.resource-dialog h2{font-size:19px}.resource-dialog>p{min-height:0;font-size:9px}.resource-meta{margin-top:13px;padding-top:10px;border-top:1px solid #edede5;color:#8c9187;font-size:8px}.resource-meta i{margin:0 4px;color:#b89e4b;font-style:normal}.resource-action{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:15px;padding:10px 12px;border:1px solid #796638;border-radius:3px;color:#fff;background:#796638;font:9px Arial,sans-serif;cursor:pointer}@media(max-width:800px){.media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:550px){.page-heading{align-items:flex-start}.library-count{display:none}.media-toolbar{align-items:stretch;flex-direction:column;gap:8px}.media-tabs{justify-content:space-between}.media-tabs button{flex:1;padding:7px 4px}.member-search input{width:100%}.media-grid{grid-template-columns:1fr}.media-cover{height:155px}}\n      `]
})
export class MemberMedia {
  protected readonly types = ['All resources', 'Videos', 'Documents', 'Images'];
  protected activeType = 'All resources';
  protected query = '';
  protected selectedItem: MediaItem | null = null;
  protected readonly items: MediaItem[] = [
    { title: 'The Goodnews World — Introduction', type: 'Video', category: 'OUR STORY', scope: 'Global', duration: '08:42', date: 'Oct 24, 2026', description: 'A short welcome to our community, our shared values and the work we do together.', tone: 'video' },
    { title: 'Sunday Service Protocol', type: 'Document', category: 'WORSHIP & SERVICE', scope: 'Global', duration: 'PDF · 2.4 MB', date: 'Oct 22, 2026', description: 'A printable guide for teams preparing to welcome and serve at Sunday gatherings.', tone: 'guide' },
    { title: 'Welcome to Lagos Central', type: 'Image', category: 'COMMUNITY', scope: 'Regional', duration: 'JPG · 4.1 MB', date: 'Oct 20, 2026', description: 'A few moments from recent gatherings in the West Africa community.', tone: 'image' },
    { title: 'Worship Team Guidelines', type: 'Document', category: 'WORSHIP & SERVICE', scope: 'Local', duration: 'PDF · 1.8 MB', date: 'Oct 18, 2026', description: 'Helpful notes for local worship teams and service coordinators.', tone: 'guide' },
    { title: 'Community Outreach Highlights', type: 'Video', category: 'COMMUNITY', scope: 'Regional', duration: '12:16', date: 'Oct 16, 2026', description: 'Stories of care and service from across our regional communities.', tone: 'outreach' },
    { title: 'Global Gathering — October', type: 'Image', category: 'GATHERINGS', scope: 'Global', duration: 'PNG · 3.2 MB', date: 'Oct 12, 2026', description: 'A selection of moments from our October global gathering.', tone: 'gathering' }
  ];

  protected get filteredItems(): MediaItem[] {
    const query = this.query.trim().toLowerCase();
    const selectedType = this.activeType === 'Videos' ? 'Video' : this.activeType === 'Documents' ? 'Document' : this.activeType === 'Images' ? 'Image' : null;
    return this.items.filter((item) =>
      (!selectedType || item.type === selectedType) &&
      (!query || `${item.title} ${item.category} ${item.scope}`.toLowerCase().includes(query))
    );
  }
}

interface MediaItem {
  title: string;
  type: string;
  category: string;
  scope: string;
  duration: string;
  date: string;
  description: string;
  tone: string;
}
