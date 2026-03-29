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
    <mat-toolbar class="app-toolbar">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <img src="assets/icons/icon.svg" alt="NeuroFace" class="toolbar-logo">
      <span class="app-title">NeuroFace</span>
      <span class="experimental-badge">Experimental</span>
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

        <div class="sidenav-footer">
          <div class="author-link">
            <mat-icon>person</mat-icon>
            <a href="https://maximilianopizarro.github.io/" target="_blank" rel="noopener">
              maximilianoPizarro
            </a>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <div class="container">
          <router-outlet />
        </div>

        <footer class="app-footer">
          <div class="footer-content">
            <div class="footer-powered">
              <span>Powered by</span>
              <img src="https://www.redhat.com/misc/favicon.ico" alt="Red Hat" class="footer-icon">
              <strong>OpenShift</strong>
              <span>&</span>
              <strong>OpenShift AI</strong>
            </div>
            <div class="footer-meta">
              <span class="experimental-badge">Experimental</span>
              <span class="footer-version">v1.1.1</span>
            </div>
          </div>
        </footer>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--rh-black);
      color: var(--rh-white);
      border-bottom: 3px solid var(--rh-red);
    }
    .toolbar-logo {
      height: 28px;
      width: 28px;
      margin-left: 8px;
      filter: brightness(0) invert(1);
    }
    .app-title {
      font-family: 'Red Hat Display', sans-serif;
      font-weight: 700;
      margin-left: 8px;
      font-size: 20px;
      letter-spacing: -0.3px;
    }
    .app-subtitle {
      font-size: 13px;
      opacity: 0.7;
      font-family: 'Red Hat Text', sans-serif;
    }
    .experimental-badge {
      margin-left: 12px;
    }
    .sidenav-container {
      height: calc(100vh - 67px);
    }
    .sidenav {
      width: 220px;
      background: var(--rh-white);
      border-right: 1px solid var(--rh-gray-200);
      display: flex;
      flex-direction: column;
    }
    mat-nav-list {
      flex: 1;
    }
    .active-link {
      background-color: rgba(238, 0, 0, 0.06) !important;
      border-left: 3px solid var(--rh-red);
    }
    .sidenav-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--rh-gray-200);
      font-size: 12px;
    }
    .author-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--rh-gray-600);
    }
    .author-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .author-link a {
      color: var(--rh-blue);
      text-decoration: none;
      font-weight: 500;
      font-size: 12px;
    }
    .author-link a:hover {
      text-decoration: underline;
    }
    .main-content {
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .container {
      flex: 1;
    }
    .app-footer {
      background: var(--rh-gray-900);
      color: var(--rh-gray-200);
      padding: 16px 24px;
      margin-top: auto;
    }
    .footer-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-powered {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .footer-powered strong {
      color: var(--rh-white);
    }
    .footer-icon {
      height: 16px;
      width: 16px;
    }
    .footer-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .footer-version {
      font-size: 12px;
      opacity: 0.6;
      font-family: monospace;
    }
  `],
})
export class AppComponent {}
