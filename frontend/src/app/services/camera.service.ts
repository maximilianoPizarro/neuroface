import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private stream: MediaStream | null = null;
  private errorSubject = new Subject<string>();

  errors$ = this.errorSubject.asObservable();

  async startCamera(video: HTMLVideoElement, facingMode = 'user'): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      video.srcObject = this.stream;
      await video.play();
    } catch (err) {
      this.errorSubject.next(`Camera access denied or unavailable: ${err}`);
      throw err;
    }
  }

  stopCamera(video: HTMLVideoElement): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    video.srcObject = null;
  }

  captureFrame(video: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  captureBlob(video: HTMLVideoElement): Observable<Blob> {
    return new Observable(subscriber => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
      canvas.toBlob(
        blob => {
          if (blob) {
            subscriber.next(blob);
            subscriber.complete();
          } else {
            subscriber.error('Failed to capture frame as blob');
          }
        },
        'image/jpeg',
        0.8
      );
    });
  }
}
