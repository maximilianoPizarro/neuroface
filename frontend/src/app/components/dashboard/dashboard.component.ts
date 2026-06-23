import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { ReadyResponse } from '../../models/interfaces';

interface DashboardCard {
  title: string;
  subtitle: string;
  link: string;
  label: string;
  primary?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h1 class="pf-v5-c-title pf-m-2xl">Dashboard</h1>

    <div class="status-section" *ngIf="ready; else loadingTpl">
      <span class="pf-v5-c-label" [class.pf-m-success]="ready.model_loaded" [class.pf-m-warning]="!ready.model_loaded">
        {{ ready.model_loaded ? 'Model trained' : 'Model not trained' }}
      </span>
      <span class="model-label">AI model: <strong>{{ ready.ai_model | uppercase }}</strong></span>
      <span *ngIf="ready.detection_method" class="pf-v5-c-label" [class.pf-m-blue]="ready.detection_method === 'openvino'" [class.pf-m-green]="ready.detection_method !== 'openvino'">
        {{ ready.detection_method === 'openvino' ? 'OpenVINO' : 'OpenCV' }}
      </span>
      <span *ngIf="ready.ovms_status" class="pf-v5-c-label" [class.pf-m-success]="ready.ovms_status === 'connected'" [class.pf-m-danger]="ready.ovms_status !== 'connected'">
        OVMS: {{ ready.ovms_status }}
      </span>
      <span *ngIf="ready.object_detection" class="pf-v5-c-label pf-m-orange">YOLO object detection ready</span>
      <span *ngIf="ready.ppe_enabled" class="pf-v5-c-label pf-m-blue">PPE safety enabled</span>
    </div>

    <ng-template #loadingTpl>
      <mat-spinner diameter="32"></mat-spinner>
    </ng-template>

    <div class="card-grid">
      @for (card of cards; track card.link) {
        <div class="pf-v5-c-card rh-card">
          <div class="pf-v5-c-card__header">
            <div class="pf-v5-c-card__header-main">
              <div class="pf-v5-c-card__title pf-m-lg">{{ card.title }}</div>
              <p class="card-subtitle">{{ card.subtitle }}</p>
            </div>
          </div>
          <div class="pf-v5-c-card__footer">
            <a
              mat-raised-button
              [class.rh-btn-primary]="card.primary"
              [routerLink]="card.link"
            >{{ card.label }}</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .status-section {
      display: flex;
      align-items: center;
      gap: var(--pf-v5-global--spacer--sm, 0.5rem);
      margin-bottom: var(--pf-v5-global--spacer--md, 1rem);
      flex-wrap: wrap;
    }
    .model-label {
      font-size: 0.875rem;
      color: var(--rh-gray-600);
    }
    .pf-v5-c-card__footer {
      padding: var(--pf-v5-global--spacer--md, 1rem);
      padding-top: 0;
    }
    .card-subtitle {
      font-size: 0.85rem;
      color: var(--rh-gray-600);
      margin: 0.25rem 0 0;
    }
    .rh-btn-primary {
      background-color: var(--rh-red) !important;
      color: white !important;
    }
  `],
})
export class DashboardComponent implements OnInit {
  ready: ReadyResponse | null = null;

  cards: DashboardCard[] = [
    { title: 'Live Recognition', subtitle: 'Detect and identify faces via webcam', link: '/recognition', label: 'Open Camera', primary: true },
    { title: 'Training', subtitle: 'Upload images and train the model', link: '/training', label: 'Manage Training', primary: true },
    { title: 'Labels', subtitle: 'View and manage known persons', link: '/labels', label: 'View Labels' },
    { title: 'Object Detection', subtitle: 'Detect 80 object classes via YOLOv4-tiny', link: '/objects', label: 'Detect Objects', primary: true },
    { title: 'PPE Safety', subtitle: 'Hardhat, vest, and goggles detection', link: '/ppe', label: 'PPE Detection', primary: true },
    { title: 'AI Chat', subtitle: 'MaaS-powered facial analysis assistant', link: '/chat', label: 'Open Chat', primary: true },
    { title: 'Model Configuration', subtitle: 'Switch AI models and view settings', link: '/model-config', label: 'Configure' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.ready().subscribe({
      next: (r) => (this.ready = r),
      error: () => (this.ready = { status: 'error', model_loaded: false, ai_model: 'unknown', chat_enabled: false }),
    });
  }
}
