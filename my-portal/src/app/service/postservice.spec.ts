import { TestBed } from '@angular/core/testing';

import { PostService } from '../service/postservice'; 

describe('Postservice', () => {
  let service: PostService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PostService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
