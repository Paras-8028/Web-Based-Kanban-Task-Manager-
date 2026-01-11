export type TaskId = string;
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = string; // column.id

export interface Task {
  id: TaskId;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  order?: number;
}

export interface Column {
  id: string;
  title: string;
}
