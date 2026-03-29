import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import { AvailableModel, DetectionMethod, ModelConfigResponse } from '../../models/interfaces';

@Component({
  selector: 'app-model-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <h2>AI Model Configuration</h2>

    <mat-spinner *ngIf="loading" diameter="32"></mat-spinner>

    <div class="card-grid" *ngIf="!loading">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Current Configuration</mat-card-title>
        </mat-card-header>
        <mat-card-content *ngIf="config">
          <div class="config-section">
            <h4>Recognition Model</h4>
            <p><strong>Type:</strong> {{ config.ai_model | uppercase }}</p>
            <p><strong>Trained:</strong> {{ config.is_trained ? 'Yes' : 'No' }}</p>
            <p *ngIf="config.model_info?.name"><strong>Name:</strong> {{ config.model_info.name }}</p>
            <p *ngIf="config.model_info?.backend"><strong>Backend:</strong> {{ config.model_info.backend }}</p>
          </div>
          <mat-divider></mat-divider>
          <div class="config-section">
            <h4>Detection Method</h4>
            <p>
              <strong>Active:</strong>
              <mat-chip [class]="config.detection_method === 'openvino' ? 'openvino-chip' : 'opencv-chip'">
                {{ config.detection_method === 'openvino' ? 'OpenVINO (Remote)' : 'OpenCV (Local)' }}
              </mat-chip>
            </p>
            <div *ngIf="config.ovms_info" class="ovms-details">
              <p><strong>OVMS Status:</strong>
                <mat-chip [class]="config.ovms_info['available'] ? 'available-chip' : 'unavailable-chip'">
                  {{ config.ovms_info['available'] ? 'Connected' : 'Unreachable' }}
                </mat-chip>
              </p>
              <p><strong>Model:</strong> {{ config.ovms_info['model_name'] }}</p>
              <p><strong>Endpoint:</strong> {{ config.ovms_info['rest_url'] }}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Face Detection Method</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-radio-group [(ngModel)]="selectedDetection" class="model-radio-group">
            <mat-radio-button
              *ngFor="let method of detectionMethods"
              [value]="method.type"
              [disabled]="!method.available"
              class="model-radio"
            >
              <div class="model-option">
                <strong>{{ method.name }}</strong>
                <mat-chip *ngIf="!method.available" class="unavailable-chip">Not available</mat-chip>
                <p class="model-desc">{{ method.description }}</p>
              </div>
            </mat-radio-button>
          </mat-radio-group>
        </mat-card-content>
        <mat-card-actions>
          <button
            mat-raised-button
            color="accent"
            (click)="applyDetection()"
            [disabled]="!selectedDetection || selectedDetection === config?.detection_method || savingDetection"
          >
            <mat-icon>sensors</mat-icon>
            {{ savingDetection ? 'Switching...' : 'Switch Detection' }}
          </button>
        </mat-card-actions>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Recognition Model</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-radio-group [(ngModel)]="selectedModel" class="model-radio-group">
            <mat-radio-button
              *ngFor="let model of availableModels"
              [value]="model.type"
              [disabled]="!model.available"
              class="model-radio"
            >
              <div class="model-option">
                <strong>{{ model.name }}</strong>
                <mat-chip *ngIf="!model.available" class="unavailable-chip">Not installed</mat-chip>
                <p class="model-desc">{{ model.description }}</p>
              </div>
            </mat-radio-button>
          </mat-radio-group>
        </mat-card-content>
        <mat-card-actions>
          <button
            mat-raised-button
            color="primary"
            (click)="applyModel()"
            [disabled]="!selectedModel || selectedModel === config?.ai_model || saving"
          >
            <mat-icon>save</mat-icon>
            {{ saving ? 'Applying...' : 'Apply' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
    }
    .model-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 12px 0;
    }
    .model-radio { margin-bottom: 8px; }
    .model-option { display: flex; flex-direction: column; }
    .model-desc { font-size: 13px; color: #666; margin: 4px 0 0; }
    .unavailable-chip { font-size: 11px; }
    .config-section { padding: 8px 0; }
    .config-section h4 { margin: 4px 0 8px; color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ovms-details { margin-top: 8px; padding-left: 8px; border-left: 3px solid #1976d2; }
    .ovms-details p { margin: 4px 0; font-size: 13px; }
    .openvino-chip { background-color: #1976d2 !important; color: white !important; }
    .opencv-chip { background-color: #388e3c !important; color: white !important; }
    .available-chip { background-color: #2e7d32 !important; color: white !important; font-size: 11px; }
  `],
})
export class ModelConfigComponent implements OnInit {
  config: ModelConfigResponse | null = null;
  availableModels: AvailableModel[] = [];
  detectionMethods: DetectionMethod[] = [];
  selectedModel = '';
  selectedDetection = '';
  loading = true;
  saving = false;
  savingDetection = false;

  constructor(private api: ApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.api.getModelConfig().subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.selectedModel = cfg.ai_model;
        this.selectedDetection = cfg.detection_method;
        this.api.getAvailableModels().subscribe({
          next: (res) => {
            this.availableModels = res.models;
            this.detectionMethods = res.detection_methods;
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load model config', 'OK', { duration: 3000 });
      },
    });
  }

  applyModel(): void {
    this.saving = true;
    this.api.updateModelConfig(this.selectedModel).subscribe({
      next: (res) => {
        this.saving = false;
        this.config = res;
        this.snackBar.open(`Model switched to ${this.selectedModel.toUpperCase()}`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(`Error: ${err.error?.detail || err.message}`, 'OK', { duration: 3000 });
      },
    });
  }

  applyDetection(): void {
    this.savingDetection = true;
    this.api.updateDetectionMethod(this.selectedDetection).subscribe({
      next: () => {
        this.savingDetection = false;
        this.loadData();
        const label = this.selectedDetection === 'openvino' ? 'OpenVINO (Remote)' : 'OpenCV (Local)';
        this.snackBar.open(`Detection switched to ${label}`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.savingDetection = false;
        this.snackBar.open(`Error: ${err.error?.detail || err.message}`, 'OK', { duration: 5000 });
      },
    });
  }
}
