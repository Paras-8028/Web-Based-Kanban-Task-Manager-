import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import * as LZString from 'lz-string';

const USERS_KEY = 'kanban_users_v1';
const ACTIVE_USER_KEY = 'kanban_active_user_v1';

type UserRecord = { username: string; password: string; email: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<string | null>(null);
  readonly user$ = this._user$.asObservable();

  constructor(private storage: LocalStorageService) {
    try {
      // Seed default user if none exists
      const users = this.storage.get<UserRecord[]>(USERS_KEY, []);
      if (!users || users.length === 0) {
        const defaultUsers: UserRecord[] = [
          { username: 'admin', password: '1234', email: 'admin@example.com' },
        ];
        this.storage.set(USERS_KEY, defaultUsers);
        console.info('Seeded default user: admin / 1234');
      }

      const active = this.storage.get<string | null>(ACTIVE_USER_KEY, null);
      this._user$.next(active);
    } catch (error) {
      console.error('AuthService initialization error:', error);
    }
  }

  cleanupGuestAccounts(forceClearGuests: boolean = false): void {
    try {
      const users = this.storage.get<UserRecord[]>(USERS_KEY, []);
      let updatedUsers = users.filter((u) => !u.username.startsWith('guest_')); // Keep non-guest users

      if (!forceClearGuests) {
        const guestUsers = users.filter((u) => u.username.startsWith('guest_'));
        // Keep only the most recent 20 guest accounts
        const maxGuests = 20;
        const sortedGuests = guestUsers.sort((a, b) => 
          b.username.localeCompare(a.username)
        ).slice(0, maxGuests);
        updatedUsers = [...updatedUsers, ...sortedGuests];
      }

      this.storage.set(USERS_KEY, updatedUsers);

      // Clean up associated tasks and columns
      const allKeys = Object.keys(localStorage);
      const guestKeys = allKeys.filter((key) => 
        key.startsWith('kanban_tasks_guest_') || key.startsWith('kanban_columns_guest_')
      );
      for (const key of guestKeys) {
        const username = key.split('_').slice(2).join('_');
        if (!updatedUsers.some((u) => u.username === username)) {
          this.storage.remove(key);
        }
      }
    } catch (error) {
      console.error('Cleanup guest accounts error:', error);
      throw error;
    }
  }

  signup(username: string, password: string, email: string): { ok: boolean; message?: string } {
    username = (username || '').trim();
    password = (password || '').trim();
    email = (email || '').trim();

    if (!username) {
      return { ok: false, message: 'Username is required.' };
    }
    if (!password) {
      return { ok: false, message: 'Password is required.' };
    }
    if (!email) {
      return { ok: false, message: 'Email is required.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: 'Invalid email format.' };
    }

    const users = this.storage.get<UserRecord[]>(USERS_KEY, []);
    const exists = users.some(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() ||
        u.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      return { ok: false, message: 'Username or email already exists.' };
    }

    users.push({ username, password, email });
    try {
      this.storage.set(USERS_KEY, users);
      this.storage.set(ACTIVE_USER_KEY, username);
      this._user$.next(username);
      return { ok: true };
    } catch (error) {
      console.error('Signup storage error:', error);
      return { ok: false, message: 'Failed to save user data. Storage may be full—please clear browser data (Settings > Privacy > Clear browsing data).' };
    }
  }

  login(identifier: string, password: string): boolean {
    identifier = (identifier || '').trim();
    password = (password || '').trim();
    if (!identifier || !password) return false;

    try {
      this.cleanupGuestAccounts(); // Clean up before login to ensure space
      const users = this.storage.get<UserRecord[]>(USERS_KEY, []);
      const found = users.find(
        (u) =>
          (u.username.toLowerCase() === identifier.toLowerCase() ||
           u.email.toLowerCase() === identifier.toLowerCase()) &&
          u.password === password
      );
      if (!found) return false;

      this.storage.set(ACTIVE_USER_KEY, found.username);
      this._user$.next(found.username);
      return true;
    } catch (error) {
      console.error('Login storage error:', error);
      throw error;
    }
  }

  logout() {
    try {
      this.storage.remove(ACTIVE_USER_KEY);
      this._user$.next(null);
    } catch (error) {
      console.error('Logout storage error:', error);
    }
  }

  get activeUsername(): string | null {
    return this._user$.value;
  }

  get isLoggedIn(): boolean {
    return !!this._user$.value;
  }

  getStorageUsage(): number {
    return this.storage.getStorageUsage();
  }

  listUsers(): { username: string; email: string }[] {
    try {
      return this.storage
        .get<UserRecord[]>(USERS_KEY, [])
        .map((u) => ({ username: u.username, email: u.email }));
    } catch (error) {
      console.error('List users error:', error);
      return [];
    }
  }
}