export type MockUserRole = "citizen" | "municipal_admin";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: MockUserRole;
}

interface MockUserCredentials extends MockUser {
  password: string;
}

export const mockUsers: MockUserCredentials[] = [
  {
    id: "citizen-1",
    name: "Ciudadano de prueba",
    email: "ciudadano",
    password: "1234",
    role: "citizen"
  },
  {
    id: "admin-1",
    name: "Gestion Municipal",
    email: "admin",
    password: "1234",
    role: "municipal_admin"
  }
];

export function sanitizeMockUser(user: MockUserCredentials): MockUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
