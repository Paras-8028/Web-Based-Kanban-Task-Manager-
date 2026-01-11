import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { debounce } from '../utils/debounce';
import { Task, TaskId, TaskStatus, Column } from '../models/task.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocalStorageService } from './local-storage.service';
import { AuthService } from './auth.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

const STORAGE_KEY_TASKS_ROOT = 'kanban_tasks';
const STORAGE_KEY_COLUMNS_ROOT = 'kanban_columns';

@Injectable({ providedIn: 'root' })
export class TaskService implements OnDestroy {
  private readonly _tasks$ = new BehaviorSubject<Task[]>([]);
  readonly tasks$ = this._tasks$.asObservable();

  private readonly _columns$ = new BehaviorSubject<Column[]>([]);
  readonly columns$ = this._columns$.asObservable();

  private readonly _search$ = new BehaviorSubject<string>('');
  readonly search$ = this._search$.asObservable();

  private lastSnackRef: any;
  private authSub: Subscription | null = null;
  private currentUser: string | null = null;

  constructor(
    private snack: MatSnackBar,
    private storage: LocalStorageService,
    private auth: AuthService
  ) {
    this.authSub = this.auth.user$.subscribe((username) => {
      this.currentUser = username;
      try {
        this._tasks$.next(this._loadTasksForUser());
        this._columns$.next(this._loadColumnsForUser());
      } catch (error) {
        console.error('TaskService load error:', error);
        this.notify('Failed to load tasks/columns due to storage issue.', 'error-snack');
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  private tasksKey(): string {
    return this.currentUser
      ? `${STORAGE_KEY_TASKS_ROOT}_${this.currentUser}`
      : `${STORAGE_KEY_TASKS_ROOT}_anon`;
  }

  private colsKey(): string {
    return this.currentUser
      ? `${STORAGE_KEY_COLUMNS_ROOT}_${this.currentUser}`
      : `${STORAGE_KEY_COLUMNS_ROOT}_anon`;
  }

  private _loadTasksForUser(): Task[] {
    return this.storage.get<Task[]>(this.tasksKey(), []);
  }

  private _loadColumnsForUser(): Column[] {
    const defaults: Column[] = [
      { id: 'todo', title: 'To-Do' },
      { id: 'in-progress', title: 'In Progress' },
      { id: 'done', title: 'Done' },
    ];
    let cols = this.storage.get<Column[]>(this.colsKey(), []);
    for (const def of defaults) {
      if (!cols.some((c) => c.id === def.id)) cols.push(def);
    }
    const order = ['todo', 'in-progress', 'done'];
    cols = cols.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return cols;
  }

  private _persistTasks = debounce((tasks: Task[]) => {
    try {
      if (this.storage.getStorageUsage() > 4.5) {
        this.notify('Storage is nearly full. Consider deleting old tasks.', 'warning-snack');
      }
      this.storage.set(this.tasksKey(), tasks);
    } catch (error) {
      console.error('Persist tasks error:', error);
      this.notify('Failed to save tasks due to storage issue.', 'error-snack');
    }
  }, 200);

  private _persistColumns = debounce((cols: Column[]) => {
    try {
      if (this.storage.getStorageUsage() > 4.5) {
        this.notify('Storage is nearly full. Consider deleting old columns.', 'warning-snack');
      }
      this.storage.set(this.colsKey(), cols);
    } catch (error) {
      console.error('Persist columns error:', error);
      this.notify('Failed to save columns due to storage issue.', 'error-snack');
    }
  }, 200);

  private notify(msg: string, panelClass: string) {
    if (this.lastSnackRef) this.lastSnackRef.dismiss();
    this.lastSnackRef = this.snack.open(msg, '', {
      duration: 1500,
      panelClass: [panelClass],
    });
  }

  create(partial: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const now = Date.now();
      const task: Task = {
        id: (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2),
        createdAt: now,
        updatedAt: now,
        ...partial,
        order: 0,
      };

      const all = [...this._tasks$.value, task];
      this._tasks$.next(all);
      this._persistTasks(all);

      const same = all.filter((t) => t.status === task.status);
      const reordered = [task, ...same.filter((t) => t.id !== task.id)];
      this.reorderWithinStatus(task.status, reordered, false);

      this.notify('Task created!', 'success-snack');
    } catch (error) {
      console.error('Create task error:', error);
      this.notify('Failed to create task due to storage issue.', 'error-snack');
    }
  }

  update(id: TaskId, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    try {
      const now = Date.now();
      const tasks = this._tasks$.value.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t
      );
      this._tasks$.next(tasks);
      this._persistTasks(tasks);
      this.notify('Task updated!', 'info-snack');
    } catch (error) {
      console.error('Update task error:', error);
      this.notify('Failed to update task due to storage issue.', 'error-snack');
    }
  }

  remove(id: TaskId) {
    try {
      const tasks = this._tasks$.value.filter((t) => t.id !== id);
      this._tasks$.next(tasks);
      this._persistTasks(tasks);
      this.notify('Task deleted!', 'warning-snack');
    } catch (error) {
      console.error('Remove task error:', error);
      this.notify('Failed to delete task due to storage issue.', 'error-snack');
    }
  }

  reorderWithinStatus(status: TaskStatus, newOrder: Task[], announce = true) {
    try {
      const updated = newOrder.map((t, idx) => ({ ...t, order: idx, status }));
      const others = this._tasks$.value.filter((t) => t.status !== status);
      const merged = [...others, ...updated];
      this._tasks$.next(merged);
      this._persistTasks(merged);
      if (announce) this.notify('Task moved!', 'info-snack');
    } catch (error) {
      console.error('Reorder tasks error:', error);
      this.notify('Failed to reorder tasks due to storage issue.', 'error-snack');
    }
  }

  handleDragDrop(event: CdkDragDrop<Task[]>) {
    try {
      const movedTask = event.item.data as Task;
      const previousStatus = movedTask.status;
      const newStatus = event.container.data[0]?.status || previousStatus;
      const tasks = this._tasks$.value;

      // Update status if moved to a different column
      if (previousStatus !== newStatus) {
        this.update(movedTask.id, { status: newStatus });
      }

      // Reorder tasks in the target column
      const targetTasks = tasks
        .filter((t) => t.status === newStatus)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const reordered = [...targetTasks];
      const movedTaskIndex = targetTasks.findIndex((t) => t.id === movedTask.id);
      if (movedTaskIndex !== -1) {
        reordered.splice(movedTaskIndex, 1);
      }
      reordered.splice(event.currentIndex, 0, movedTask);

      this.reorderWithinStatus(newStatus, reordered);
    } catch (error) {
      console.error('Drag and drop error:', error);
      this.notify('Failed to move task due to storage issue.', 'error-snack');
    }
  }

  addColumn(title: string) {
    try {
      const newCol: Column = {
        id: (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2),
        title,
      };
      const cols = [...this._columns$.value, newCol];
      this._columns$.next(cols);
      this._persistColumns(cols);
      this.notify('Column added!', 'success-snack');
    } catch (error) {
      console.error('Add column error:', error);
      this.notify('Failed to add column due to storage issue.', 'error-snack');
    }
  }

  removeColumn(id: string) {
    if (['todo', 'in-progress', 'done'].includes(id)) {
      alert('Default columns cannot be deleted.');
      return;
    }
    if (!confirm('Delete this column and its tasks?')) return;

    try {
      const cols = this._columns$.value.filter((c) => c.id !== id);
      const tasks = this._tasks$.value.filter((t) => t.status !== id);
      this._columns$.next(cols);
      this._tasks$.next(tasks);
      this._persistColumns(cols);
      this._persistTasks(tasks);
      this.notify('Column deleted!', 'warning-snack');
    } catch (error) {
      console.error('Remove column error:', error);
      this.notify('Failed to delete column due to storage issue.', 'error-snack');
    }
  }

  reorderColumns(newOrder: Column[]) {
    try {
      this._columns$.next(newOrder);
      this._persistColumns(newOrder);
      this.notify('Columns reordered!', 'info-snack');
    } catch (error) {
      console.error('Reorder columns error:', error);
      this.notify('Failed to reorder columns due to storage issue.', 'error-snack');
    }
  }

  search(query: string) {
    this._search$.next((query || '').trim().toLowerCase());
  }

  tasksByStatus(status: TaskStatus): Task[] {
    const q = this._search$.value;
    return this._tasks$.value
      .filter((t) => t.status === status)
      .filter((t) => {
        if (!q) return true;
        const title = t.title?.toLowerCase() ?? '';
        const desc = t.description?.toLowerCase() ?? '';
        return title.includes(q) || desc.includes(q);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  get tasksValue(): Task[] {
    return this._tasks$.value;
  }
  get columnsValue(): Column[] {
    return this._columns$.value;
  }
  get currentUsername(): string | null {
    return this.currentUser;
  }
}