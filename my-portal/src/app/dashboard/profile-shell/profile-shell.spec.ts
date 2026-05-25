import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ProfileShell } from "./profile-shell";

describe("ProfileShell", () => {
  let component: ProfileShell;
  let fixture: ComponentFixture<ProfileShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileShell],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileShell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
