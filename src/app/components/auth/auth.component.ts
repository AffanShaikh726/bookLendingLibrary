import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  authForm: FormGroup;
  isLoginMode = true;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user && typeof user !== 'boolean') { // Check if user is an actual user object, not initial loading state
        this.router.navigate(['/app/home']); // Navigate to /app/home if logged in
      }
    });
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
    this.authForm.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.authForm.invalid) {
      this.errorMessage = 'Please enter valid credentials.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const { email, password } = this.authForm.value;

    try {
      let response;
      if (this.isLoginMode) {
        response = await this.authService.signInWithPassword({ email, password });
      } else {
        response = await this.authService.signUp({ email, password });
      }

      if (response?.error) {
        this.errorMessage = response.error.message;
      } else if (!response?.error && response?.data?.user) {
        // Handled by onAuthStateChange in AuthService, which will trigger navigation
        // For sign-up, Supabase might send a confirmation email.
        if (!this.isLoginMode && response.data.session === null) {
            this.errorMessage = 'Sign up successful! Please check your email to confirm your account.';
        } else {
            // Login successful or sign up with auto-confirmation
            this.router.navigate(['/app/home']); // Explicit navigation
        }
      } else if (!response?.error && response?.data.session === null && !this.isLoginMode) {
        this.errorMessage = 'Sign up successful! Please check your email to confirm your account.';
      }

    } catch (error: any) {
      this.errorMessage = error.message || 'An unexpected error occurred.';
    }
    this.isLoading = false;
  }
}
