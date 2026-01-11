import { Component, EventEmitter, Input, Output, signal, AfterViewChecked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskPriority, TaskStatus, Column } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

declare const lucide: any;

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css'],
})
export class TaskFormComponent implements AfterViewChecked {
  @Input() initial: Partial<Task> | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() save = new EventEmitter<{ title: string; description?: string; priority: TaskPriority; status: TaskStatus }>();
  @Output() cancel = new EventEmitter<void>();

  title = signal('');
  description = signal('');
  priority = signal<TaskPriority>('medium');
  status = signal<TaskStatus>('todo');

  columns = signal<Column[]>([]);
  columnsList = computed(() => this.columns());

  constructor(private taskSvc: TaskService) {
    this.taskSvc.columns$.subscribe((c) => this.columns.set(c));
  }

  ngOnInit() {
    if (this.initial) {
      this.title.set(this.initial.title ?? '');
      this.description.set(this.initial.description ?? '');
      this.priority.set(this.initial.priority ?? 'medium');
      this.status.set(this.initial.status ?? 'todo');
    }
  }

  ngAfterViewChecked() {
    try {
      lucide?.createIcons?.();
    } catch {}
  }

  onSubmit() {
    if (!this.title().trim()) return;
    this.save.emit({
      title: this.title().trim(),
      description: this.description().trim() || undefined,
      priority: this.priority(),
      status: this.status(),
    });
  }
}
