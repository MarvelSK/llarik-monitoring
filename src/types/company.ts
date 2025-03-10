
export interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;  // camelCase for client-side use
  created_at: string | Date; // snake_case from database
}

export interface User {
  id: string;
  name: string;
  email: string;
  company_id?: string;
  is_admin: boolean;
}
