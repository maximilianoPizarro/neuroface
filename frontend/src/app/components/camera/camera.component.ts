import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="camera-wrapper">
      <video #videoEl autoplay playsinline muted></video>
      <canvas #overlayCanvas class="overlay-canvas"></canvas>
    </div>
    <div class="camera-controls">
      <button mat-raised-button class="rh-btn-primary" (click)="toggle()" [disabled]="starting">
        <mat-icon>{{ active ? 'videocam_off' : 'videocam' }}</mat-icon>
        {{ active ? 'Stop' : 'Start Camera' }}
      </button>
      <button mat-icon-button (click)="flipCamera()" [disabled]="!active || !cameraService.hasMultipleCameras"
              matTooltip="Switch camera (front/rear)">
        <mat-icon>flip_camera_ios</mat-icon>
      </button>
      <button mat-icon-button (click)="toggleTorch()" [disabled]="!active || !torchSupported"
              matTooltip="Toggle flashlight"
              [class.torch-active]="torchOn">
        <mat-icon>{{ torchOn ? 'flashlight_off' : 'flashlight_on' }}</mat-icon>
      </button>
      <button mat-raised-button (click)="capture()" [disabled]="!active">
        <mat-icon>photo_camera</mat-icon>
        Capture
      </button>
    </div>
    <p class="camera-mode" *ngIf="active">
      {{ cameraService.facingMode === 'user' ? 'Front camera' : 'Rear camera' }}
      <span *ngIf="torchOn" class="torch-indicator">&#x26A1; Flash ON</span>
    </p>
    <p class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</p>
  `,
  styles: [`
    .camera-wrapper {
      position: relative;
      display: inline-block;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      width: 100%;
    }
    video {
      display: block;
      width: 100%;
      max-width: 640px;
    }
    .overlay-canvas {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }
    .camera-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }
    .rh-btn-primary {
      background-color: var(--rh-red, #EE0000) !important;
      color: white !important;
    }
    .camera-mode {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .torch-indicator {
      color: var(--rh-orange, #F4C145);
      font-weight: 600;
      margin-left: 8px;
    }
    .torch-active {
      color: var(--rh-orange, #F4C145) !important;
    }
    .error-msg {
      color: #d32f2f;
      margin-top: 8px;
    }
  `],
})
export class CameraComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() frameCaptured = new EventEmitter<string>();

  active = false;
  starting = false;
  errorMsg = '';
  torchSupported = false;
  torchOn = false;

  constructor(public cameraService: CameraService) {}

  ngAfterViewInit(): void {
    this.cameraService.errors$.subscribe(err => (this.errorMsg = err));
  }

  ngOnDestroy(): void {
    if (this.active) {
      this.cameraService.stopCamera(this.videoRef.nativeElement);
    }
  }

  async toggle(): Promise<void> {
    if (this.active) {
      this.cameraService.stopCamera(this.videoRef.nativeElement);
      this.active = false;
      this.torchOn = false;
      this.torchSupported = false;
    } else {
      this.starting = true;
      this.errorMsg = '';
      try {
        await this.cameraService.startCamera(this.videoRef.nativeElement);
        this.active = true;
        this.syncCanvasSize();
        this.checkTorchSupport();
      } catch {
        this.active = false;
      } finally {
        this.starting = false;
      }
    }
  }

  async flipCamera(): Promise<void> {
    if (!this.active) return;
    this.starting = true;
    this.torchOn = false;
    try {
      await this.cameraService.switchCamera(this.videoRef.nativeElement);
      this.syncCanvasSize();
      this.checkTorchSupport();
    } catch {
      this.errorMsg = 'Failed to switch camera';
    } finally {
      this.starting = false;
    }
  }

  async toggleTorch(): Promise<void> {
    if (!this.active || !this.torchSupported) return;
    try {
      const track = this.cameraService.getVideoTrack();
      if (!track) return;
      this.torchOn = !this.torchOn;
      await track.applyConstraints({
        advanced: [{ torch: this.torchOn } as any],
      });
    } catch {
      this.errorMsg = 'Failed to toggle torch';
      this.torchOn = false;
    }
  }

  capture(): void {
    if (!this.active) return;
    const frame = this.cameraService.captureFrame(this.videoRef.nativeElement);
    this.frameCaptured.emit(frame);
  }

  get video(): HTMLVideoElement {
    return this.videoRef.nativeElement;
  }

  get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private checkTorchSupport(): void {
    const track = this.cameraService.getVideoTrack();
    if (!track) {
      this.torchSupported = false;
      return;
    }
    try {
      const capabilities = track.getCapabilities() as any;
      this.torchSupported = !!capabilities?.torch;
    } catch {
      this.torchSupported = false;
    }
  }

  private syncCanvasSize(): void {
    const video = this.videoRef.nativeElement;
    video.addEventListener('loadedmetadata', () => {
      this.canvasRef.nativeElement.width = video.videoWidth;
      this.canvasRef.nativeElement.height = video.videoHeight;
    }, { once: true });
  }
}
