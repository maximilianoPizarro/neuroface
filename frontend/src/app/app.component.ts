import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="pf-v5-c-page">
      <header class="pf-v5-c-masthead app-masthead" role="banner">
        <div class="pf-v5-c-masthead__main">
          <button class="pf-v5-c-masthead__toggle" type="button" aria-label="Toggle navigation" (click)="navOpen = !navOpen">
            <i class="fas fa-bars" aria-hidden="true"></i>
          </button>
          <a class="pf-v5-c-masthead__brand" routerLink="/dashboard">
            <img src="assets/icons/icon.svg" alt="" class="toolbar-logo" />
            <span class="pf-v5-c-masthead__brand-text">NeuroFace</span>
          </a>
        </div>
        <div class="pf-v5-c-masthead__content">
          <span class="app-subtitle">AI Computer Vision at the Edge</span>
        </div>
      </header>

      <div class="app-body" [class.nav-collapsed]="!navOpen">
        <div class="pf-v5-c-page__sidebar pf-m-hidden pf-m-visible-on-lg" [class.pf-m-expanded]="navOpen">
          <nav class="pf-v5-c-nav" aria-label="Global">
            <ul class="pf-v5-c-nav__list">
              @for (item of navItems; track item.path) {
                <li class="pf-v5-c-nav__item">
                  <a
                    class="pf-v5-c-nav__link"
                    [routerLink]="item.path"
                    routerLinkActive="pf-m-current"
                  >{{ item.label }}</a>
                </li>
              }
            </ul>
          </nav>
          <div class="sidenav-bottom">
            <a href="https://maximilianopizarro.github.io/neuroface/" target="_blank" rel="noopener" class="docs-link">
              Documentation
            </a>
          </div>
        </div>

        <main class="pf-v5-c-page__main" tabindex="-1">
          <div class="pf-v5-c-page__main-section">
            <div class="container">
              <router-outlet />
            </div>
          </div>
          <footer class="app-footer pf-v5-c-page__main-section pf-m-limit-width">
            <div class="footer-content">
              <div class="footer-powered">
                <span>Powered by</span>
                <strong>OpenShift</strong>
                <span>&amp;</span>
                <strong>OpenShift AI</strong>
              </div>
              <div class="footer-meta">
                <span class="pf-v5-c-label pf-m-red experimental-badge">Experimental</span>
                <a href="https://maximilianopizarro.github.io/" target="_blank" rel="noopener" class="footer-author">
                  maximilianoPizarro
                </a>
                <span class="footer-version">v1.5.0</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-masthead {
      background: var(--pf-v5-global--palette--black-1000, #151515);
      color: var(--pf-v5-global--Color--light-100);
      border-bottom: 3px solid var(--pf-v5-global--palette--red-100, #ee0000);
      display: flex;
      align-items: center;
      padding: 0 1rem;
      height: 56px;
    }
    .pf-v5-c-masthead__main { display: flex; align-items: center; gap: 0.5rem; }
    .pf-v5-c-masthead__brand { display: flex; align-items: center; text-decoration: none; color: inherit; }
    .pf-v5-c-masthead__brand-text { color: inherit; font-weight: 600; font-size: 1.1rem; }
    .toolbar-logo { height: 28px; width: 28px; margin-right: 8px; border-radius: 4px; }
    .pf-v5-c-masthead__toggle { background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer; margin-right: 0.5rem; }
    .pf-v5-c-masthead__content { margin-left: auto; }
    .app-subtitle { font-size: 0.875rem; opacity: 0.85; padding-right: 1rem; }
    .app-body {
      display: flex;
      height: calc(100vh - 56px);
    }
    .pf-v5-c-page__sidebar {
      background: var(--pf-v5-global--BackgroundColor--100);
      width: 220px;
      min-width: 220px;
      border-right: 1px solid var(--pf-v5-global--BorderColor--100);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .pf-v5-c-nav__list { list-style: none; margin: 0; padding: 0.5rem 0; }
    .pf-v5-c-nav__item { margin: 0; }
    .pf-v5-c-nav__link {
      display: block;
      padding: 0.6rem 1.25rem;
      text-decoration: none;
      color: var(--pf-v5-global--Color--100, #151515);
      font-size: 0.9rem;
      border-left: 3px solid transparent;
    }
    .pf-v5-c-nav__link:hover { background: var(--pf-v5-global--BackgroundColor--200, #f0f0f0); }
    .pf-v5-c-nav__link.pf-m-current {
      border-left-color: var(--pf-v5-global--palette--red-100, #ee0000);
      font-weight: 600;
      background: rgba(238, 0, 0, 0.06);
    }
    .sidenav-bottom { margin-top: auto; padding: 1rem; border-top: 1px solid var(--pf-v5-global--BorderColor--100); }
    .docs-link { color: var(--pf-v5-global--link--Color); text-decoration: none; font-size: 0.875rem; }
    .pf-v5-c-page__main {
      flex: 1;
      overflow-y: auto;
      background: var(--pf-v5-global--BackgroundColor--200, #f0f0f0);
    }
    .app-footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--pf-v5-global--BorderColor--100);
      color: var(--pf-v5-global--Color--200);
      font-size: 0.8125rem;
    }
    .footer-content { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; }
    .footer-powered { display: flex; align-items: center; gap: 0.35rem; }
    .footer-meta { display: flex; align-items: center; gap: 0.75rem; }
    .experimental-badge { font-size: 0.75rem; }
    @media (max-width: 992px) {
      .pf-v5-c-page__sidebar { display: none; }
      .pf-v5-c-page__sidebar.pf-m-expanded { display: flex; position: absolute; z-index: 200; height: calc(100vh - 56px); box-shadow: 2px 0 8px rgba(0,0,0,0.15); }
    }
  `],
})
export class AppComponent {
  navOpen = true;
  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/recognition', label: 'Recognition', icon: 'face' },
    { path: '/training', label: 'Training', icon: 'model_training' },
    { path: '/labels', label: 'Labels', icon: 'people' },
    { path: '/objects', label: 'Object Detection', icon: 'category' },
    { path: '/ppe', label: 'PPE Safety', icon: 'health_and_safety' },
    { path: '/model-config', label: 'Model Config', icon: 'settings' },
    { path: '/chat', label: 'AI Chat', icon: 'smart_toy' },
  ];
}
