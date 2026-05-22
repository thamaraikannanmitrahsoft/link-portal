import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyLink } from './my-link';

describe('MyLink', () => {
  let component: MyLink;
  let fixture: ComponentFixture<MyLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyLink],
    }).compileComponents();

    fixture = TestBed.createComponent(MyLink);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
