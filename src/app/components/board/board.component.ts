import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar.component';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task, TaskPriority, TaskStatus, Column } from '../../models/task.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatIconModule,
    NavbarComponent,
    TaskCardComponent,
    TaskFormComponent,
  ],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css'],
})
export class BoardComponent {
  showForm = false;
  editing: Task | null = null;
  searchQuery = '';

  constructor(
    public readonly taskSvc: TaskService,
    private auth: AuthService,
    private router: Router
  ) {}

  // used to center search etc.
  onSearch(query: string) {
    this.searchQuery = query.toLowerCase();
  }

  matchesSearch(task: Task): boolean {
    if (!this.searchQuery) return false;
    return (
      task.title.toLowerCase().includes(this.searchQuery) ||
      (task.description?.toLowerCase().includes(this.searchQuery) ?? false)
    );
  }

  startCreate() {
    this.editing = null;
    this.showForm = true;
  }

  startEdit(task: Task) {
    this.editing = { ...task };
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editing = null;
  }

  saveForm(payload: {
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
  }) {
    if (this.editing) {
      this.taskSvc.update(this.editing.id, payload);
    } else {
      this.taskSvc.create(payload);
    }
    this.cancelForm();
  }

  confirmDelete(id: string) {
    if (confirm('Delete this task?')) {
      this.taskSvc.remove(id);
    }
  }

  addColumn() {
    const title = prompt('Enter column title:');
    if (title) this.taskSvc.addColumn(title);
  }

  deleteColumn(id: string) {
    this.taskSvc.removeColumn(id);
  }

  tasksByStatus(colId: string) {
    return this.taskSvc.tasksValue
      .filter((t) => t.status === colId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // --- Task drag & drop (between lists) ---
  drop(event: CdkDragDrop<Task[]>, status: TaskStatus) {
    const movedTask = event.item?.data as Task | undefined;
    if (!movedTask) {
      console.warn('Dropped item has no task data.');
      return;
    }

    // same-list reorder
    if (event.previousContainer === event.container) {
      const list = this.taskSvc.tasksValue
        .filter((t) => t.status === status)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      moveItemInArray(list, event.previousIndex, event.currentIndex);
      this.taskSvc.reorderWithinStatus(status, list);
      return;
    }

    // moved to a different column
    const sourceStatus = movedTask.status;

    // 1) update task status in central store
    this.taskSvc.update(movedTask.id, { status });

    // 2) build destination ordering (exclude moved task, then insert at index)
    const dest = this.taskSvc.tasksValue
      .filter((t) => t.status === status && t.id !== movedTask.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    dest.splice(event.currentIndex, 0, { ...movedTask, status });

    this.taskSvc.reorderWithinStatus(status, dest);

    // 3) ensure source column ordering updated (remove moved task)
    const sourceList = this.taskSvc.tasksValue
      .filter((t) => t.status === sourceStatus && t.id !== movedTask.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.taskSvc.reorderWithinStatus(sourceStatus as TaskStatus, sourceList);
  }

  // --- Column reordering (horizontal) ---
  dropColumn(event: CdkDragDrop<Column[]>) {
    moveItemInArray(
      this.taskSvc.columnsValue,
      event.previousIndex,
      event.currentIndex
    );
    // persist reordered columns
    this.taskSvc.reorderColumns([...this.taskSvc.columnsValue]);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // helper for connected task lists (used in template)
  get connectedListIds(): string[] {
    return this.taskSvc.columnsValue.map((c) => `list-${c.id}`);
  }
}
