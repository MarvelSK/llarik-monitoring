
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  ownerId: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  permissions: 'read_only' | 'read_write';
  createdAt: Date;
  user?: {
    name: string;
    email: string;
  };
}

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
  isAdmin: boolean;
  companyId?: string;
}
