export interface FaceResult {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

export interface RecognizeResponse {
  faces: FaceResult[];
  count: number;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

export interface ReadyResponse {
  status: string;
  model_loaded: boolean;
  ai_model: string;
}

export interface TrainResponse {
  status: string;
  labels: string[];
  total_faces: number;
  total_labels: number;
}

export interface ModelInfo {
  name: string;
  type: string;
  backend: string;
  available?: boolean;
  params: Record<string, unknown>;
}

export interface AvailableModel {
  type: string;
  name: string;
  available: boolean;
  description: string;
}

export interface ModelConfigResponse {
  ai_model: string;
  is_trained: boolean;
  model_info: ModelInfo;
}

export interface LabelImages {
  label: string;
  images: string[];
  count: number;
}

export interface LabelsResponse {
  labels: string[];
  count: number;
}
