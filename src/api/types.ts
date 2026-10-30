export type ConnectionConfig = { baseUrl: string; apiKey: string };

export type SystemStatus = { appName: string; version: string };

export interface SonarrApi {
  testConnection(): Promise<SystemStatus>;
}
