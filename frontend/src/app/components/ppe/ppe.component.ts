import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CameraComponent } from '../camera/camera.component';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';
import { PpeDetection, PpeDetectResponse } from '../../models/interfaces';

const PPE_COLORS: Record<string, string> = {
  person: '#EE0000',
  hardhat: '#4CAF50',
  'safety-vest': '#FF9800',
  goggles: '#2196F3',
  helmet: '#4CAF50',
  vest: '#FF9800',
  default: '#9E9E9E',
};

@Component({
  selector: 'app-ppe',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatChipsModule, MatProgressSpinnerModule, CameraComponent,
  ],
  template: `
    <h2>PPE Safety Detection</h2>
    <p class="subtitle">YOLO v8 — Personal Protective Equipment Compliance</p>

    <div class="ppe-layout">
      <mat-card class="rh-card camera-card">
        <mat-card-content>
          <app-camera #cam (frameCaptured)="onFrame($event)"></app-camera>

          <div class="controls-row">
            <mat-slide-toggle [(ngModel)]="autoDetect" (change)="onAutoToggle()" color="warn">
              Auto-detect
            </mat-slide-toggle>
            <span class="latency" *ngIf="latencyMs > 0">{{ latencyMs }}ms</span>
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="status-panel">
        <mat-card class="rh-card status-card" [ngClass]="statusClass">
          <mat-card-header>
            <mat-card-title>
              <span class="status-icon">{{ statusIcon }}</span>
              {{ statusLabel }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="status-details">
              <div class="detail-row">
                <span class="detail-label">Persons</span>
                <span class="detail-value">{{ lastResult?.person_count ?? 0 }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Objects</span>
                <span class="detail-value">{{ lastResult?.count ?? 0 }}</span>
              </div>
            </div>

            <div class="ppe-checklist" *ngIf="lastResult">
              <h4>PPE Checklist</h4>
              <div *ngFor="let ppe of lastResult.expected_ppe" class="ppe-item"
                   [ngClass]="{'present': isPresent(ppe), 'missing': !isPresent(ppe)}">
                <mat-icon>{{ isPresent(ppe) ? 'check_circle' : 'cancel' }}</mat-icon>
                <span>{{ ppe }}</span>
              </div>
            </div>

            <div class="detected-chips" *ngIf="lastResult && objectKeys(lastResult.summary).length > 0">
              <h4>Detected Objects</h4>
              <mat-chip *ngFor="let key of objectKeys(lastResult.summary)"
                        [style.background-color]="getColor(key)"
                        style="color: white; font-size: 12px; margin: 2px;">
                {{ key }}: {{ lastResult.summary[key] }}
              </mat-chip>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="rh-card llm-card" *ngIf="lastResult?.llm_analysis">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>psychology</mat-icon>
              Granite LLM Analysis
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="llm-text">{{ lastResult.llm_analysis }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>

    <div class="not-enabled" *ngIf="!ppeEnabled">
      <mat-card class="rh-card">
        <mat-card-content>
          <mat-icon>info</mat-icon>
          <p>PPE detection is not enabled. Set <code>NEUROFACE_PPE_ENABLED=true</code> and
          <code>NEUROFACE_PPE_ENDPOINT</code> to the YOLO PPE serving URL.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .subtitle { color: var(--rh-gray-600); font-size: 13px; margin-top: -8px; }
    .rh-card { border-top: 3px solid var(--rh-red, #EE0000); }
    .ppe-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 900px) {
      .ppe-layout { grid-template-columns: 1fr; }
    }
    .controls-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
    }
    .latency { font-size: 12px; color: var(--rh-gray-400); font-family: monospace; }
    .status-panel { display: flex; flex-direction: column; gap: 16px; }
    .status-card.compliant { border-top-color: #4CAF50; }
    .status-card.violation { border-top-color: #F44336; }
    .status-card.no-persons { border-top-color: #9E9E9E; }
    .status-card.idle { border-top-color: #EE0000; }
    .status-icon { font-size: 20px; margin-right: 8px; }
    .status-details { display: flex; gap: 24px; margin: 12px 0; }
    .detail-row { display: flex; flex-direction: column; align-items: center; }
    .detail-label { font-size: 11px; color: var(--rh-gray-400); text-transform: uppercase; }
    .detail-value { font-size: 24px; font-weight: 700; }
    .ppe-checklist { margin-top: 16px; }
    .ppe-checklist h4, .detected-chips h4 {
      font-size: 12px; text-transform: uppercase;
      color: var(--rh-gray-400); margin-bottom: 8px;
    }
    .ppe-item {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0; font-size: 14px; text-transform: capitalize;
    }
    .ppe-item.present { color: #4CAF50; }
    .ppe-item.missing { color: #F44336; }
    .ppe-item mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .detected-chips { margin-top: 16px; }
    .llm-card { border-top-color: #2196F3; }
    .llm-card mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .llm-text { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
    .not-enabled { margin-top: 16px; }
    .not-enabled mat-card-content { display: flex; align-items: center; gap: 12px; }
    .not-enabled code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
  `],
})
export class PpeComponent implements OnInit, OnDestroy {
  @ViewChild('cam') cam!: CameraComponent;

