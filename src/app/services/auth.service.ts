import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _currentUser: BehaviorSubject<User | null | boolean> = new BehaviorSubject<User | null | boolean>(null); // boolean for initial loading state
  private _session: BehaviorSubject<Session | null> = new BehaviorSubject<Session | null>(null);

  // Expose observables for components to listen to
  get currentUser$(): Observable<User | null | boolean> {
    return this._currentUser.asObservable();
  }

  get session$(): Observable<Session | null> {
    return this._session.asObservable();
  }

  // Method to get the current user synchronously (not from an observable)
  getCurrentUserSnapshot(): User | null {
    // Return the current value of the BehaviorSubject
    // But only if it's a User object or null (not the initial boolean loading state)
    const currentValue = this._currentUser.getValue();
    return typeof currentValue !== 'boolean' ? currentValue : null;
  }

  // Sign out the current user
  async signOut(): Promise<{ error: any | null }> {
    this._currentUser.next(null); // Immediately update local state
    const { error } = await this.supabaseService.getSupabaseClient().auth.signOut();
    if (error) {
      console.error('Supabase sign out error:', error);
    }
    // No navigation here, let the calling component handle it
    return { error };
  }

  constructor(private supabaseService: SupabaseService) {
    this.supabaseService.getSupabaseClient().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      this._session.next(session);
      this._currentUser.next(session?.user ?? null);
    });
    this.loadInitialSession();
  }

  private async loadInitialSession() {
    const { data: { session } } = await this.supabaseService.getSupabaseClient().auth.getSession();
    this._session.next(session);
    this._currentUser.next(session?.user ?? null);
    if (!session) {
      this._currentUser.next(false); // Indicate loading finished, no user
    }
  }

  async signUp(credentials: { email?: string; password?: string; phone?: string }) {
    const { email, password, phone } = credentials;
    if (email && password) {
      return this.supabaseService.getSupabaseClient().auth.signUp({ email, password });
    } else if (phone && password) {
      return this.supabaseService.getSupabaseClient().auth.signUp({ phone, password });
    }
    throw new Error('Email or phone, and password are required for sign up.');
  }

  async signInWithPassword(credentials: { email?: string; password?: string; phone?: string }) {
    const { email, password, phone } = credentials;
    if (email && password) {
      return this.supabaseService.getSupabaseClient().auth.signInWithPassword({ email, password });
    } else if (phone && password) {
      // Supabase typically uses email for password sign-in. Phone sign-in might require OTP or other methods.
      // For simplicity, we'll assume email or implement phone OTP if needed later.
      // This is a placeholder for phone + password direct sign-in if Supabase supports it directly or via a custom flow.
      // return this.supabaseService.getSupabaseClient().auth.signInWithPassword({ phone, password });
      throw new Error('Phone + password sign-in might require a different flow (e.g., OTP). Email sign-in is preferred.');
    }
    throw new Error('Email or phone, and password are required for sign in.');
  }

  // signOut method is already implemented above

  // Add other auth methods as needed (e.g., signInWithOtp, signInWithOAuth, etc.)
}
