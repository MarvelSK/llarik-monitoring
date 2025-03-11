
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}
