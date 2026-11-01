import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PortalSession } from '../portal-session';
import { MemberDirectory } from '../member-directory';

@Component({
  selector: 'app-member-portal',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './member-portal.html',
  styleUrl: './member-portal.css'
})
export class MemberPortal {
  protected readonly session = inject(PortalSession);
  private readonly memberDirectory = inject(MemberDirectory);
  protected menuOpen = false;

  protected get peopleCount(): number {
    return this.memberDirectory.people.length;
  }

  protected get memberInitials(): string {
    return this.session.memberName.split(' ').map((part) => part[0]).join('').slice(0, 2);
  }

  protected closeMenu(): void {
    this.menuOpen = false;
  }
}
