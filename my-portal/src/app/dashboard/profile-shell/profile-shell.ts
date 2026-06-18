import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ActivatedRoute, Router, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-profile-shell",
  imports: [CommonModule,RouterOutlet],
  templateUrl: "./profile-shell.html",
  styleUrl: "./profile-shell.scss",
})
export class ProfileShell {
 constructor(private router: Router, private route: ActivatedRoute) {}

  navigate(path: string) {
    // '' means dashboard root = my-links
    this.router.navigate([path ? `../dashboard/${path}` : '/dashboard'], {
      relativeTo: this.route
    });
  }

  isActive(path: string): boolean {
    const url = this.router.url;
    if (path === '') return url === '/dashboard' || url.endsWith('/dashboard');
    return url.includes(path);
  }
}
