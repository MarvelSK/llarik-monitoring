
export type IntegrationType = 'email' | 'webhook' | 'slack' | 'discord';
export type NotifyOn = 'up' | 'down' | 'grace';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: {
    email?: string;
    url?: string;
  };
  enabled: boolean;
  notifyOn: NotifyOn[];
  createdAt: Date;
  companyId?: string;
}
