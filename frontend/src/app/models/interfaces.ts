export interface FaceResult {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  detection_method?: string;
}

export interface RecognizeResponse {
  faces: FaceResult[];
  count: number;
  detection_method: string;
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
  chat_enabled: boolean;
  ovms_enabled?: boolean;
  ovms_status?: string;
  detection_method?: string;
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
  enabled?: boolean;
  model_name?: string;
  endpoint?: string;
}

export interface DetectionMethod {
  type: string;
  name: string;
  available: boolean;
  description: string;
  enabled?: boolean;
  model_name?: string;
  endpoint?: string;
}

export interface ModelConfigResponse {
  ai_model: string;
  detection_method: string;
  is_trained: boolean;
  model_info: ModelInfo;
  ovms_info?: Record<string, unknown> | null;
  chat_enabled: boolean;
}

export interface TrainResponse {
  status: string;
  labels: string[];
  total_faces: number;
  total_labels: number;
  detection_method?: string;
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

export interface ChatStatusResponse {
  enabled: boolean;
  model_endpoint: string | null;
  model_name: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  analysis?: AnalysisResult | null;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  analysis: AnalysisResult | null;
}

export interface AnalysisResult {
  faces: AnalyzedFace[];
  count: number;
}

export interface AnalyzedFace {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  features: FaceFeatures;
}

export interface FaceFeatures {
  eyes_detected?: number;
  glasses_detected?: boolean;
  smile_detected?: boolean;
  profile_face?: boolean;
  face_width?: number;
  face_height?: number;
  aspect_ratio?: number;
}
