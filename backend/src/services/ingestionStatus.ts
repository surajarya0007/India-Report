export type IngestionJobStatus = 'idle' | 'processing' | 'complete' | 'error';

export interface IngestionStatus {
  status: IngestionJobStatus;
  message: string;
  startedAt?: string;
  completedAt?: string;
  ingestedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  error?: string;
}

let currentStatus: IngestionStatus = {
  status: 'idle',
  message: 'No ingestion in progress.',
};

export function getIngestionStatus(): IngestionStatus {
  return { ...currentStatus };
}

export function isIngestionRunning(): boolean {
  return currentStatus.status === 'processing';
}

export function markIngestionStarted(): void {
  currentStatus = {
    status: 'processing',
    message: 'Ingestion pipeline is running.',
    startedAt: new Date().toISOString(),
  };
}

export function markIngestionComplete(result: {
  ingestedCount: number;
  skippedCount: number;
  errorsCount: number;
}): void {
  currentStatus = {
    status: 'complete',
    message: 'Ingestion pipeline finished.',
    startedAt: currentStatus.startedAt,
    completedAt: new Date().toISOString(),
    ...result,
  };
}

export function markIngestionError(error: string): void {
  currentStatus = {
    status: 'error',
    message: 'Ingestion pipeline failed.',
    startedAt: currentStatus.startedAt,
    completedAt: new Date().toISOString(),
    error,
  };
}

export function resetIngestionStatus(): void {
  currentStatus = {
    status: 'idle',
    message: 'No ingestion in progress.',
  };
}
