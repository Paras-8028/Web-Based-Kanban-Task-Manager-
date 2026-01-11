import {
  Component,
  EventEmitter,
  Output,
  Input,
  AfterViewChecked,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Task } from '../../models/task.model';
import { AuthService } from '../../services/auth.service';

declare const lucide: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements AfterViewChecked {
  @Input() allTasks: Task[] = [];
  @Output() search = new EventEmitter<string>();
  @Output() newTask = new EventEmitter<void>();
  @Output() addCol = new EventEmitter<void>();

  query = '';
  showDropdown = false;
  accountMenuOpen = false;

  constructor(public auth: AuthService, private router: Router, private el: ElementRef) {}

  get suggestions(): Task[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return [];
    return this.allTasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 6);
  }

  onInput() {
    this.search.emit(this.query);
    this.showDropdown = !!this.suggestions.length && !!this.query.trim();
  }

  selectSuggestion(t: Task) {
    this.query = t.title;
    this.search.emit(this.query);
    this.showDropdown = false;
  }

  toggleAccountMenu(event: Event) {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(evt: Event) {
    if (!this.el.nativeElement.contains(evt.target)) {
      this.accountMenuOpen = false;
      this.showDropdown = false;
    }
  }

  logout() {
    this.auth.logout();
    void this.router.navigate(['/login']);
    this.accountMenuOpen = false;
  }

  ngAfterViewChecked() {
    try {
      lucide?.createIcons?.();
    } catch {}
  }
}
