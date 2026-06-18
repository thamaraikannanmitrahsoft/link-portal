import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/loginform/loginform').then(m => m.Loginform),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/registerform/registerform').then(m => m.Registerform),
  },
  {
    // IDP redirects here after SSO login
    path: 'auth/sso-callback',
    loadComponent: () =>
      import('./pages/sso-callback/sso-callback/sso-callback').then(m => m.SsoCallbackComponent),
  },
  // {
  //   path: 'dashboard',
  //   // canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./dashboard/dashboard/dashboard').then(m => m.Dashboard),
  // },

// {
//     path: 'dashboard',
//     loadComponent: () =>
//       import('./dashboard/dashboard/dashboard').then(m => m.Dashboard),
//     children: [
//       {
//         path: '',
//         loadComponent: () =>
//           import('./dashboard/my-link/my-link').then(m => m.MyLink),
//       },
//       {
//         path: 'followers',
//         loadComponent: () =>
//           import('./dashboard/user-follower/user-follower').then(m => m.UserFollower),
//       },
//       {
//         path: 'following',
//         loadComponent: () =>
//           import('./dashboard/user-following/user-following').then(m => m.UserFollowing),
//       },
//        {
//     path: 'alluser-posts',
//     canActivate: [authGuard],
//     loadComponent: () =>
//       import('./dashboard/all-userpost/all-userpost').then(m => m.AllUserpost),
//   },
//     ],
//   },
{
  path: 'dashboard',
  loadComponent: () =>
    import('./dashboard/dashboard/dashboard').then(m => m.Dashboard),
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./dashboard/profile-shell/profile-shell').then(m => m.ProfileShell),
      children: [
        {
          path: '',
          loadComponent: () =>
            import('./dashboard/my-link/my-link').then(m => m.MyLink),
        },
        {
          path: 'followers',
          loadComponent: () =>
            import('./dashboard/user-follower/user-follower').then(m => m.UserFollower),
        },
        {
          path: 'following',
          loadComponent: () =>
            import('./dashboard/user-following/user-following').then(m => m.UserFollowing),
        },
      ]
    },
    {
      path: 'alluser-posts',
      canActivate: [authGuard],
      loadComponent: () =>
        import('./dashboard/all-userpost/all-userpost').then(m => m.AllUserpost),
    },
  ],
},
  {
    path: 'create-post',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/post-create/post-create').then(m => m.PostCreateComponent),
  },
  // {
  //   path: 'alluser-posts',
  //   canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./dashboard/all-userpost/all-userpost').then(m => m.AllUserpost),
  // },
  // {
  //   path: '**',
  //   redirectTo: 'login',
  // },
  // {
  //   path: 'user-follower',
  //   loadComponent: () =>
  //     import('./dashboard/user-follower/user-follower').then(m => m.UserFollower),
  // },
  // {
  //   path: 'user-following',
  //   loadComponent: () =>
  //     import('./dashboard/user-following/user-following').then(m => m.UserFollowing),
  // }
];