import { Component, OnInit, OnDestroy, HostListener, Renderer2, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isMobileMenuOpen = false;
  private routerSubscription: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Close mobile menu on navigation
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMobileMenu();
    });
  }
  
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    // Clean up body styles when component is destroyed
    this.renderer.removeStyle(document.body, 'overflow');
  }
  
  // Close mobile menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMobileMenuOpen) return;
    
    const target = event.target as HTMLElement;
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]');
    
    // Don't close if clicking on the menu button or inside the menu
    if ((mobileMenuButton && mobileMenuButton.contains(target)) || 
        (mobileMenu && mobileMenu.contains(target))) {
      return;
    }
    
    // Close if clicking outside the menu
    if (mobileMenu && !mobileMenu.contains(target)) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle the menu state
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Toggle body scroll lock when menu is open
    if (this.isMobileMenuOpen) {
      this.renderer.setStyle(document.body, 'overflow', 'hidden');
    } else {
      this.renderer.removeStyle(document.body, 'overflow');
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
  }
  
  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      this.renderer.removeStyle(document.body, 'overflow');
      this.cdr.detectChanges();
    }
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
