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
  LabelImages,
  LabelsResponse,
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

  getAvailableModels(): Observable<{ models: AvailableModel[] }> {
    return this.http.get<{ models: AvailableModel[] }>(`${this.baseUrl}/models/available`);
  }
}
