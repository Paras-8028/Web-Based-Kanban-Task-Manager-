import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragStart, CdkDropList } from '@angular/cdk/drag-drop';
import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

declare const lucide: any;

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.css'],
})
export class TaskCardComponent implements AfterViewInit {
  @Input() task!: Task;
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  menuOpenPriority = false;
  menuOpenStatus = false;
  menuAlignPriority: 'left' | 'right' = 'left';
  menuAlignStatus: 'left' | 'right' = 'right';

  constructor(public readonly taskSvc: TaskService, private el: ElementRef) {}

  ngAfterViewInit(): void {
    try {
      lucide?.createIcons?.();
    } catch (error) {
      console.error('Lucide icon initialization failed:', error);
    }
  }

  dragStarted(event: CdkDragStart) {
    this.menuOpenPriority = false;
    this.menuOpenStatus = false;
    // Optional: Add custom drag start logic, e.g., scaling
    const dragElement = event.source.element.nativeElement;
    dragElement.style.transition = 'none'; // Ensure immediate transform
  }

  dragReleased() {
    // Restore transitions after drag
    const dragElement = this.el.nativeElement.querySelector('.card');
    if (dragElement) {
      dragElement.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    }
  }

  togglePriorityMenu(evt: MouseEvent): void {
    evt.stopPropagation();
    this.menuOpenPriority = !this.menuOpenPriority;
    if (this.menuOpenPriority) {
      this.menuOpenStatus = false;
      setTimeout(() => this.adjustMenuAlign('priority'), 0);
    }
  }

  toggleStatusMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpenStatus = !this.menuOpenStatus;
    if (this.menuOpenStatus) {
      this.menuOpenPriority = false;
      setTimeout(() => this.adjustMenuAlign('status'), 0);
    }
  }

  private adjustMenuAlign(kind: 'priority' | 'status'): void {
    try {
      const root: HTMLElement = this.el.nativeElement;
      const dropdown = root.querySelector(
        kind === 'priority' ? '.dropdown.priority .menu' : '.dropdown.status .menu'
      ) as HTMLElement | null;
      const btn = root.querySelector(
        kind === 'priority' ? '.dropdown.priority .small-btn' : '.dropdown.status .small-btn'
      ) as HTMLElement | null;
      if (!dropdown || !btn) {
        console.warn(`Dropdown or button not found for ${kind} menu alignment`);
        return;
      }

      const btnRect = btn.getBoundingClientRect();
      const menuWidth = Math.min(260, Math.max(140, btnRect.width * 1.4));
      const proposedRight = btnRect.right + menuWidth;
      const availableRight = window.innerWidth - 8;
      if (proposedRight > availableRight) {
        if (kind === 'priority') this.menuAlignPriority = 'left';
        else this.menuAlignStatus = 'left';
      } else {
        if (kind === 'priority') this.menuAlignPriority = 'right';
        else this.menuAlignStatus = 'right';
      }
    } catch (error) {
      console.error(`Failed to adjust ${kind} menu alignment:`, error);
    }
  }

  changePriority(priority: TaskPriority, evt?: MouseEvent): void {
    evt?.stopPropagation();
    if (!this.task) return;
    this.taskSvc.update(this.task.id, { priority });
    this.menuOpenPriority = false;
  }

  changeStatus(status: TaskStatus, evt?: MouseEvent): void {
    evt?.stopPropagation();
    if (!this.task) return;
    this.taskSvc.update(this.task.id, { status });

    setTimeout(() => {
      const all = this.taskSvc.tasksValue;
      const dest = all
        .filter((t: Task) => t.status === status)
        .sort((a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0));
      const moved = dest.find((t: Task) => t.id === this.task.id);
      if (!moved) return;
      const reordered = [moved, ...dest.filter((t: Task) => t.id !== moved.id)];
      this.taskSvc.reorderWithinStatus(status, reordered);
    }, 0);

    this.menuOpenStatus = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.menuOpenPriority = false;
      this.menuOpenStatus = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpenPriority = false;
    this.menuOpenStatus = false;
  }

  getColumnTitle(status: string): string {
    const col = this.taskSvc.columnsValue.find((c) => c.id === status);
    return col ? col.title : this.capitalize(status);
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}