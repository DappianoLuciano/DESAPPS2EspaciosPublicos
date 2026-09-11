function resolveApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (!configuredUrl) {
    if (import.meta.env.DEV) {
      return 'http://localhost:3000';
    }

    throw new Error('VITE_API_URL es obligatoria en compilaciones de producción.');
  }

  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error('VITE_API_URL debe ser una URL válida.');
  }

  if (import.meta.env.PROD && url.protocol !== 'https:') {
    throw new Error('VITE_API_URL debe utilizar HTTPS en producción.');
  }

  if (url.username || url.password) {
    throw new Error('VITE_API_URL no debe contener credenciales.');
  }

  if (url.search || url.hash || url.pathname !== '/') {
    throw new Error('VITE_API_URL debe contener solamente el origen del backend.');
  }

  return url.origin;
}

const API_URL = resolveApiUrl();
const API_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  public readonly status?: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    status?: number,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

export type UserRole = 'citizen' | 'municipal_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AdminProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAdminProfilePayload {
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
}

export interface PublicSpace {
  id: string;
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  status: 'ENABLED' | 'DISABLED';
  imageUrl?: string | null;
  createdAt: string;
}

export interface CommunityEventCatalogItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  requirements: string[];
  organizerName: string;
  capacity: number;
  registeredCount: number;
  availableCapacity: number;
  requiresRegistration: boolean;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'ACTIVE_FULL' | 'CANCELLED';
  imageUrl?: string | null;
  publicSpace: {
    id: string;
    name: string;
    address: string;
    zone: string;
  };
}

export interface CreateCommunityEventPayload {
  title: string;
  category: string;
  tags: string[];
  description: string;
  requirements: string[];
  publicSpaceId: string;
  capacity: number;
  requiresRegistration: boolean;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
}

export interface CommunityEvent {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  requirements: string[];
  publicSpaceId: string;
  organizerName: string;
  capacity: number;
  requiresRegistration: boolean;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'ACTIVE_FULL' | 'CANCELLED';
  imageUrl?: string | null;
  createdAt: string;
}

export interface CitizenCommunityEventRegistration {
  id: string;
  communityEventId: string;
  citizenName: string;
  citizenEmail: string;
  createdAt: string;
  communityEvent: {
    id: string;
    title: string;
    category: string;
    tags: string[];
    description: string;
    requirements: string[];
    capacity: number;
    requiresRegistration: boolean;
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'ACTIVE_FULL' | 'CANCELLED';
    imageUrl?: string | null;
    publicSpace: {
      id: string;
      name: string;
      address: string;
      zone: string;
    };
  };
}

export interface CommunityEventRegistration {
  id: string;
  communityEventId: string;
  citizenName: string;
  citizenEmail: string;
  createdAt: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getMockIdentityHeaders(),
      ...options?.headers,
    },
  });

  return parseResponse<T>(response, 'No se pudo completar la operación.');
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'POST',
    headers: getMockIdentityHeaders(),
    body: formData,
  });

  return parseResponse<T>(response, 'No se pudo subir la imagen.');
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new ApiError('El servidor tardó demasiado en responder.');
    }

    throw new ApiError('No se pudo establecer conexión con el servidor.');
  }
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  const headerRequestId = response.headers.get('x-request-id') || undefined;
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        'El servidor devolvió una respuesta que no es válida.',
        response.status,
        headerRequestId
      );
    }
  }

  const bodyRequestId = getStringProperty(data, 'requestId');
  const requestId = headerRequestId || bodyRequestId;

  if (!response.ok) {
    throw new ApiError(
      getStringProperty(data, 'message') || fallbackMessage,
      response.status,
      requestId
    );
  }

  return data as T;
}

function getStringProperty(value: unknown, property: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[property];
  return typeof candidate === 'string' ? candidate : undefined;
}

