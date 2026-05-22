import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserFollower } from './user-follower';

describe('UserFollower', () => {
  let component: UserFollower;
  let fixture: ComponentFixture<UserFollower>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFollower],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFollower);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
