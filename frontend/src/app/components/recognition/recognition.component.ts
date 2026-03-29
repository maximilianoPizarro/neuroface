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
            Faces: <strong>{{ lastResults.length }}</strong>
          </span>
          <span class="latency" *ngIf="latencyMs > 0">
            {{ latencyMs }}ms
          </span>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Multi-person face grid -->
    <div class="faces-grid" *ngIf="lastResults.length > 0">
      <mat-card *ngFor="let face of lastResults; let i = index"
                class="face-card" [class.known]="face.label !== 'unknown'">
        <div class="face-crop-container">
          <canvas [id]="'faceCrop' + i" class="face-crop"></canvas>
        </div>
        <mat-card-content class="face-info">
          <div class="face-identity">
            <mat-icon [class.icon-known]="face.label !== 'unknown'"
                      [class.icon-unknown]="face.label === 'unknown'">
              {{ face.label !== 'unknown' ? 'verified_user' : 'help_outline' }}
            </mat-icon>
            <span class="face-name">{{ face.label }}</span>
          </div>
          <div class="face-details">
            <span class="face-conf">{{ face.confidence | number:'1.1-1' }}%</span>
            <span class="face-size">{{ face.w }}x{{ face.h }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <p class="no-faces" *ngIf="lastResults.length === 0 && autoDetect">
      No faces detected. Position yourself in front of the camera.
    </p>
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
    .openvino-chip { background-color: #0066CC !important; color: white !important; font-size: 11px; }
    .opencv-chip { background-color: #3E8635 !important; color: white !important; font-size: 11px; }
    .faces-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .face-card {
      border-top: 3px solid var(--rh-gray-400, #8A8D90);
      text-align: center;
      overflow: hidden;
    }
    .face-card.known {
      border-top-color: var(--rh-green, #3E8635);
    }
    .face-crop-container {
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
    }
    .face-crop {
      max-width: 100%;
      max-height: 140px;
      image-rendering: auto;
    }
    .face-info {
      padding: 8px 12px !important;
    }
    .face-identity {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .icon-known { color: var(--rh-green, #3E8635) !important; font-size: 20px; }
    .icon-unknown { color: var(--rh-gray-400, #8A8D90) !important; font-size: 20px; }
    .face-name {
      font-weight: 600;
      font-size: 14px;
      text-transform: capitalize;
    }
    .face-details {
      display: flex;
      justify-content: center;
      gap: 12px;
      font-size: 11px;
      color: var(--rh-gray-400, #8A8D90);
    }
    .face-conf { font-family: monospace; }
    .face-size { font-family: monospace; }
    .no-faces {
      text-align: center;
      color: var(--rh-gray-400);
      margin-top: 24px;
      font-style: italic;
    }
  `],
})
export class RecognitionComponent implements OnDestroy {
  @ViewChild('cam') cam!: CameraComponent;

  autoDetect = false;
  lastResults: FaceResult[] = [];
  currentDetectionMethod = '';
  latencyMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastImage: HTMLImageElement | null = null;

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

    const img = new Image();
    img.onload = () => { this.lastImage = img; };
    img.src = base64;

    this.api.recognize(base64).subscribe({
      next: (res) => {
        this.latencyMs = Math.round(performance.now() - start);
        this.lastResults = res.faces;
        this.currentDetectionMethod = res.detection_method;
        this.drawOverlay();
        setTimeout(() => this.drawFaceCrops(), 50);
      },
    });
  }

  private drawFaceCrops(): void {
    if (!this.lastImage) return;

    for (let i = 0; i < this.lastResults.length; i++) {
      const face = this.lastResults[i];
      const canvas = document.getElementById(`faceCrop${i}`) as HTMLCanvasElement;
      if (!canvas) continue;

      const padding = 20;
      const sx = Math.max(0, face.x - padding);
      const sy = Math.max(0, face.y - padding);
      const sw = Math.min(face.w + padding * 2, this.lastImage.width - sx);
      const sh = Math.min(face.h + padding * 2, this.lastImage.height - sy);

      const scale = Math.min(160 / sw, 140 / sh, 1.5);
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.lastImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  private drawOverlay(): void {
    if (!this.cam) return;
    const canvas = this.cam.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isOpenVINO = this.currentDetectionMethod === 'openvino';

    for (let i = 0; i < this.lastResults.length; i++) {
      const face = this.lastResults[i];
      const known = face.label !== 'unknown';
      const color = known ? '#3E8635' : (isOpenVINO ? '#0066CC' : '#F4C145');

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(face.x, face.y, face.w, face.h);

      ctx.fillStyle = color;
      ctx.font = "13px 'Red Hat Text', Roboto, sans-serif";
      const label = `#${i + 1} ${face.label} (${face.confidence.toFixed(1)}%)`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(face.x, face.y - 18, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, face.x + 4, face.y - 4);
    }
  }
}
