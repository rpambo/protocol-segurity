import { Injectable } from '@angular/core';

export type DirectoryScope = 'Global' | 'Regional' | 'Local';

export interface DirectoryPerson {
  id: string;
  name: string;
  role: string;
  email?: string;
  scope: DirectoryScope;
  region: string;
  branch: string;
  status: 'Active' | 'Invite pending';
  initials: string;
  tone: 'gold' | 'sage' | 'plum' | 'blue';
  about: string;
}

@Injectable({ providedIn: 'root' })
export class MemberDirectory {
  readonly people: readonly DirectoryPerson[] = [
    {
      id: 'rafael-kitoco',
      name: 'Rafael Kitoco',
      role: 'Global Administrator',
      scope: 'Global',
      region: 'The Goodnews World',
      branch: 'Global Office',
      status: 'Active',
      initials: 'RK',
      tone: 'gold',
      about: 'Supports the global workspace and helps keep teams connected across regions and branches.'
    },
    {
      id: 'amina-mensah',
      name: 'Amina Mensah',
      role: 'Regional Administrator',
      email: 'amina.mensah@example.org',
      scope: 'Regional',
      region: 'West Africa',
      branch: 'Regional Office',
      status: 'Active',
      initials: 'AM',
      tone: 'sage',
      about: 'Coordinates regional teams and supports local leaders across West Africa.'
    },
    {
      id: 'grace-ndlovu',
      name: 'Grace Ndlovu',
      role: 'Regional Administrator',
      email: 'grace.ndlovu@example.org',
      scope: 'Regional',
      region: 'Southern Africa',
      branch: 'Regional Office',
      status: 'Active',
      initials: 'GN',
      tone: 'sage',
      about: 'Works with branch teams across Southern Africa to support the community.'
    },
    {
      id: 'daniel-kofi',
      name: 'Daniel Kofi',
      role: 'Local Leader',
      email: 'daniel.kofi@example.org',
      scope: 'Local',
      region: 'West Africa',
      branch: 'Lagos Central',
      status: 'Active',
      initials: 'DK',
      tone: 'gold',
      about: 'Serves the Lagos Central community and supports local gatherings.'
    },
    {
      id: 'sarah-okoro',
      name: 'Sarah Okoro',
      role: 'Local Leader',
      email: 'sarah.okoro@example.org',
      scope: 'Local',
      region: 'West Africa',
      branch: 'Accra North',
      status: 'Active',
      initials: 'SO',
      tone: 'plum',
      about: 'Serves the Accra North community and helps members stay connected.'
    },
    {
      id: 'samuel-adeyemi',
      name: 'Samuel Adeyemi',
      role: 'Member',
      email: 'samuel.adeyemi@example.org',
      scope: 'Local',
      region: 'West Africa',
      branch: 'Lagos Central',
      status: 'Invite pending',
      initials: 'SA',
      tone: 'blue',
      about: 'A member joining the Lagos Central community.'
    }
  ];

  findPerson(id: string | null): DirectoryPerson | null {
    return id ? this.people.find((person) => person.id === id) ?? null : null;
  }
}
