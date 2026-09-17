export type UserRole = "citizen" | "municipal_admin";

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}
