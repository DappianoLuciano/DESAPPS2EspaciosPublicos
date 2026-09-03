export interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAdminData {
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
}
