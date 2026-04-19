import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'recognition',
    loadComponent: () =>
      import('./components/recognition/recognition.component').then(m => m.RecognitionComponent),
  },
  {
    path: 'training',
    loadComponent: () =>
      import('./components/training/training.component').then(m => m.TrainingComponent),
  },
  {
    path: 'labels',
    loadComponent: () =>
      import('./components/labels/labels.component').then(m => m.LabelsComponent),
  },
  {
    path: 'model-config',
    loadComponent: () =>
      import('./components/model-config/model-config.component').then(m => m.ModelConfigComponent),
  },
  {
    path: 'objects',
    loadComponent: () =>
      import('./components/objects/objects.component').then(m => m.ObjectsComponent),
  },
  {
    path: 'ppe',
    loadComponent: () =>
      import('./components/ppe/ppe.component').then(m => m.PpeComponent),
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./components/chat/chat.component').then(m => m.ChatComponent),
  },
];
