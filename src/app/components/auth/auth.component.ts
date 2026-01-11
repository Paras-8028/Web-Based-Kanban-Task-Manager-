import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent {
  mode: 'login' | 'signup' = 'login';
  username = '';
  email = '';
  password = '';
  confirm = '';
  useEmail = false;

  showPassword = false;
  showConfirm = false;

  loading = false;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {
    if (!this.isLocalStorageAvailable()) {
      this.error = 'Local storage is disabled. Please enable it or use a different browser.';
      this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
    } else {
      // Check storage usage on init
      const usage = this.auth.getStorageUsage();
      if (usage > 4.5) {
        this.error = 'Storage is nearly full. Trying to free up space...';
        this.snack.open(this.error, '', { duration: 3000, panelClass: ['warning-snack'] });
        this.auth.cleanupGuestAccounts(true); // Fixed parameter name
      }
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? 'signup' : 'login';
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirm = '';
    this.useEmail = false;
    this.error = null;
  }

  guestLogin() {
    this.loading = true;
    this.error = null;

    try {
      this.auth.cleanupGuestAccounts();
      const usage = this.auth.getStorageUsage();
      if (usage > 4.5) {
        this.auth.cleanupGuestAccounts(true); // Fixed parameter name
        this.snack.open('Cleared old guest data to free space.', '', { duration: 2000, panelClass: ['info-snack'] });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      this.error = 'Failed to clean up old accounts. Please clear browser data manually (Settings > Privacy > Clear browsing data).';
      this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
      this.loading = false;
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      attempts++;
      const rand = Math.floor(Math.random() * 1_000_000) + 1;
      const guestName = `guest_${rand}`;
      const guestEmail = `guest_${rand}@guest.local`;

      try {
        const res = this.auth.signup(guestName, 'guest', guestEmail);
        if (res.ok) {
          this.snack.open(`Guest account ${guestName} created 🎉`, '', {
            duration: 1500,
            panelClass: ['success-snack'],
          });
          this.router.navigate(['/board']).catch((err) => {
            console.error('Navigation error:', err);
            this.error = 'Failed to navigate to board. Please try again.';
            this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
            this.loading = false;
          });
          this.loading = false;
          return;
        } else if (res.message?.includes('exists')) {
          continue;
        } else {
          this.error = res.message ?? 'Unable to continue as guest. Please try again.';
          this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
          this.loading = false;
          return;
        }
      } catch (error) {
        console.error('Guest login error:', error);
        this.error = 'Failed to create guest account. Storage may be full—please clear browser data (Settings > Privacy > Clear browsing data).';
        this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
        this.loading = false;
        return;
      }
    }

    this.error = 'Too many attempts to create a unique guest account. Please try again later or clear browser data.';
    this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
    this.loading = false;
  }

  submit() {
    this.error = null;

    if (!this.password.trim()) {
      this.error = 'Password is required.';
      this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
      return;
    }

    this.loading = true;

    try {
      this.auth.cleanupGuestAccounts();
      const usage = this.auth.getStorageUsage();
      if (usage > 4.5) {
        this.auth.cleanupGuestAccounts(true); // Fixed parameter name
        this.snack.open('Cleared old guest data to free space.', '', { duration: 2000, panelClass: ['info-snack'] });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      this.error = 'Failed to clean up old accounts. Please clear browser data manually (Settings > Privacy > Clear browsing data).';
      this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
      this.loading = false;
      return;
    }

    setTimeout(() => {
      if (this.mode === 'login') {
        const identifier = this.useEmail ? this.email.trim() : this.username.trim();
        if (!identifier) {
          this.error = this.useEmail ? 'Email is required.' : 'Username is required.';
          this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
          this.loading = false;
          return;
        }

        try {
          const ok = this.auth.login(identifier, this.password.trim());
          if (ok) {
            this.snack.open('Signed in — welcome back!', '', {
              duration: 1500,
              panelClass: ['success-snack'],
            });
            this.router.navigate(['/board']).catch((err) => {
              console.error('Navigation error:', err);
              this.error = 'Failed to navigate to board. Please try again.';
              this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
              this.loading = false;
            });
          } else {
            this.error = 'Invalid credentials. Please try again.';
            this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
            this.loading = false;
          }
        } catch (error) {
          console.error('Login error:', error);
          this.error = 'Login failed due to a storage issue. Please clear browser data (Settings > Privacy > Clear browsing data).';
          this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
          this.loading = false;
        }
      } else {
        // Signup
        if (!this.username.trim()) {
          this.error = 'Username is required.';
          this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
          this.loading = false;
          return;
        }
        if (!this.email.trim()) {
          this.error = 'Email is required.';
          this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
          this.loading = false;
          return;
        }
        if (this.password !== this.confirm) {
          this.error = 'Passwords do not match.';
          this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
          this.loading = false;
          return;
        }

        try {
          const res = this.auth.signup(this.username.trim(), this.password.trim(), this.email.trim());
          if (res.ok) {
            this.snack.open('Account created — you are logged in!', '', {
              duration: 1500,
              panelClass: ['success-snack'],
            });
            this.router.navigate(['/board']).catch((err) => {
              console.error('Navigation error:', err);
              this.error = 'Failed to navigate to board. Please try again.';
              this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
              this.loading = false;
            });
          } else {
            this.error = res.message ?? 'Signup failed. Please try again.';
            this.snack.open(this.error, '', { duration: 3000, panelClass: ['error-snack'] });
            this.loading = false;
          }
        } catch (error) {
          console.error('Signup error:', error);
          this.error = 'Signup failed due to a storage issue. Please clear browser data (Settings > Privacy > Clear browsing data).';
          this.snack.open(this.error, '', { duration: 5000, panelClass: ['error-snack'] });
          this.loading = false;
        }
      }
    }, 450);
  }
}