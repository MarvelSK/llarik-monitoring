
export type CheckStatus = 'up' | 'down' | 'grace' | 'new';

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
  period: number; // in minutes
  grace: number; // in minutes
  lastPing?: Date;
  nextPingDue?: Date;
  pings: CheckPing[];
  cronExpression?: string;
  createdAt: Date;
}
