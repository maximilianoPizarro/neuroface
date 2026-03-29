import { Component, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatBadgeModule } from '@angular/material/badge';
import { CameraComponent } from '../camera/camera.component';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';
import { DetectedObject } from '../../models/interfaces';

const CLASS_COLORS: Record<string, string> = {
  person: '#EE0000', bicycle: '#FF6B35', car: '#0066CC', motorbike: '#9B59B6',
  bus: '#E67E22', truck: '#2ECC71', cat: '#F39C12', dog: '#E74C3C',
  bird: '#1ABC9C', horse: '#8E44AD', cow: '#27AE60', bottle: '#3498DB',
  chair: '#D35400', laptop: '#2980B9', cell_phone: '#C0392B', book: '#16A085',
  clock: '#F1C40F', default: '#F4C145',
};

@Component({
  selector: 'app-objects',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatChipsModule, MatSliderModule, MatBadgeModule, CameraComponent,
  ],
  template: `
    <h2>Object Detection</h2>
    <p class="subtitle">YOLOv4-tiny — 80 COCO classes pre-trained</p>

    <div class="detection-layout">
      <mat-card class="rh-card camera-card">
        <mat-card-content>
          <app-camera #cam (frameCaptured)="onFrame($event)"></app-camera>

          <div class="controls-row">
            <mat-slide-toggle [(ngModel)]="autoDetect" (change)="onAutoToggle()" color="warn">
              Auto-detect
            </mat-slide-toggle>
            <span class="obj-count" *ngIf="lastResults.length > 0">
              <strong>{{ lastResults.length }}</strong> object(s)
            </span>
            <span class="latency" *ngIf="latencyMs > 0">{{ latencyMs }}ms</span>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="rh-card summary-card" *ngIf="summary && objectKeys(summary).length > 0">
        <mat-card-header>
          <mat-card-title>Detected Objects</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="object-chips">
            <mat-chip *ngFor="let key of objectKeys(summary)"
                      [style.background-color]="getColor(key)"
                      style="color: white; font-size: 12px;">
              {{ key }}: {{ summary[key] }}
            </mat-chip>
          </div>
          <div class="object-list">
            <div class="object-item" *ngFor="let obj of lastResults; let i = index">
              <span class="obj-color" [style.background-color]="getColor(obj.class_name)"></span>
              <span class="obj-name">{{ obj.class_name }}</span>
              <span class="obj-conf">{{ (obj.confidence * 100).toFixed(1) }}%</span>
              <span class="obj-pos">{{ obj.w }}x{{ obj.h }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .subtitle { color: var(--rh-gray-600); font-size: 13px; margin-top: -8px; }
    .rh-card { border-top: 3px solid var(--rh-red, #EE0000); }
    .detection-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 900px) {
      .detection-layout { grid-template-columns: 1fr; }
    }
    .controls-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .obj-count { font-size: 14px; color: var(--rh-gray-600); }
    .latency { font-size: 12px; color: var(--rh-gray-400); font-family: monospace; }
    .object-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .object-list { max-height: 400px; overflow-y: auto; }
    .object-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--rh-gray-200, #D2D2D2);
      font-size: 13px;
    }
    .obj-color {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .obj-name { font-weight: 500; flex: 1; text-transform: capitalize; }
    .obj-conf { color: var(--rh-gray-400); font-family: monospace; }
    .obj-pos { color: var(--rh-gray-400); font-size: 11px; }
  `],
})
export class ObjectsComponent implements OnDestroy {
  @ViewChild('cam') cam!: CameraComponent;

  autoDetect = false;
  lastResults: DetectedObject[] = [];
  summary: Record<string, number> = {};
  latencyMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private cameraService: CameraService,
  ) {}

  ngOnDestroy(): void {
    this.stopAutoDetect();
  }

  objectKeys(obj: Record<string, number>): string[] {
    return Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
  }

  getColor(className: string): string {
    return CLASS_COLORS[className] || CLASS_COLORS['default'];
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
      if (this.cam?.active) {
        const frame = this.cameraService.captureFrame(this.cam.video);
        this.detect(frame);
      }
    }, 600);
  }

  private stopAutoDetect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private detect(base64: string): void {
    const start = performance.now();
    this.api.detectObjects(base64).subscribe({
      next: (res) => {
        this.latencyMs = Math.round(performance.now() - start);
        this.lastResults = res.objects;
        this.summary = res.summary;
        this.drawOverlay();
      },
    });
  }

  private drawOverlay(): void {
    if (!this.cam) return;
    const canvas = this.cam.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const obj of this.lastResults) {
      const color = this.getColor(obj.class_name);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

      const text = `${obj.class_name} ${(obj.confidence * 100).toFixed(0)}%`;
      ctx.font = "13px 'Red Hat Text', Roboto, sans-serif";
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = color;
      ctx.fillRect(obj.x, obj.y - 18, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, obj.x + 4, obj.y - 4);
    }
  }
}
