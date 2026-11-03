import { Component, inject } from '@angular/core';
import { PortalSession } from '../portal-session';

@Component({
  selector: 'app-member-profile',
  template: `
    <header class="page-heading">
      <div>
        <div class="member-kicker"><span></span> YOUR PLACE IN THE COMMUNITY</div>
        <h1>My profile</h1>
        <p>Your account details and community connection.</p>
      </div>
      @if (editing) {
        <div class="edit-actions">
          <button class="cancel-button" type="button" (click)="cancelEditing()">Cancel</button>
          <button class="edit-button" type="button" (click)="saveProfile()">Save changes</button>
        </div>
      } @else {
        <button class="edit-button" type="button" (click)="startEditing()">Edit profile</button>
      }
    </header>
    <section class="profile-grid">
      <article class="profile-main panel">
        <div class="profile-cover">
          <span class="cover-logo"><img src="imagem/logo.png" alt=""></span>
          <small>THE GOODNEWS WORLD</small>
        </div>
        <div class="profile-identity">
          <span class="profile-avatar">
            @if (draftAvatar) {
              <img [src]="draftAvatar" alt="Profile photo">
            } @else {
              <img src="imagem/logo.png" alt="Spirit Embassy logo">
            }
          </span>
          <div><h2>{{ session.memberName }}</h2><p>{{ session.accountRole }} <i>·</i> {{ session.accountLocation }}</p></div>
          <span class="active-badge"><i></i> ACTIVE</span>
        </div>
        <div class="profile-section">
          <div class="profile-section-heading">
            <h3>Personal details</h3>
            <span>VISIBLE TO YOUR ADMINISTRATORS</span>
          </div>
          @if (editing) {
            <div class="photo-editor">
              <label class="photo-upload">
                <input type="file" accept="image/*" (change)="onAvatarSelected($event)">
                <span>Choose profile photo</span>
              </label>
              @if (draftAvatar) {
                <button class="remove-photo" type="button" (click)="removePhoto()">Remove photo</button>
              }
              <small>Image files up to 1 MB. The Spirit Embassy logo is shown when no photo is selected.</small>
            </div>
          }
          <div class="details-grid">
            <label>FULL NAME<input [disabled]="!editing" [value]="draftName" (input)="updateDraftName($event)" autocomplete="name"></label>
            <label>EMAIL ADDRESS<input disabled [value]="session.memberEmail" autocomplete="email"></label>
            <label>USERNAME<input disabled [value]="username" autocomplete="username"></label>
            <label>MEMBER SINCE<input disabled value="October 2026"></label>
          </div>
          <label class="email-visibility">
            <input type="checkbox" [checked]="draftEmailVisible" [disabled]="!editing" (change)="updateEmailVisibility($event)">
            <span><strong>Show my email on my member profile</strong><small>When disabled, other members cannot see your email in the Protocol &amp; Security directory.</small></span>
          </label>
          @if (profileError) { <p class="profile-error" role="alert">{{ profileError }}</p> }
          @if (editing) { <p class="profile-save-note">Your name and profile photo are saved in this browser for this account.</p> }
        </div>
        <div class="profile-section">
          <div class="profile-section-heading"><h3>Your community</h3><span>ORGANISATION</span></div>
          <div class="community-info">
            <span class="community-mark">G</span>
            <span><strong>The Goodnews World</strong><small>Protocol &amp; Security Department</small></span>
            <span class="community-location">{{ session.accountLocation }}</span>
          </div>
        </div>
      </article>
      <aside class="profile-aside">
        <article class="profile-side-card panel">
          <div class="member-kicker"><span></span> YOUR CONNECTION</div>
          <strong>One family,<br>many gatherings.</strong>
          <p>Your member account is connected to your local branch and regional community.</p>
          <div class="connection-line"><i></i><span>Global community<small>The Goodnews World</small></span></div>
          <div class="connection-line"><i></i><span>Account type<small>{{ session.accountRole }}</small></span></div>
          <div class="connection-line"><i></i><span>Your community<small>{{ session.accountLocation }}</small></span></div>
        </article>
        <button class="sign-out-button" type="button" (click)="session.signOut()">Sign out <span>↗</span></button>
        <p class="profile-help">Need to update your account access?<br>Contact your local administrator.</p>
      </aside>
    </section>
  `,
  styles: [`
    :host{display:block;color:#39483b;font-family:Arial,"Segoe UI",sans-serif}
    .member-kicker{display:flex;align-items:center;gap:8px;color:#9b874d;font-size:8px;letter-spacing:.14em}
    .member-kicker>span{width:17px;height:1px;background:#b49a4d}
    .page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px}
    .page-heading h1{margin:10px 0 5px;color:#354237;font:400 34px Georgia,serif;letter-spacing:-.03em}
    .page-heading>div>p{margin:0;color:#8c9186;font-size:10px}
    .edit-actions{display:flex;gap:7px}
    .edit-button,.cancel-button{padding:9px 12px;border:1px solid #deddd2;border-radius:3px;color:#73623b;background:#fffefa;font:8px Arial,sans-serif;cursor:pointer}
    .edit-button{border-color:#77673f;color:#fff;background:#77673f}
    .profile-grid{display:grid;grid-template-columns:minmax(0,1fr) 245px;align-items:start;gap:14px}
    .panel{border:1px solid #e7e6de;border-radius:4px;background:#fffefa}
    .profile-main{overflow:hidden}
    .profile-cover{position:relative;display:flex;align-items:center;justify-content:center;gap:9px;height:111px;color:#d7c274;background:radial-gradient(ellipse at center,#645738,#2d2b21 58%,#20211b)}
    .profile-cover:before,.profile-cover:after{position:absolute;width:100px;height:100px;border:1px solid #d7c27444;border-radius:50%;content:""}
    .profile-cover:after{width:78px;height:78px}
    .cover-logo{z-index:1;display:grid;place-items:center;width:42px;height:42px;overflow:hidden;border:1px solid #d7c274;border-radius:50%;background:#fff}
    .cover-logo img{width:100%;height:100%;object-fit:contain}
    .profile-cover>small{z-index:1;font-size:7px;letter-spacing:.18em}
    .profile-identity{display:flex;align-items:center;gap:11px;margin:0 17px;padding:15px 0;border-bottom:1px solid #eeede6}
    .profile-avatar{display:grid;place-items:center;flex:0 0 auto;width:48px;height:48px;overflow:hidden;border:2px solid white;border-radius:50%;background:#fff;box-shadow:0 0 0 1px #e2e3da}
    .profile-avatar img{width:100%;height:100%;object-fit:cover}
    .profile-identity>div{flex:1;min-width:0}
    .profile-identity h2{margin:0 0 5px;color:#405044;font:500 18px Georgia,serif}
    .profile-identity p{margin:0;color:#8d9388;font-size:8px}
    .profile-identity p i{margin:0 3px;color:#b5a05a;font-style:normal}
    .active-badge{display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:2px;color:#638068;background:#edf2ea;font-size:7px;letter-spacing:.06em}
    .active-badge i{width:5px;height:5px;border-radius:50%;background:#84a881}
    .profile-section{padding:15px 17px;border-bottom:1px solid #eeede6}
    .profile-section:last-child{border:0}
    .profile-section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
    .profile-section-heading h3{margin:0;color:#4a574a;font:500 14px Georgia,serif}
    .profile-section-heading>span{color:#a2a094;font-size:6px;letter-spacing:.1em}
    .photo-editor{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 14px}
    .photo-upload{position:relative;display:inline-flex;align-items:center;padding:8px 10px;border:1px solid #deddd2;border-radius:3px;color:#73623b;background:#fffefa;font-size:8px;cursor:pointer}
    .photo-upload input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%)}
    .photo-upload:focus-within{outline:2px solid #c5a451;outline-offset:2px}
    .remove-photo{padding:7px 8px;border:0;color:#8a6257;background:transparent;font:8px Arial,sans-serif;cursor:pointer}
    .photo-editor>small{flex-basis:100%;color:#92958a;font-size:7px}
    .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
    .details-grid label{display:flex;flex-direction:column;gap:6px;color:#99998d;font-size:7px;letter-spacing:.08em}
    .details-grid input{height:34px;padding:0 9px;border:1px solid #e8e8e1;border-radius:3px;color:#657065;background:#fff;font:9px Arial,sans-serif}
    .details-grid input:disabled{color:#657065;background:#fafaf6}
    .email-visibility{display:flex;align-items:flex-start;gap:9px;margin-top:14px;padding:11px;border:1px solid #e8e7df;border-radius:3px;background:#fbfaf6}
    .email-visibility>input{width:14px;height:14px;flex:0 0 auto;margin:1px 0 0;accent-color:#75663e}
    .email-visibility>span{display:flex;flex-direction:column;gap:4px}
    .email-visibility strong{color:#5d685a;font-size:8px;font-weight:600;letter-spacing:normal}
    .email-visibility small{color:#92958a;font-size:7px;letter-spacing:normal;line-height:1.5}
    .profile-save-note,.profile-error{margin:12px 0 0;padding:10px;border:1px solid #e8e1c9;border-radius:3px;color:#796b40;background:#f8f5e9;font-size:8px;line-height:1.5}
    .profile-error{border-color:#e4c9c4;color:#8a3d32;background:#fff5f3}
    .community-info{display:flex;align-items:center;gap:9px}
    .community-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:4px;color:#4f583e;background:#ecebdc;font:15px Georgia,serif}
    .community-info>span:nth-child(2){display:flex;flex:1;flex-direction:column;gap:4px}
    .community-info strong{color:#5a675a;font-size:8px}
    .community-info small{color:#9a9d92;font-size:7px}
    .community-location{color:#878d80;font-size:7px}
    .community-location i{margin:0 3px;color:#baa45a;font-style:normal}
    .profile-aside{display:flex;flex-direction:column;gap:11px}
    .profile-side-card{padding:14px}
    .profile-side-card>strong{display:block;margin:13px 0 7px;color:#475447;font:20px/1.15 Georgia,serif}
    .profile-side-card>p{margin:0 0 14px;color:#858b80;font-size:8px;line-height:1.65}
    .connection-line{position:relative;display:flex;gap:9px;padding:0 0 12px 3px;color:#5d695c;font-size:8px}
    .connection-line:before{position:absolute;top:10px;bottom:-1px;left:6px;width:1px;background:#e5e3d8;content:""}
    .connection-line:last-child{padding-bottom:1px}
    .connection-line:last-child:before{display:none}
    .connection-line>i{z-index:1;flex:0 0 auto;width:7px;height:7px;margin-top:2px;border:1px solid #b8a25d;border-radius:50%;background:#f7f4e9}
    .connection-line>span{display:flex;flex-direction:column;gap:4px}
    .connection-line small{color:#999c91;font-size:7px}
    .sign-out-button{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #e6e2d7;border-radius:3px;color:#796744;background:#fffefa;font:8px Arial,sans-serif;cursor:pointer}
    .sign-out-button span{color:#a8924b}
    .profile-help{margin:0;color:#97998e;font-size:8px;line-height:1.6;text-align:center}
    @media(max-width:740px){.profile-grid{grid-template-columns:1fr}.profile-aside{display:grid;grid-template-columns:1fr 1fr;align-items:start}.profile-side-card{grid-row:span 2}}
    @media(max-width:500px){.page-heading{align-items:flex-start}.profile-identity{margin:0 12px}.profile-section{padding:13px 12px}.details-grid{grid-template-columns:1fr}.profile-identity h2{font-size:15px}.active-badge{margin-left:auto}.community-info{flex-wrap:wrap}.community-location{width:100%;margin-left:41px}.profile-aside{grid-template-columns:1fr}.profile-side-card{grid-row:auto}}
  `]
})
export class MemberProfile {
  protected readonly session = inject(PortalSession);
  protected editing = false;
  protected draftName = this.session.memberName;
  protected draftAvatar = this.session.memberAvatar;
  protected draftEmailVisible = this.session.memberEmailVisible;
  protected profileError = '';

