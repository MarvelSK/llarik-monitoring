
export type CheckStatus = 'up' | 'down' | 'grace' | 'new';
export type CheckEnvironment = 'prod' | 'sandbox' | 'worker' | string;

export interface CheckPing {
  id: string;
  timestamp: Date;
  status: 'success' | 'failure' | 'start' | 'timeout';
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
}
