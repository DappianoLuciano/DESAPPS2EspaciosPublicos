import type { User, UserRole } from './api';

export interface CityPassTokenPayload {
  iss?: string;
  sub: string;
  aud?: string[];
  token_use?: string;
  ver?: number;
  preferred_username?: string;
  module?: string;
  groups?: string[];
  exp?: number;
  iat?: number;
  jti?: string;
}

export interface CityPassLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

const DEFAULT_IDP_URL = '/citypass-proxy';
const DEFAULT_CLIENT_ID = 'citypass-espacios-web';
const ADMIN_GROUPS = new Set(['admin', 'espacios-admin', 'administrador', 'municipal_admin', 'delegados', 'soporte-n2']);

function getIdpUrl(): string {
  const envUrl = import.meta.env.VITE_CITYPASS_IDP_URL?.trim();
  if (!envUrl) {
    return DEFAULT_IDP_URL;
  }
  return envUrl.replace(/\/+$/, '');
}

function getClientId(): string {
  return import.meta.env.VITE_CITYPASS_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;
}

export function decodeJwtPayload(token: string): CityPassTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload) as CityPassTokenPayload;
  } catch {
    return null;
  }
}

export function parseCityPassUser(accessToken: string): User | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || !payload.sub) {
    return null;
  }

  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const isAdmin = groups.some((group) => ADMIN_GROUPS.has(group.toLowerCase()));

  const username = payload.preferred_username || payload.sub;

  return {
    id: payload.sub,
    name: username,
    email: `${username.toLowerCase()}@citypass.local`,
    role: isAdmin ? ('municipal_admin' as UserRole) : ('citizen' as UserRole),
  };
}

export async function loginWithCityPass(username: string, password: string): Promise<User> {
  const idpUrl = getIdpUrl();
  const clientId = getClientId();

  let response: Response;

  try {
    response = await fetch(`${idpUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        client_id: clientId,
        clientId,
      }),
    });
  } catch {
    throw new Error('No se pudo establecer conexión con el proveedor de identidad CityPass+.');
  }

  if (!response.ok) {
    // Guía de integración §2: Cualquier fallo devuelve un error genérico (no revelar si usuario existe)
    throw new Error('Usuario o contraseña incorrectos.');
  }

  const data = (await response.json()) as CityPassLoginResponse;
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Respuesta inválida del proveedor de identidad.');
  }

  const payload = decodeJwtPayload(data.access_token);
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const isAdmin = groups.some((group) => ADMIN_GROUPS.has(group.toLowerCase()));

  if (!isAdmin) {
    // Guía de integración §3: "no tenés accesos asignados, hablá con tu delegado"
    throw new Error('No tenés accesos asignados, hablá con tu delegado.');
  }

  const user = parseCityPassUser(data.access_token);
  if (!user) {
    throw new Error('No se pudo leer la identidad del usuario desde el token.');
  }

  localStorage.setItem('citypass_access_token', data.access_token);
  localStorage.setItem('citypass_refresh_token', data.refresh_token);
  localStorage.setItem('auth_token', data.access_token);
  localStorage.setItem('auth_user', JSON.stringify(user));

  return user;
}

export async function refreshCityPassSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem('citypass_refresh_token');
  if (!refreshToken) {
    return null;
  }

  const idpUrl = getIdpUrl();

  try {
    const response = await fetch(`${idpUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearCityPassStorage();
      return null;
    }

    const data = (await response.json()) as CityPassLoginResponse;
    if (!data.access_token || !data.refresh_token) {
      clearCityPassStorage();
      return null;
    }

    const user = parseCityPassUser(data.access_token);
    if (!user) {
      clearCityPassStorage();
      return null;
    }

    localStorage.setItem('citypass_access_token', data.access_token);
    localStorage.setItem('citypass_refresh_token', data.refresh_token);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(user));

    return data.access_token;
  } catch {
    return null;
  }
}

export async function logoutCityPass(): Promise<void> {
  const refreshToken = localStorage.getItem('citypass_refresh_token');
  const idpUrl = getIdpUrl();

  if (refreshToken) {
    try {
      await fetch(`${idpUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignorar error de red al cerrar sesion
    }
  }

  clearCityPassStorage();
}

export function clearCityPassStorage(): void {
  localStorage.removeItem('citypass_access_token');
  localStorage.removeItem('citypass_refresh_token');
}
