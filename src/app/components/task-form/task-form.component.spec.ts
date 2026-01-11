import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TaskFormComponent } from './task-form.component';
import { TaskService } from '../../services/task.service';
import { of } from 'rxjs';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  const mockTaskService = {
    columns$: of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, TaskFormComponent],
      providers: [{ provide: TaskService, useValue: mockTaskService }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});