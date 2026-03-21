import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="camera-wrapper">
      <video #videoEl autoplay playsinline muted></video>
      <canvas #overlayCanvas class="overlay-canvas"></canvas>
    </div>
    <div class="camera-controls">
      <button mat-raised-button color="primary" (click)="toggle()" [disabled]="starting">
        <mat-icon>{{ active ? 'videocam_off' : 'videocam' }}</mat-icon>
        {{ active ? 'Stop' : 'Start Camera' }}
      </button>
      <button mat-raised-button (click)="capture()" [disabled]="!active">
        <mat-icon>photo_camera</mat-icon>
        Capture
      </button>
    </div>
    <p class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</p>
  `,
  styles: [`
    .camera-wrapper {
      position: relative;
      display: inline-block;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }
    video {
      display: block;
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
      gap: 8px;
      margin-top: 12px;
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

  constructor(private cameraService: CameraService) {}

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
    } else {
      this.starting = true;
      this.errorMsg = '';
      try {
        await this.cameraService.startCamera(this.videoRef.nativeElement);
        this.active = true;
        this.syncCanvasSize();
      } catch {
        this.active = false;
      } finally {
        this.starting = false;
      }
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

  private syncCanvasSize(): void {
    const video = this.videoRef.nativeElement;
    video.addEventListener('loadedmetadata', () => {
      this.canvasRef.nativeElement.width = video.videoWidth;
      this.canvasRef.nativeElement.height = video.videoHeight;
    }, { once: true });
  }
}
