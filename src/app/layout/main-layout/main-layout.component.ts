import { Component } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  currentYear = new Date().getFullYear();
  isMobileMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  async logout(): Promise<void> {
    try {
      const { error } = await this.authService.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        // Optionally show an error message to the user
      }
      // Navigate to login page regardless of error, as session might be invalid
      this.router.navigate(['/auth']);
    } catch (err: any) {
      console.error('Unexpected error during sign out:', err.message);
      this.router.navigate(['/auth']); // Fallback navigation
    }
  }
}