function getMockIdentityHeaders(): Record<string, string> {
  if (!import.meta.env.DEV) {
    return {};
  }

  const saved = localStorage.getItem('mock_user');

  if (!saved) {
    return {};
  }

  try {
    const user = JSON.parse(saved) as unknown;

    if (!isStoredMockUser(user)) {
      localStorage.removeItem('mock_user');
      return {};
    }

    return {
      'x-user-id': user.id,
      'x-user-name': user.name,
      'x-user-email': user.email,
      'x-user-role': user.role,
    };
  } catch {
    localStorage.removeItem('mock_user');
    return {};
  }
}

function isStoredMockUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Partial<User>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'citizen' || user.role === 'municipal_admin')
  );
}

export async function mockLogin(payload: { email: string; password: string }) {
  // Bypass backend per user request
  return {
    user: {
      id: payload.email === 'admin' ? 'admin-1' : 'citizen-1',
      name: payload.email === 'admin' ? 'Administrador' : 'Ciudadano',
      email: payload.email,
      role: payload.email === 'admin' ? 'municipal_admin' as UserRole : 'citizen' as UserRole,
    }
  };
}

export function getAdminProfile() {
  return request<AdminProfile>('/api/admin/profile');
}

export function updateAdminProfile(payload: UpdateAdminProfilePayload) {
  return request<AdminProfile>('/api/admin/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function uploadEventImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return uploadRequest<{ imageUrl: string }>('/api/uploads/event-image', formData);
}

export interface PublicSpacePayload {
  name: string;
  description: string;
  address: string;
  zone: string;
  capacity: number;
  status: 'ENABLED' | 'DISABLED';
  imageUrl?: string | null;
}

export function listPublicSpaces(params?: { status?: 'ENABLED' | 'DISABLED' }) {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set('status', params.status);
  }

  const query = searchParams.toString();
  return request<PublicSpace[]>(`/api/public-spaces${query ? `?${query}` : ''}`);
}

export function createPublicSpace(payload: PublicSpacePayload) {
  return request<PublicSpace>('/api/public-spaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePublicSpace(id: string, payload: PublicSpacePayload) {
  return request<PublicSpace>(`/api/public-spaces/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deletePublicSpace(id: string) {
  return request<void>(`/api/public-spaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function listCommunityEvents(params?: {
  category?: string;
  search?: string;
  availableOnly?: boolean;
  upcomingOnly?: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (params?.category) {
    searchParams.set('category', params.category);
  }

  if (params?.search) {
    searchParams.set('search', params.search);
  }

  if (params?.availableOnly) {
    searchParams.set('availableOnly', 'true');
  }

  if (params?.upcomingOnly) {
    searchParams.set('upcomingOnly', 'true');
  }

  const query = searchParams.toString();
  return request<{ items: CommunityEventCatalogItem[]; message?: string }>(
    `/api/community-events${query ? `?${query}` : ''}`
  );
}

export function createCommunityEvent(payload: CreateCommunityEventPayload) {
  return request<CommunityEvent>('/api/community-events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCommunityEvent(id: string) {
  return request<CommunityEventCatalogItem>(`/api/community-events/${encodeURIComponent(id)}`);
}

export function registerToCommunityEvent(id: string) {
  return request<{ id: string; communityEventId: string; citizenName: string; citizenEmail: string }>(
    `/api/community-events/${encodeURIComponent(id)}/registrations`,
    {
      method: 'POST',
    }
  );
}

export function listCommunityEventRegistrations(id: string) {
  return request<CommunityEventRegistration[]>(
    `/api/community-events/${encodeURIComponent(id)}/registrations`
  );
}

export function listMyCommunityEventRegistrations() {
  return request<CitizenCommunityEventRegistration[]>('/api/community-events/registrations/me');
}

export function cancelCommunityEventRegistration(registrationId: string) {
  return request<void>(
    `/api/community-events/registrations/${encodeURIComponent(registrationId)}`,
    { method: 'DELETE' }
  );
}

export interface Reservation {
  id: string;
  publicSpaceId: string;
  requesterName: string;
  requesterEmail: string;
  estimatedAttendees: number;
  startDate: string;
  endDate: string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export function getReservationById(id: string) {
  return request<Reservation>(`/api/reservations/${id}`);
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export function askChatbot(message: string, history?: ChatMessage[]) {
  return request<{ reply: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
    signal: AbortSignal.timeout(30_000),
  });
}
