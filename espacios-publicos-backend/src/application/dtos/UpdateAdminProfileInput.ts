export interface UpdateAdminProfileInput {
  adminId: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
}
