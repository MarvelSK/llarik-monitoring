
export type IntegrationType = 'email' | 'webhook' | 'slack' | 'discord';

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
