import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllUserpost } from './all-userpost';

describe('AllUserpost', () => {
  let component: AllUserpost;
  let fixture: ComponentFixture<AllUserpost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllUserpost],
    }).compileComponents();

    fixture = TestBed.createComponent(AllUserpost);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
