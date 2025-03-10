
export interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  isAdmin: boolean;
}
