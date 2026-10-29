import { Component } from '@angular/core';

@Component({
  selector: 'app-member-dress-code',
  template: `
    <header class="page-heading"><div><div class="member-kicker"><span></span> PREPARED FOR EVERY GATHERING</div><h1>Dress code</h1><p>Thoughtful guidance to help us gather with confidence.</p></div><span class="heading-date">WEEK OF <strong>{{ weekLabel }}</strong></span></header>
    <section class="week-bar panel"><div><span class="week-icon">▦</span><span><strong>Weekly guidance</strong><small>October 26 — November 1, 2026</small></span></div><div class="week-controls"><button type="button" aria-label="Previous week" (click)="changeWeek(-1)">‹</button><span>{{ weekLabel }}</span><button type="button" aria-label="Next week" (click)="changeWeek(1)">›</button><button class="today-button" type="button" (click)="weekOffset = 0">This week</button></div></section>
    <section class="dress-grid">
      @for (item of schedule; track item.day) {
        <article class="dress-card panel">
          <div class="dress-art" [class]="item.tone"><span class="dress-decoration">✳</span><small>THE GOODNEWS WORLD</small><strong>{{ item.day }}</strong><i>{{ item.date }}</i></div>
          <div class="dress-info"><div class="dress-info-top"><span class="day-label">{{ item.day }}</span><span class="scope-pill" [class]="item.scope.toLowerCase()">{{ item.scope }}</span></div><h2>{{ item.title }}</h2><p>{{ item.description }}</p><div class="attire-row"><span>Recommended attire</span><strong>{{ item.attire }}</strong></div><button type="button">View guidance <span>→</span></button></div>
        </article>
      }
    </section>
    <aside class="scope-note"><span>✦</span><p><strong>Made for your community.</strong> Global guidance is shared with every member. Regional and local guidance adds the details for your branch.</p></aside>
  `,
  styles: [`
    :host{display:block;color:#39483b;font-family:Arial,"Segoe UI",sans-serif}.member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}.member-kicker>span{width:17px;height:1px;background:#b49a4d}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px}.page-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}.page-heading>div>p{margin:0;color:#8c9186;font-size:10px}.heading-date{display:flex;flex-direction:column;gap:5px;color:#99998d;font-size:7px;letter-spacing:.13em}.heading-date strong{color:#697468;font-size:9px;font-weight:500;letter-spacing:.05em}.panel{border:1px solid #e7e6de;border-radius:4px;background:#fffefa}.week-bar{display:flex;align-items:center;justify-content:space-between;padding:11px 13px}.week-bar>div:first-child{display:flex;align-items:center;gap:9px}.week-icon{color:#aa9148;font-size:18px}.week-bar>div:first-child>span:last-child{display:flex;flex-direction:column;gap:4px}.week-bar strong{color:#576357;font-size:9px;font-weight:600}.week-bar small{color:#96998e;font-size:8px}.week-controls{display:flex;align-items:center;gap:9px}.week-controls>span{color:#83877b;font-size:8px;letter-spacing:.08em}.week-controls button{display:grid;place-items:center;width:25px;height:25px;border:1px solid #e7e7df;border-radius:3px;color:#737c70;background:#fff;font-size:15px;cursor:pointer}.week-controls .today-button{display:block;width:auto;padding:0 8px;color:#79663a;font-size:8px}.dress-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:13px}.dress-card{overflow:hidden}.dress-art{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:142px;overflow:hidden;color:#e2cc7e;background:radial-gradient(ellipse at center,#70613b,#302d22 58%,#20211a)}.dress-art:before,.dress-art:after{position:absolute;width:130px;height:130px;border:1px solid #d5c16b55;border-radius:50%;content:""}.dress-art:after{width:105px;height:105px}.dress-art.black{background:radial-gradient(ellipse at center,#777053,#36352c 60%,#23241e)}.dress-art.green{background:radial-gradient(ellipse at center,#58674f,#30372d 60%,#20241e)}.dress-art.blue{background:radial-gradient(ellipse at center,#526467,#2d3838 60%,#1f2523)}.dress-art.plum{background:radial-gradient(ellipse at center,#69514a,#37302b 60%,#24211e)}.dress-decoration{z-index:1;font-size:28px}.dress-art small{z-index:1;margin-top:5px;font-size:6px;letter-spacing:.22em}.dress-art strong{position:absolute;bottom:20px;z-index:1;color:#f6f0df;font:14px Georgia,serif;letter-spacing:.16em}.dress-art i{position:absolute;right:11px;bottom:9px;z-index:1;color:#d0c9ae;font-size:7px;font-style:normal}.dress-info{padding:12px 14px}.dress-info-top{display:flex;align-items:center;justify-content:space-between}.day-label{color:#a28c4c;font-size:7px;letter-spacing:.12em}.scope-pill{padding:4px 6px;border-radius:2px;color:#806d3e;background:#f3f0e4;font-size:7px}.scope-pill.regional{color:#66806a;background:#edf2e9}.scope-pill.local{color:#667d82;background:#edf1f1}.dress-info h2{margin:10px 0 4px;color:#455246;font:500 16px Georgia,serif}.dress-info>p{margin:0;color:#8c9187;font-size:8px}.attire-row{display:flex;justify-content:space-between;margin-top:12px;padding:9px 0;border-top:1px solid #efeee8;color:#94988e;font-size:8px}.attire-row strong{color:#586458;font-weight:600}.dress-info>button{display:flex;justify-content:space-between;width:100%;padding:9px 0 0;border:0;border-top:1px solid #efeee8;color:#79683a;background:transparent;font:8px Arial,sans-serif;text-align:left;cursor:pointer}.dress-info>button span{color:#ae9651;font-size:12px}.scope-note{display:flex;align-items:center;gap:10px;margin-top:13px;padding:11px 13px;border:1px solid #e7e2d2;border-radius:4px;background:#f7f5ed}.scope-note>span{color:#b0984c;font-size:15px}.scope-note p{margin:0;color:#81867b;font-size:8px;line-height:1.6}.scope-note strong{color:#535e52}@media(max-width:550px){.page-heading{align-items:flex-start}.heading-date{display:none}.week-bar{align-items:flex-start;flex-direction:column;gap:10px}.week-controls{width:100%;justify-content:space-between}.dress-grid{grid-template-columns:1fr}.dress-art{min-height:155px}}\n      `]
})
export class MemberDressCode {
  protected weekOffset = 0;
  protected readonly schedule = [
    { day: 'SUNDAY', date: 'OCT 26', title: 'Sunday service', description: 'A moment for worship and welcome.', attire: 'White shirt · Dark trousers', scope: 'Global', tone: 'black' },
    { day: 'MONDAY', date: 'OCT 27', title: 'Office & administration', description: 'Prepared for a day of service.', attire: 'Business attire · Dark colours', scope: 'Global', tone: 'green' },
    { day: 'WEDNESDAY', date: 'OCT 29', title: 'Midweek gathering', description: 'Come together in a relaxed spirit.', attire: 'Smart casual · Neutral tones', scope: 'Regional', tone: 'blue' },
    { day: 'FRIDAY', date: 'OCT 31', title: 'Youth fellowship', description: 'Bring your energy and be yourself.', attire: 'Youth ministry t-shirt', scope: 'Local', tone: 'plum' }
  ];

  protected get weekLabel(): string {
    return this.weekOffset < 0 ? 'OCT 19 — OCT 25' : this.weekOffset > 0 ? 'NOV 2 — NOV 8' : 'OCT 26 — NOV 1';
  }

  protected changeWeek(direction: number): void {
    this.weekOffset = Math.max(-1, Math.min(1, this.weekOffset + direction));
  }
}
