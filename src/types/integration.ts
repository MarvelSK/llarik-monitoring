
export type IntegrationType = 'email' | 'webhook';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: {
    url?: string;
    email?: string;
  };
  enabled: boolean;
  notifyOn: ('up' | 'down' | 'grace')[];
  createdAt: Date;
}
