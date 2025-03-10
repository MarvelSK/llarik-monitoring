
export interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company_id?: string;
  is_admin: boolean;
}
