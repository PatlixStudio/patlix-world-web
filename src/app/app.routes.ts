import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'world',
    loadComponent: () =>
      import('./features/world/world').then((m) => m.World),
  },
  { path: '**', redirectTo: '' },
];