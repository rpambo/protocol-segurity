import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PortalSession } from '../portal-session';
import { DirectoryPerson, MemberDirectory } from '../member-directory';
import { MemberHelp, MemberHelpRequest } from '../member-help';

@Component({
  selector: 'app-member-portal',
  imports: [DatePipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './member-portal.html',
  styleUrl: './member-portal.css'
})
export class MemberPortal {
  protected readonly session = inject(PortalSession);
  private readonly directory = inject(MemberDirectory);
  private readonly memberHelp = inject(MemberHelp);
  protected menuOpen = false;
  protected showHelpModal = false;
  protected helpTitle = '';
  protected helpMessage = '';
  protected helpError = '';
  protected helpNotice = '';
  protected helpRequests: MemberHelpRequest[] = [];

  protected get systemDateLabel(): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date());
  }

  protected get systemYear(): number {
    return new Date().getFullYear();
  }

  protected get currentAccount(): DirectoryPerson | null {
    return this.directory.findByEmail(this.session.memberEmail);
  }

  protected openHelp(): void {
    this.helpError = '';
    this.helpNotice = '';
    this.helpTitle = '';
    this.helpMessage = '';
    this.showHelpModal = true;
    this.loadHelpRequests();
  }

  protected closeHelp(): void {
    this.showHelpModal = false;
  }

  protected submitHelpRequest(event: Event): void {
    event.preventDefault();
    const account = this.currentAccount;
    this.helpError = '';
    this.helpNotice = '';
    if (!account) {
      this.helpError = 'Your Protocol & Security account could not be found. Contact an administrator through your organisation’s approved support channel.';
      return;
    }

    try {
      this.memberHelp.create({
        email: this.session.memberEmail,
        name: this.session.memberName,
        country: account.country ?? '',
        city: account.city ?? ''
      }, this.helpTitle, this.helpMessage);
      this.helpTitle = '';
      this.helpMessage = '';
      this.helpNotice = 'Your private help request was sent.';
      this.loadHelpRequests();
    } catch (error) {
      this.helpError = error instanceof Error ? error.message : 'Your help request could not be sent.';
    }
  }

  protected closeMenu(): void {
    this.menuOpen = false;
  }

  private loadHelpRequests(): void {
    try {
      this.helpRequests = this.memberHelp.getForMember(this.session.memberEmail);
    } catch (error) {
      this.helpError = error instanceof Error ? error.message : 'Your help requests could not be loaded.';
    }
  }
}
