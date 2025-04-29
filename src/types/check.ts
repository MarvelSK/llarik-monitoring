export type CheckStatus = 'up' | 'down' | 'grace' | 'new';
export type CheckEnvironment = 'produkcia' | 'test' | 'manuál' | 'prod' | 'sandbox' | 'worker';
export type CheckType = 'standard' | 'http_request';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpRequestConfig {
  url: string;
  method: HttpMethod;
  successCodes: number[];
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface CheckPing {
  id: string;
  timestamp: Date;
  status: 'success' | 'failure' | 'start' | 'timeout';
  responseCode?: number;
  method?: HttpMethod;
  requestUrl?: string;
  duration?: number;
}

export interface Check {
  id: string;
  name: string;
  description?: string;
  status: CheckStatus;
  tags?: string[];
  environments?: CheckEnvironment[];
  period: number; // in minutes
  grace: number; // in minutes
  lastPing?: Date;
  nextPingDue?: Date;
  pings: CheckPing[];
  cronExpression?: string;
  createdAt: Date;
  lastDuration?: number; // in seconds, for showing execution time
  projectId?: string;
  type: CheckType;
  httpConfig?: HttpRequestConfig;
}
