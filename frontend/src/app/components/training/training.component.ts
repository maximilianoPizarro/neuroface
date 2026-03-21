import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CameraComponent } from '../camera/camera.component';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    CameraComponent,
  ],
  template: `
    <h2>Training</h2>

    <div class="card-grid">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Capture from Camera</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <app-camera #cam (frameCaptured)="onCameraCapture($event)"></app-camera>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Person name (label)</mat-label>
            <input matInput [(ngModel)]="label" placeholder="e.g. john-doe">
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Upload Images</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Person name (label)</mat-label>
            <input matInput [(ngModel)]="uploadLabel" placeholder="e.g. john-doe">
          </mat-form-field>
          <input type="file" #fileInput accept="image/*" multiple (change)="onFilesSelected($event)" hidden>
          <button mat-raised-button (click)="fileInput.click()" [disabled]="!uploadLabel">
            <mat-icon>upload_file</mat-icon>
            Select Images
          </button>
          <p *ngIf="uploadCount > 0" class="upload-status">{{ uploadCount }} image(s) uploaded</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Train Model</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Train the recognition model using all uploaded images.</p>
          <mat-progress-bar *ngIf="training" mode="indeterminate"></mat-progress-bar>
          <button mat-raised-button color="primary" (click)="trainModel()" [disabled]="training">
            <mat-icon>model_training</mat-icon>
            {{ training ? 'Training...' : 'Start Training' }}
          </button>
          <div *ngIf="trainResult" class="train-result">
            <p>Labels: {{ trainResult.labels.join(', ') }}</p>
            <p>Total faces: {{ trainResult.total_faces }}</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; margin-top: 12px; }
    .upload-status { margin-top: 8px; color: #2e7d32; font-size: 13px; }
    .train-result { margin-top: 12px; font-size: 13px; color: #555; }
  `],
})
export class TrainingComponent {
  @ViewChild('cam') cam!: CameraComponent;

  label = '';
  uploadLabel = '';
  uploadCount = 0;
  training = false;
  trainResult: { labels: string[]; total_faces: number } | null = null;

  constructor(
    private api: ApiService,
    private cameraService: CameraService,
    private snackBar: MatSnackBar,
  ) {}

  onCameraCapture(base64: string): void {
    if (!this.label) {
      this.snackBar.open('Enter a person name first', 'OK', { duration: 3000 });
      return;
    }
    const blob = this.dataURLtoBlob(base64);
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.api.uploadImage(this.label, file).subscribe({
      next: () => {
        this.uploadCount++;
        this.snackBar.open(`Image saved for "${this.label}"`, 'OK', { duration: 2000 });
      },
      error: (err) => this.snackBar.open(`Error: ${err.message}`, 'OK', { duration: 3000 }),
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    for (let i = 0; i < input.files.length; i++) {
      this.api.uploadImage(this.uploadLabel, input.files[i]).subscribe({
        next: () => {
          this.uploadCount++;
          this.snackBar.open('Image uploaded', 'OK', { duration: 1500 });
        },
        error: (err) => this.snackBar.open(`Error: ${err.message}`, 'OK', { duration: 3000 }),
      });
    }
  }

  trainModel(): void {
    this.training = true;
    this.trainResult = null;
    this.api.train().subscribe({
      next: (res) => {
        this.training = false;
        this.trainResult = res;
        this.snackBar.open('Training complete!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.training = false;
        this.snackBar.open(`Training failed: ${err.error?.detail || err.message}`, 'OK', { duration: 5000 });
      },
    });
  }

  private dataURLtoBlob(dataURL: string): Blob {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }
}
