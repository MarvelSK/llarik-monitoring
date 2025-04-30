
export interface CronJob {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  success_codes: number[];
  parameters?: Record<string, any>;
  body?: string;
  headers?: Record<string, string>;
  jwt_token?: string;
  schedule: string;
  last_run?: Date;
  next_run?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  enabled: boolean;
  last_status?: string;
  last_response?: string;
  last_duration?: number;
}

export interface CronJobExecution {
  id: string;
  job_id: string;
  status: 'running' | 'success' | 'failed' | 'error' | 'timeout';
  status_code?: number;
  started_at: Date;
  completed_at?: Date;
  duration?: number;
  response?: string;
  error?: string;
}

export interface EdgeFunctionLog {
  id: string;
  function_name: string;
  timestamp: Date;
  log_level: string;
  message: string;
}
