export interface AudioState {
  file: File | null;
  base64: string | null;
  mimeType: string;
  duration?: number;
  name?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TranscriptionResult {
  text: string;
  timestamp: Date;
}