  protected get username(): string {
    return this.session.memberEmail.split('@')[0] ?? '';
  }

  protected startEditing(): void {
    this.draftName = this.session.memberName;
    this.draftAvatar = this.session.memberAvatar;
    this.draftEmailVisible = this.session.memberEmailVisible;
    this.profileError = '';
    this.editing = true;
  }

  protected updateDraftName(event: Event): void {
    this.draftName = (event.target as HTMLInputElement).value;
  }

  protected updateEmailVisibility(event: Event): void {
    this.draftEmailVisible = (event.target as HTMLInputElement).checked;
  }

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.profileError = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.profileError = 'Choose a valid image file.';
      input.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      this.profileError = 'The profile photo must be 1 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.profileError = 'The selected photo could not be read. Please choose another image.';
        return;
      }
      this.draftAvatar = reader.result;
    };
    reader.onerror = () => {
      this.profileError = 'The selected photo could not be read. Please try again.';
    };
    reader.readAsDataURL(file);
  }

  protected removePhoto(): void {
    this.draftAvatar = '';
    this.profileError = '';
  }

  protected saveProfile(): void {
    try {
      this.session.updateProfile(this.draftName, this.draftAvatar, this.draftEmailVisible);
      this.editing = false;
      this.profileError = '';
    } catch (error) {
      this.profileError = error instanceof Error
        ? `Your profile could not be saved: ${error.message}`
        : 'Your profile could not be saved. Please try again.';
    }
  }

  protected cancelEditing(): void {
    this.draftName = this.session.memberName;
    this.draftAvatar = this.session.memberAvatar;
    this.draftEmailVisible = this.session.memberEmailVisible;
    this.profileError = '';
    this.editing = false;
  }
}
