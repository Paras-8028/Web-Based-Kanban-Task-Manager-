import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskCardComponent } from './task-card.component';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { of } from 'rxjs';

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;

  const mockTaskService = {
    columnsValue: [],
    update: jasmine.createSpy('update')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [{ provide: TaskService, useValue: mockTaskService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    component.task = {
      id: '1',
      title: 'Test Task',
      description: 'Task description',
      priority: 'medium',
      status: 'todo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Task;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit edit event', () => {
    spyOn(component.edit, 'emit');
    component.edit.emit();
    expect(component.edit.emit).toHaveBeenCalled();
  });

  it('should emit remove event', () => {
    spyOn(component.remove, 'emit');
    component.remove.emit();
    expect(component.remove.emit).toHaveBeenCalled();
  });
});