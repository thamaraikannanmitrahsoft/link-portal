import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserFollowing } from './user-following';

describe('UserFollowing', () => {
  let component: UserFollowing;
  let fixture: ComponentFixture<UserFollowing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFollowing],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFollowing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
