import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-security',
  imports: [RouterLink],
  template: `
    <main class="privacy-page">
      <header class="privacy-topbar">
        <a class="privacy-brand" routerLink="/">
          <img src="imagem/logo.png" width="42" height="42" alt="">
          <span><strong>SPIRIT EMBASSY</strong><small>PROTOCOL &amp; SECURITY</small></span>
        </a>
        <a class="privacy-back" routerLink="/login">Back to sign in</a>
      </header>

      <section class="privacy-hero">
        <span class="privacy-kicker">YOUR INFORMATION · OUR RESPONSIBILITY</span>
        <h1>Privacy &amp; security</h1>
        <p>This notice explains how Spirit Embassy Protocol &amp; Security collects, uses, stores and protects information when you use the platform.</p>
        <div class="privacy-notice"><strong>Your privacy matters.</strong><span>Only provide accurate information needed to manage your account and participation. Do not include sensitive personal information in chat or help requests unless it is necessary and you are authorised to share it.</span></div>
      </section>

      <div class="privacy-content">
        <nav class="privacy-toc" aria-label="On this page">
          <strong>On this page</strong>
          <button type="button" (click)="scrollTo('data-collected')">Information we collect</button>
          <button type="button" (click)="scrollTo('storage')">How we store information</button>
          <button type="button" (click)="scrollTo('sign-in')">Sign-in and access</button>
          <button type="button" (click)="scrollTo('sharing')">How information is shared</button>
          <button type="button" (click)="scrollTo('retention')">Retention and deletion</button>
          <button type="button" (click)="scrollTo('rights')">Your choices and rights</button>
        </nav>

        <article class="privacy-article">
          <section id="data-collected">
            <h2>Information we collect</h2>
            <p>To provide accounts, community administration and support, the platform may process:</p>
            <ul>
              <li>Directory and account details such as name, email, account type, role, country, city and account status.</li>
              <li>Profile details such as a display name, profile image and email visibility preference.</li>
              <li>Audit entries recording account actions and sign-in or sign-out attempts, including an email address, action, result and timestamp.</li>
              <li>Messages in the member and Admin chats, and private help requests and replies.</li>
              <li>Workspace and account preferences, including whether initial account setup has been completed.</li>
            </ul>
            <p>Please provide information about another person only when you are authorised to do so and it is necessary for the platform’s purposes.</p>
          </section>

          <section id="storage">
            <h2>How we store information</h2>
            <p>Information is stored in the platform’s systems and is associated with the account and organisation that use it. It is retained only for as long as needed for account administration, communication, security, record-keeping and applicable legal obligations.</p>
            <p>We use administrative and technical safeguards designed to protect information from unauthorised access, loss, alteration or disclosure. You are responsible for keeping your sign-in details confidential and signing out when using a shared device.</p>
          </section>

          <section id="sign-in">
            <h2>Sign-in and access controls</h2>
            <p>Account access is intended for invited or authorised users. Access to administrative functions and records is governed by account role and assigned country or city. Administrators should access only information needed for their responsibilities.</p>
            <p>Sign-in and important account changes may be recorded for security, troubleshooting and accountability. Never share your password with another person; contact your administrator if you believe your account has been accessed without permission.</p>
          </section>

          <section id="sharing">
            <h2>How information is shared</h2>
            <p>Directory information is made available to users according to their access level and the visibility settings associated with an account. Private help requests and replies are intended to be visible to the requesting member and administrators authorised for that member’s location. Chat messages are visible to participants with access to the relevant room.</p>
            <p>We do not sell personal information. Information may be disclosed to service providers that support platform operations, where required by law, or when necessary to protect users and the organisation. When the country selector is used, the platform contacts CountriesNow to retrieve country names; that provider may receive standard connection information such as an IP address under its own terms.</p>
          </section>

          <section id="retention">
            <h2>Retention and deletion</h2>
            <p>Information is kept only for the period needed for the purposes described in this notice, including maintaining accounts, responding to support requests, protecting the platform and meeting record-keeping obligations. Security and audit records may be retained for an appropriate period to support investigations and accountability.</p>
            <p>When information is no longer needed, it should be securely deleted or anonymised in accordance with the organisation’s retention requirements, subject to legal obligations.</p>
          </section>

          <section id="rights">
            <h2>Your choices and rights</h2>
            <p>Depending on the laws that apply to you, you may be entitled to request access to, correction of, or deletion of your personal information, or to object to or restrict certain uses. You may also update profile details and visibility preferences through your account where those options are available.</p>
            <p>To make a privacy request or report a security concern, contact your assigned administrator and identify the account concerned. The organisation may need to verify your identity before acting on a request.</p>
          </section>
          <footer class="privacy-article-footer"><a routerLink="/">Spirit Embassy</a><span>Privacy &amp; security</span><a routerLink="/admin/login">Administrator sign in</a></footer>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;color:#34463e;background:#f8f7f2;font-family:Arial,"Segoe UI",sans-serif}
    .privacy-page{min-height:100vh}
    .privacy-topbar{display:flex;align-items:center;justify-content:space-between;padding:15px max(24px,calc((100vw - 1100px)/2));border-bottom:1px solid #e8e7df;background:#fffefa}
    .privacy-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}.privacy-brand img{object-fit:contain}.privacy-brand span{display:flex;flex-direction:column;gap:4px}.privacy-brand strong{font:12px Georgia,serif;letter-spacing:.13em}.privacy-brand small{color:#999581;font-size:7px;letter-spacing:.2em}
    .privacy-back{color:#75643a;font-size:10px;text-decoration:none}.privacy-back:hover,.privacy-article a:hover{color:#a18a4a}
    .privacy-hero{max-width:900px;margin:0 auto;padding:54px 24px 30px}.privacy-kicker{color:#9b8750;font-size:8px;font-weight:650;letter-spacing:.16em}.privacy-hero h1{margin:11px 0;color:#2f4539;font:500 clamp(31px,5vw,46px) Georgia,serif;letter-spacing:-.03em}.privacy-hero>p{max-width:710px;margin:0;color:#7e887d;font-size:12px;line-height:1.75}
    .privacy-notice{display:flex;flex-direction:column;gap:6px;margin-top:22px;padding:14px 16px;border:1px solid #e6d9b8;border-left:4px solid #a68c47;border-radius:5px;color:#625634;background:#f7f2e4}.privacy-notice strong{font-size:10px}.privacy-notice span{font-size:9px;line-height:1.55}
    .privacy-content{display:grid;grid-template-columns:205px minmax(0,690px);align-items:start;gap:30px;max-width:900px;margin:0 auto;padding:0 24px 50px}
    .privacy-toc{position:sticky;top:18px;display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:14px;border:1px solid #e8e8df;border-radius:6px;background:#fffefa}.privacy-toc strong{margin-bottom:2px;color:#4f5c50;font-size:9px}.privacy-toc button{padding:0;border:0;color:#7d867b;background:transparent;font:8px/1.4 Arial,sans-serif;text-align:left;cursor:pointer}.privacy-toc button:hover{color:#806c36}
    .privacy-article{padding:21px 24px;border:1px solid #e8e8df;border-radius:7px;background:#fffefa}.privacy-article section{scroll-margin-top:20px;padding:0 0 17px;margin:0 0 17px;border-bottom:1px solid #eeeee7}.privacy-article section:last-of-type{margin-bottom:0}.privacy-article h2{margin:0 0 8px;color:#3e5044;font:500 19px Georgia,serif}.privacy-article p,.privacy-article li{color:#737e73;font-size:10px;line-height:1.75}.privacy-article p{margin:7px 0}.privacy-article ul{display:grid;gap:5px;padding-left:19px}.privacy-article li::marker{color:#ad9652}
    .privacy-article-footer{display:flex;justify-content:space-between;gap:10px;padding-top:16px;color:#9a9d94;font-size:8px}.privacy-article-footer a{color:#806c36;text-decoration:none}
    @media(max-width:680px){.privacy-topbar{padding:12px 17px}.privacy-hero{padding:34px 18px 22px}.privacy-hero>p{font-size:11px}.privacy-content{grid-template-columns:1fr;gap:13px;padding:0 18px 35px}.privacy-toc{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.privacy-toc strong{grid-column:1/-1}.privacy-article{padding:17px}.privacy-article-footer{flex-wrap:wrap}}
  `]
})
export class PrivacySecurity {
  protected scrollTo(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
