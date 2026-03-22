import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="app-title">NeuroFace</span>
      <span class="spacer"></span>
      <span class="app-subtitle">Facial Recognition ML</span>
    </mat-toolbar>

    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/recognition" routerLinkActive="active-link">
            <mat-icon matListItemIcon>face</mat-icon>
            <span matListItemTitle>Recognition</span>
          </a>
          <a mat-list-item routerLink="/training" routerLinkActive="active-link">
            <mat-icon matListItemIcon>model_training</mat-icon>
            <span matListItemTitle>Training</span>
          </a>
          <a mat-list-item routerLink="/labels" routerLinkActive="active-link">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Labels</span>
          </a>
          <a mat-list-item routerLink="/model-config" routerLinkActive="active-link">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Model Config</span>
          </a>
          <a mat-list-item routerLink="/chat" routerLinkActive="active-link">
            <mat-icon matListItemIcon>smart_toy</mat-icon>
            <span matListItemTitle>AI Chat</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <div class="container">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .app-title {
      font-weight: 500;
      margin-left: 8px;
    }
    .app-subtitle {
      font-size: 14px;
      opacity: 0.8;
    }
    .sidenav-container {
      height: calc(100vh - 64px);
    }
    .sidenav {
      width: 220px;
    }
    .main-content {
      padding: 0;
    }
    .active-link {
      background-color: rgba(63, 81, 181, 0.08);
    }
  `],
})
export class AppComponent {}
