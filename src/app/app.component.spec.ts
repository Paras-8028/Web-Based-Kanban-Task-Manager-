import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { TaskService } from './services/task.service';
import { Task, Column } from './models/task.model';

describe('AppComponent (minimal)', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  const mockTaskService = jasmine.createSpyObj<TaskService>(
    'TaskService',
    ['create', 'update', 'remove', 'reorderWithinStatus', 'addColumn', 'removeColumn'],
    { tasks$: of([] as Task[]), columns$: of([] as Column[]) }
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TaskService, useValue: mockTaskService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });
});
