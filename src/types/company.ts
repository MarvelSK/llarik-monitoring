
export interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
  created_at?: string | Date; // Include both for compatibility
}

export interface User {
  id: string;
  name: string;
  email: string;
  company_id?: string;
  is_admin: boolean;
}
