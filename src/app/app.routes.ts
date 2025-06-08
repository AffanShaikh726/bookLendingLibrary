import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { AddBookComponent } from './pages/add-book/add-book.component';
import { ManageRequestsComponent } from './pages/manage-requests/manage-requests.component'; // Import ManageRequestsComponent
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard], // Apply AuthGuard to protect all /app routes
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'add-book', component: AddBookComponent },
      { path: 'manage-requests', component: ManageRequestsComponent } // Add route for ManageRequestsComponent
    ]
  },
  { path: '**', redirectTo: '/auth' } // Catch-all route for undefined routes
];
