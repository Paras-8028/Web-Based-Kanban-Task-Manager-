import { Injectable } from '@angular/core';
import * as LZString from 'lz-string';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const decompressed = LZString.decompressFromUTF16(raw);
      return decompressed ? (JSON.parse(decompressed) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    const json = JSON.stringify(value);
    const compressed = LZString.compressToUTF16(json);
    localStorage.setItem(key, compressed);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  getStorageUsage(): number {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += ((localStorage[key].length + key.length) * 2);
      }
    }
    return total / 1024 / 1024; // Return size in MB
  }
}