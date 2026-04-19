import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RecognizeResponse,
  HealthResponse,
  ReadyResponse,
  TrainResponse,
  ModelConfigResponse,
  AvailableModel,
  DetectionMethod,
  LabelImages,
  LabelsResponse,
  ChatStatusResponse,
  ChatResponse,
  ObjectDetectResponse,
  ObjectClassesResponse,
  PpeDetectResponse,
  PpeStatusResponse,
} from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  health(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }

  ready(): Observable<ReadyResponse> {
    return this.http.get<ReadyResponse>(`${this.baseUrl}/ready`);
  }

  recognize(imageBase64: string): Observable<RecognizeResponse> {
    return this.http.post<RecognizeResponse>(`${this.baseUrl}/recognize`, {
      image: imageBase64,
    });
  }

  uploadImage(label: string, file: File): Observable<{ status: string; label: string; filename: string }> {
    const formData = new FormData();
    formData.append('label', label);
    formData.append('file', file);
    return this.http.post<{ status: string; label: string; filename: string }>(
      `${this.baseUrl}/images`,
      formData
    );
  }

  getImages(label: string): Observable<LabelImages> {
    return this.http.get<LabelImages>(`${this.baseUrl}/images/${label}`);
  }

  deleteImages(label: string): Observable<{ status: string; deleted: number }> {
    return this.http.delete<{ status: string; deleted: number }>(`${this.baseUrl}/images/${label}`);
  }

  getLabels(): Observable<LabelsResponse> {
    return this.http.get<LabelsResponse>(`${this.baseUrl}/labels`);
  }

  train(): Observable<TrainResponse> {
    return this.http.post<TrainResponse>(`${this.baseUrl}/train`, {});
  }

  getModelConfig(): Observable<ModelConfigResponse> {
    return this.http.get<ModelConfigResponse>(`${this.baseUrl}/models/config`);
  }

  updateModelConfig(aiModel: string): Observable<ModelConfigResponse> {
    return this.http.put<ModelConfigResponse>(`${this.baseUrl}/models/config`, {
      ai_model: aiModel,
    });
  }

  getAvailableModels(): Observable<{ models: AvailableModel[]; detection_methods: DetectionMethod[] }> {
    return this.http.get<{ models: AvailableModel[]; detection_methods: DetectionMethod[] }>(
      `${this.baseUrl}/models/available`
    );
  }

  updateDetectionMethod(method: string): Observable<{ status: string; detection_method: string }> {
    return this.http.put<{ status: string; detection_method: string }>(
      `${this.baseUrl}/models/detection`,
      { detection_method: method }
    );
  }

  chatStatus(): Observable<ChatStatusResponse> {
    return this.http.get<ChatStatusResponse>(`${this.baseUrl}/chat/status`);
  }

  chat(message: string, image?: string): Observable<ChatResponse> {
    const body: { message: string; image?: string } = { message };
    if (image) {
      body.image = image;
    }
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, body);
  }

  detectObjects(imageBase64: string, confidence?: number): Observable<ObjectDetectResponse> {
    const body: { image: string; confidence?: number } = { image: imageBase64 };
    if (confidence !== undefined) body.confidence = confidence;
    return this.http.post<ObjectDetectResponse>(`${this.baseUrl}/objects/detect`, body);
  }

  getObjectClasses(): Observable<ObjectClassesResponse> {
    return this.http.get<ObjectClassesResponse>(`${this.baseUrl}/objects/classes`);
  }

  getObjectDetectorStatus(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/objects/status`);
  }

  ppeDetect(imageBase64: string, confidence?: number): Observable<PpeDetectResponse> {
    const body: { image: string; confidence?: number } = { image: imageBase64 };
    if (confidence !== undefined) body.confidence = confidence;
    return this.http.post<PpeDetectResponse>(`${this.baseUrl}/ppe/detect`, body);
  }

  ppeStatus(): Observable<PpeStatusResponse> {
    return this.http.get<PpeStatusResponse>(`${this.baseUrl}/ppe/status`);
  }
}
