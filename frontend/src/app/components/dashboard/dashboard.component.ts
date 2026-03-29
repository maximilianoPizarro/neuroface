import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api.service';
import { ReadyResponse } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <h2>Dashboard</h2>

    <div class="status-section" *ngIf="ready; else loadingTpl">
      <span class="status-badge" [class.trained]="ready.model_loaded" [class.untrained]="!ready.model_loaded">
        <mat-icon>{{ ready.model_loaded ? 'check_circle' : 'warning' }}</mat-icon>
        {{ ready.model_loaded ? 'Model Trained' : 'Model Not Trained' }}
      </span>
      <span class="model-label">AI Model: <strong>{{ ready.ai_model | uppercase }}</strong></span>
      <mat-chip *ngIf="ready.detection_method" [class]="ready.detection_method === 'openvino' ? 'openvino-chip' : 'opencv-chip'">
        {{ ready.detection_method === 'openvino' ? 'OpenVINO' : 'OpenCV' }}
      </mat-chip>
      <mat-chip *ngIf="ready.ovms_status" [class]="ready.ovms_status === 'connected' ? 'ovms-connected' : 'ovms-error'">
        OVMS: {{ ready.ovms_status }}
      </mat-chip>
      <mat-chip *ngIf="ready.object_detection" class="objdet-chip">
        YOLO: ready
      </mat-chip>
    </div>

    <ng-template #loadingTpl>
      <mat-spinner diameter="32"></mat-spinner>
    </ng-template>

    <div class="card-grid">
      <mat-card class="rh-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="rh-icon">face</mat-icon>
          <mat-card-title>Live Recognition</mat-card-title>
          <mat-card-subtitle>Detect and identify faces via webcam</mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <a mat-raised-button class="rh-btn-primary" routerLink="/recognition">Open Camera</a>
        </mat-card-actions>
      </mat-card>

      <mat-card class="rh-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="rh-icon">model_training</mat-icon>
          <mat-card-title>Training</mat-card-title>
          <mat-card-subtitle>Upload images and train the model</mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <a mat-raised-button class="rh-btn-primary" routerLink="/training">Manage Training</a>
        </mat-card-actions>
      </mat-card>

      <mat-card class="rh-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="rh-icon">people</mat-icon>
          <mat-card-title>Labels</mat-card-title>
          <mat-card-subtitle>View and manage known persons</mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <a mat-raised-button routerLink="/labels">View Labels</a>
        </mat-card-actions>
      </mat-card>

      <mat-card class="rh-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="rh-icon">category</mat-icon>
          <mat-card-title>Object Detection</mat-card-title>
          <mat-card-subtitle>Detect 80 object classes via YOLOv4-tiny</mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <a mat-raised-button class="rh-btn-primary" routerLink="/objects">Detect Objects</a>
        </mat-card-actions>
      </mat-card>

      <mat-card class="rh-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="rh-icon">settings</mat-icon>
          <mat-card-title>Model Configuration</mat-card-title>
          <mat-card-subtitle>Switch AI models and view settings</mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <a mat-raised-button routerLink="/model-config">Configure</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .status-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .model-label {
      font-size: 14px;
      color: var(--rh-gray-600, #4D5258);
    }
    .rh-card {
      border-top: 3px solid var(--rh-red, #EE0000);
      cursor: default;
    }
    .rh-icon {
      color: var(--rh-red, #EE0000) !important;
    }
    .rh-btn-primary {
      background-color: var(--rh-red, #EE0000) !important;
      color: white !important;
    }
    mat-card-actions {
      padding: 8px 16px 16px;
    }
    .openvino-chip { background-color: #0066CC !important; color: white !important; font-size: 11px; }
    .opencv-chip { background-color: #3E8635 !important; color: white !important; font-size: 11px; }
    .ovms-connected { background-color: #3E8635 !important; color: white !important; font-size: 11px; }
    .ovms-error { background-color: var(--rh-red-dark, #A30000) !important; color: white !important; font-size: 11px; }
    .objdet-chip { background-color: #E67E22 !important; color: white !important; font-size: 11px; }
  `],
})
export class DashboardComponent implements OnInit {
  ready: ReadyResponse | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.ready().subscribe({
      next: (r) => (this.ready = r),
      error: () => (this.ready = { status: 'error', model_loaded: false, ai_model: 'unknown', chat_enabled: false }),
    });
  }
}
