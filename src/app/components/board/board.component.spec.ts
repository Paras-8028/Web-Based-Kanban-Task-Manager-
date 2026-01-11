// src/app/components/board/board.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardComponent } from './board.component';
import { TaskService } from '../../services/task.service';

// Mock TaskService to avoid real LocalStorage/MatSnackBar issues
class MockTaskService {
  tasksValue = [];
  columnsValue = [
    { id: 'todo', title: 'To-Do' },
    { id: 'done', title: 'Done' },
  ];
  search = jasmine.createSpy('search'); // ✅ Added for onSearch test
  tasksByStatus = jasmine.createSpy('tasksByStatus').and.returnValue([]); // ✅ Used in component
  addColumn = jasmine.createSpy('addColumn');
  removeColumn = jasmine.createSpy('removeColumn');
}

describe('BoardComponent', () => {
  let component: BoardComponent;
  let fixture: ComponentFixture<BoardComponent>;
  let service: MockTaskService;

  beforeEach(async () => {
    service = new MockTaskService();

    await TestBed.configureTestingModule({
      imports: [BoardComponent], // ✅ standalone import
      providers: [{ provide: TaskService, useValue: service }]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate search to TaskService', () => {
    component.onSearch('test');
    expect(service.search).toHaveBeenCalledWith('test');
  });

  it('should delegate addColumn to TaskService', () => {
    spyOn(window, 'prompt').and.returnValue('New Column');
    component.addColumn();
    expect(service.addColumn).toHaveBeenCalledWith('New Column');
  });

  it('should call startCreate', () => { // ✅ Simplified, no service method for this
    component.startCreate();
    expect(component.showForm).toBeTrue();
  });
});