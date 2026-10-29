import { Routes } from '@angular/router';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { AdminLogin } from './admin-login/admin-login';
import { FirstLogin } from './first-login/first-login';
import { LoginPage } from './login/login-page';
import { MemberDressCode } from './member-portal/member-dress-code';
import { MemberHome } from './member-portal/member-home';
import { MemberMedia } from './member-portal/member-media';
import { MemberPortal } from './member-portal/member-portal';
import { MemberProfile } from './member-portal/member-profile';
import { MemberProtocols } from './member-portal/member-protocols';
import { PublicHome } from './public-home/public-home';
import { requireAdminPasswordChange, requireAdminSession } from './admin-session';
import { requirePortalPasswordChange, requirePortalSession } from './portal-session';

export const routes: Routes = [
  { path: '', component: PublicHome, title: 'Spirit Embassy | Protocol & Security' },
  { path: 'login', component: LoginPage, title: 'Member sign in | Spirit Embassy' },
  {
    path: 'first-login/member',
    component: FirstLogin,
    canActivate: [requirePortalPasswordChange],
    data: { accountType: 'member' },
    title: 'Set your password | Spirit Embassy'
  },
  {
    path: 'portal',
    component: MemberPortal,
    canActivate: [requirePortalSession],
    children: [
      { path: '', component: MemberHome, title: 'Member home | Spirit Embassy' },
      { path: 'protocols', component: MemberProtocols, title: 'Protocols | Spirit Embassy' },
      { path: 'protocols/:id', component: MemberProtocols, title: 'Protocol details | Spirit Embassy' },
      { path: 'dress-code', component: MemberDressCode, title: 'Dress code | Spirit Embassy' },
      { path: 'media', component: MemberMedia, title: 'Media library | Spirit Embassy' },
      { path: 'profile', component: MemberProfile, title: 'My profile | Spirit Embassy' }
    ]
  },
  { path: 'admin/login', component: AdminLogin, title: 'Administrator sign in | Spirit Embassy' },
  {
    path: 'first-login/admin',
    component: FirstLogin,
    canActivate: [requireAdminPasswordChange],
    data: { accountType: 'admin' },
    title: 'Set your password | Spirit Embassy'
  },
  { path: 'admin', component: AdminDashboard, canActivate: [requireAdminSession], title: 'Administration | Spirit Embassy' },
  { path: '**', redirectTo: '' }
];
