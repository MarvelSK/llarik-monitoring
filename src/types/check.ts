
export type CheckStatus = 'up' | 'down' | 'grace' | 'new';
export type CheckEnvironment = 'produkcia' | 'test' | 'manuál' | 'prod' | 'sandbox' | 'worker';

export interface CheckPing {
  id: string;
  timestamp: Date;
  status: 'success' | 'failure' | 'start' | 'timeout';
}

export interface HttpConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  successCodes: number[];
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
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
  httpConfig?: HttpConfig;
}
