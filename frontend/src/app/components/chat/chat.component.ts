import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';
import { ChatMessage, ChatStatusResponse } from '../../models/interfaces';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="chat-container">
      <mat-card class="status-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>smart_toy</mat-icon>
          <mat-card-title>AI Face Analysis Chat</mat-card-title>
          <mat-card-subtitle *ngIf="status">
            {{ status.enabled ? 'Connected to ' + (status.model_name || 'LLM') : 'Chat disabled' }}
          </mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <div *ngIf="!status?.enabled" class="disabled-notice">
        <mat-icon>info</mat-icon>
        <p>Chat is not enabled. Configure it via Helm values:</p>
        <code>chat.enabled=true, chat.modelEndpoint=&lt;url&gt;</code>
      </div>

      <div *ngIf="status?.enabled" class="chat-layout">
        <div class="camera-panel">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Camera</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <video #videoEl class="camera-video" [class.hidden]="!cameraActive"></video>
              <div *ngIf="!cameraActive" class="camera-placeholder">
                <mat-icon>videocam_off</mat-icon>
                <p>Camera off</p>
              </div>
              <canvas #snapshotCanvas class="hidden"></canvas>
              <div *ngIf="capturedFrame" class="snapshot-preview">
                <img [src]="capturedFrame" alt="Captured frame" />
                <button mat-icon-button color="warn" (click)="clearFrame()"
                        matTooltip="Remove attached image">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button (click)="toggleCamera()">
                <mat-icon>{{ cameraActive ? 'videocam_off' : 'videocam' }}</mat-icon>
                {{ cameraActive ? 'Stop' : 'Start' }} Camera
              </button>
              <button mat-raised-button color="accent"
                      [disabled]="!cameraActive" (click)="captureSnapshot()">
                <mat-icon>photo_camera</mat-icon>
                Capture
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

        <div class="messages-panel">
          <div class="messages-list" #messagesList>
            <div *ngIf="messages.length === 0" class="empty-chat">
              <mat-icon>chat_bubble_outline</mat-icon>
              <p>Start a conversation. Optionally capture a face image for analysis.</p>
              <div class="suggestions">
                <button mat-stroked-button (click)="sendSuggestion('What expressions do you detect?')">
                  What expressions do you detect?
                </button>
                <button mat-stroked-button (click)="sendSuggestion('Describe the facial features')">
                  Describe the facial features
                </button>
                <button mat-stroked-button (click)="sendSuggestion('Is the person wearing glasses?')">
                  Is the person wearing glasses?
                </button>
              </div>
            </div>

            <div *ngFor="let msg of messages"
                 class="message" [class.user]="msg.role === 'user'"
                 [class.assistant]="msg.role === 'assistant'">
              <div class="message-bubble">
                <div class="message-content">{{ msg.content }}</div>
                <div *ngIf="msg.analysis?.count" class="analysis-badge">
                  <mat-icon>face</mat-icon>
                  {{ msg.analysis?.count }} face(s) analyzed
                </div>
                <div class="message-time">
                  {{ msg.timestamp | date:'HH:mm' }}
                </div>
              </div>
            </div>

            <div *ngIf="loading" class="message assistant">
              <div class="message-bubble typing">
                <mat-spinner diameter="20"></mat-spinner>
                <span>Analyzing...</span>
              </div>
            </div>
          </div>

          <div class="input-bar">
            <div *ngIf="capturedFrame" class="attached-indicator">
              <mat-icon>image</mat-icon> Image attached
            </div>
            <mat-form-field class="message-input" appearance="outline">
              <input matInput
                     [(ngModel)]="userMessage"
                     (keyup.enter)="sendMessage()"
                     placeholder="Ask about facial features..."
                     [disabled]="loading" />
            </mat-form-field>
            <button mat-fab color="primary" (click)="sendMessage()"
                    [disabled]="loading || !userMessage.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      padding: 16px;
      height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
    }
    .status-card {
      margin-bottom: 16px;
      flex-shrink: 0;
    }
    .status-card mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #3f51b5;
    }
    .disabled-notice {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }
    .disabled-notice mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #999;
    }
    .disabled-notice code {
      display: block;
      margin-top: 8px;
      padding: 8px 16px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 13px;
    }
    .chat-layout {
      display: flex;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }
    .camera-panel {
      width: 320px;
      flex-shrink: 0;
    }
    .camera-video {
      width: 100%;
      border-radius: 4px;
      background: #000;
    }
    .camera-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      background: #f0f0f0;
      border-radius: 4px;
      color: #999;
    }
    .camera-placeholder mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .snapshot-preview {
      position: relative;
      margin-top: 8px;
    }
    .snapshot-preview img {
      width: 100%;
      border-radius: 4px;
      border: 2px solid #3f51b5;
    }
    .snapshot-preview button {
      position: absolute;
      top: 4px;
      right: 4px;
    }
    .hidden { display: none; }
    .messages-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .empty-chat {
      text-align: center;
      padding: 48px 24px;
      color: #888;
    }
    .empty-chat mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 16px;
    }
    .suggestions button {
      font-size: 12px;
    }
    .message {
      display: flex;
      margin-bottom: 12px;
    }
    .message.user { justify-content: flex-end; }
    .message.assistant { justify-content: flex-start; }
    .message-bubble {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .user .message-bubble {
      background: #3f51b5;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .assistant .message-bubble {
      background: #fff;
      color: #333;
      border: 1px solid #e0e0e0;
      border-bottom-left-radius: 4px;
    }
    .message-bubble.typing {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #888;
    }
    .analysis-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      margin-top: 6px;
      opacity: 0.7;
    }
    .analysis-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .message-time {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 4px;
      text-align: right;
    }
    .message-content {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .input-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-top: 1px solid #e0e0e0;
      background: #fff;
      border-radius: 0 0 8px 8px;
    }
    .attached-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #3f51b5;
      white-space: nowrap;
    }
    .attached-indicator mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .message-input { flex: 1; }
  `],
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('messagesList') messagesListRef!: ElementRef<HTMLDivElement>;

  status: ChatStatusResponse | null = null;
  messages: ChatMessage[] = [];
  userMessage = '';
  loading = false;
  cameraActive = false;
  capturedFrame: string | null = null;

  constructor(
    private api: ApiService,
    private camera: CameraService,
  ) {}

  ngOnInit(): void {
    this.api.chatStatus().subscribe({
      next: s => this.status = s,
      error: () => this.status = { enabled: false, model_endpoint: null, model_name: null },
    });
  }

  ngOnDestroy(): void {
    if (this.cameraActive && this.videoRef) {
      this.camera.stopCamera(this.videoRef.nativeElement);
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.cameraActive) {
      this.camera.stopCamera(this.videoRef.nativeElement);
      this.cameraActive = false;
    } else {
      try {
        await this.camera.startCamera(this.videoRef.nativeElement);
        this.cameraActive = true;
      } catch { /* handled by camera service */ }
    }
  }

  captureSnapshot(): void {
    if (!this.cameraActive) return;
    this.capturedFrame = this.camera.captureFrame(this.videoRef.nativeElement);
  }

  clearFrame(): void {
    this.capturedFrame = null;
  }

  sendSuggestion(text: string): void {
    this.userMessage = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.userMessage.trim();
    if (!text || this.loading) return;

    this.messages.push({
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    this.userMessage = '';
    this.loading = true;
    this.scrollToBottom();

    const image = this.capturedFrame || undefined;

    this.api.chat(text, image).subscribe({
      next: res => {
        this.messages.push({
          role: 'assistant',
          content: res.response,
          analysis: res.analysis,
          timestamp: new Date(),
        });
        this.capturedFrame = null;
        this.loading = false;
        this.scrollToBottom();
      },
      error: err => {
        const detail = err.error?.detail || 'Failed to get response';
        this.messages.push({
          role: 'assistant',
          content: `Error: ${detail}`,
          timestamp: new Date(),
        });
        this.loading = false;
        this.scrollToBottom();
      },
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesListRef) {
        const el = this.messagesListRef.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
