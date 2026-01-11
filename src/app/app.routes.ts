import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { BoardComponent } from './components/board/board.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'board', component: BoardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'auth' },
];
