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
import { ApiService } from '../../services/api.service';
import { AvailableModel, ModelConfigResponse } from '../../models/interfaces';

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
  ],
  template: `
    <h2>AI Model Configuration</h2>

    <mat-spinner *ngIf="loading" diameter="32"></mat-spinner>

    <div class="card-grid" *ngIf="!loading">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Current Model</mat-card-title>
        </mat-card-header>
        <mat-card-content *ngIf="config">
          <p><strong>Type:</strong> {{ config.ai_model | uppercase }}</p>
          <p><strong>Trained:</strong> {{ config.is_trained ? 'Yes' : 'No' }}</p>
          <p *ngIf="config.model_info?.name"><strong>Name:</strong> {{ config.model_info.name }}</p>
          <p *ngIf="config.model_info?.backend"><strong>Backend:</strong> {{ config.model_info.backend }}</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Switch Model</mat-card-title>
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
  `],
})
export class ModelConfigComponent implements OnInit {
  config: ModelConfigResponse | null = null;
  availableModels: AvailableModel[] = [];
  selectedModel = '';
  loading = true;
  saving = false;

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
        this.api.getAvailableModels().subscribe({
          next: (res) => {
            this.availableModels = res.models;
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
}
