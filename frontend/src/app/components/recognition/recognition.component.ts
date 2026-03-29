import { Component, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { CameraComponent } from '../camera/camera.component';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';
import { FaceResult } from '../../models/interfaces';

@Component({
  selector: 'app-recognition',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    FormsModule,
    CameraComponent,
  ],
  template: `
    <h2>Live Face Recognition</h2>

    <mat-card class="rh-card">
      <mat-card-content>
        <app-camera #cam (frameCaptured)="onFrame($event)"></app-camera>

        <div class="controls-row">
          <mat-slide-toggle [(ngModel)]="autoDetect" (change)="onAutoToggle()" color="warn">
            Auto-detect
          </mat-slide-toggle>
          <mat-chip *ngIf="currentDetectionMethod" [class]="detectionChipClass">
            {{ currentDetectionMethod === 'openvino' ? 'OpenVINO' : 'OpenCV' }}
          </mat-chip>
          <span class="face-count" *ngIf="lastResults.length > 0">
            Faces detected: <strong>{{ lastResults.length }}</strong>
          </span>
          <span class="latency" *ngIf="latencyMs > 0">
            {{ latencyMs }}ms
          </span>
        </div>

        <div class="results" *ngIf="lastResults.length > 0">
          <div class="face-item" *ngFor="let face of lastResults">
            <mat-icon [class.known]="face.label !== 'unknown'">
              {{ face.label !== 'unknown' ? 'verified_user' : 'help_outline' }}
            </mat-icon>
            <span class="face-label">{{ face.label }}</span>
            <span class="face-conf">{{ face.confidence | number:'1.1-1' }}%</span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .rh-card {
      border-top: 3px solid var(--rh-red, #EE0000);
    }
    .controls-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .face-count { font-size: 14px; color: var(--rh-gray-600, #4D5258); }
    .latency { font-size: 12px; color: var(--rh-gray-400, #8A8D90); font-family: monospace; }
    .results { margin-top: 16px; }
    .face-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--rh-gray-200, #D2D2D2);
    }
    .face-item mat-icon.known { color: var(--rh-green, #3E8635); }
    .face-label { font-weight: 500; flex: 1; }
    .face-conf { font-size: 13px; color: var(--rh-gray-400, #8A8D90); }
    .openvino-chip { background-color: #0066CC !important; color: white !important; font-size: 11px; }
    .opencv-chip { background-color: #3E8635 !important; color: white !important; font-size: 11px; }
  `],
})
export class RecognitionComponent implements OnDestroy {
  @ViewChild('cam') cam!: CameraComponent;

  autoDetect = false;
  lastResults: FaceResult[] = [];
  currentDetectionMethod = '';
  latencyMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiService,
    private cameraService: CameraService,
  ) {}

  ngOnDestroy(): void {
    this.stopAutoDetect();
  }

  get detectionChipClass(): string {
    return this.currentDetectionMethod === 'openvino' ? 'openvino-chip' : 'opencv-chip';
  }

  onFrame(base64: string): void {
    this.recognize(base64);
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
        this.recognize(frame);
        this.drawOverlay();
      }
    }, 500);
  }

  private stopAutoDetect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private recognize(base64: string): void {
    const start = performance.now();
    this.api.recognize(base64).subscribe({
      next: (res) => {
        this.latencyMs = Math.round(performance.now() - start);
        this.lastResults = res.faces;
        this.currentDetectionMethod = res.detection_method;
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

    const isOpenVINO = this.currentDetectionMethod === 'openvino';

    for (const face of this.lastResults) {
      const known = face.label !== 'unknown';
      ctx.strokeStyle = known ? '#3E8635' : (isOpenVINO ? '#0066CC' : '#F4C145');
      ctx.lineWidth = 2;
      ctx.strokeRect(face.x, face.y, face.w, face.h);

      ctx.fillStyle = known ? '#3E8635' : (isOpenVINO ? '#0066CC' : '#F4C145');
      ctx.font = "14px 'Red Hat Text', Roboto, sans-serif";
      const text = `${face.label} (${face.confidence.toFixed(1)}%)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(face.x, face.y - 20, textWidth + 8, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, face.x + 4, face.y - 5);
    }
  }
}