  autoDetect = false;
  loading = false;
  latencyMs = 0;
  ppeEnabled = true;
  lastResult: PpeDetectResponse | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private cameraService: CameraService,
  ) {}

  ngOnInit(): void {
    this.api.ppeStatus().subscribe({
      next: (s) => { this.ppeEnabled = s.enabled; },
      error: () => { this.ppeEnabled = false; },
    });
  }

  ngOnDestroy(): void {
    this.stopAutoDetect();
  }

  get statusClass(): string {
    if (!this.lastResult) return 'idle';
    return this.lastResult.ppe_status.replace('_', '-');
  }

  get statusIcon(): string {
    if (!this.lastResult) return '\u2B24';
    const map: Record<string, string> = {
      compliant: '\u2705', violation: '\u26A0\uFE0F', no_persons: '\u2796',
    };
    return map[this.lastResult.ppe_status] || '\u2B24';
  }

  get statusLabel(): string {
    if (!this.lastResult) return 'Waiting for scan...';
    const map: Record<string, string> = {
      compliant: 'COMPLIANT', violation: 'VIOLATION', no_persons: 'No Persons',
    };
    return map[this.lastResult.ppe_status] || this.lastResult.ppe_status;
  }

  isPresent(ppe: string): boolean {
    return this.lastResult?.present_ppe?.includes(ppe) ?? false;
  }

  objectKeys(obj: Record<string, number>): string[] {
    return Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
  }

  getColor(className: string): string {
    return PPE_COLORS[className] || PPE_COLORS['default'];
  }

  onFrame(base64: string): void {
    this.detect(base64);
  }

  onAutoToggle(): void {
    if (this.autoDetect) {
      this.startAutoDetect();
    } else {
      this.stopAutoDetect();
    }
  }

  private startAutoDetect(): void {
    this.intervalId = setInterval(() => {
      if (this.cam?.active && !this.loading) {
        const frame = this.cameraService.captureFrame(this.cam.video);
        this.detect(frame);
      }
    }, 800);
  }

  private stopAutoDetect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private detect(base64: string): void {
    this.loading = true;
    const start = performance.now();
    this.api.ppeDetect(base64).subscribe({
      next: (res) => {
        this.latencyMs = Math.round(performance.now() - start);
        this.lastResult = res;
        this.loading = false;
        this.drawOverlay(res);
      },
      error: () => { this.loading = false; },
    });
  }

  private drawOverlay(res: PpeDetectResponse): void {
    if (!this.cam) return;
    const canvas = this.cam.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const obj of res.objects) {
      const color = this.getColor(obj.class_name);
      const x = obj.bbox.x1;
      const y = obj.bbox.y1;
      const w = obj.bbox.x2 - obj.bbox.x1;
      const h = obj.bbox.y2 - obj.bbox.y1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const text = `${obj.class_name} ${(obj.confidence * 100).toFixed(0)}%`;
      ctx.font = "13px 'Red Hat Text', Roboto, sans-serif";
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 18, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x + 4, y - 4);
    }
  }
}
