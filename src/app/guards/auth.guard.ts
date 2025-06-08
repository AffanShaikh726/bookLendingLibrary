import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        // If user is loading (true), return false and wait
        if (user === true) {
          return false;
        }
        
        // If user is logged in (User object), allow access
        if (user && typeof user !== 'boolean') {
          return true;
        }
        
        // Otherwise (user is null), redirect to auth page
        return this.router.createUrlTree(['/auth']);
      })
    );
  }
}
