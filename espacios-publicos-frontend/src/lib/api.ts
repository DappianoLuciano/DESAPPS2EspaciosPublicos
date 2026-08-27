const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type UserRole = 'citizen' | 'municipal_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  description: string;
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
  description: string;
  publicSpaceId: string;
  organizerName: string;
  organizerProfileEnabled: boolean;
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
  description: string;
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
    description: string;
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getMockIdentityHeaders(),
      ...options?.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo completar la operación.');
  }

  return data as T;
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: getMockIdentityHeaders(),
    body: formData,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo subir la imagen.');
  }

  return data as T;
}

function getMockIdentityHeaders(): Record<string, string> {
  const saved = localStorage.getItem('mock_user');

  if (!saved) {
    return {};
  }

  const user = JSON.parse(saved) as User;

  return {
    'x-user-id': user.id,
    'x-user-name': user.name,
    'x-user-email': user.email,
    'x-user-role': user.role,
  };
}

export function mockLogin(payload: { email: string; password: string }) {
  return request<{ user: User }>('/api/auth/mock-login', {
    method: 'POST',
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
  return request<PublicSpace>(`/api/public-spaces/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deletePublicSpace(id: string) {
  return request<void>(`/api/public-spaces/${id}`, {
    method: 'DELETE',
  });
}

export function listCommunityEvents(params?: { category?: string; availableOnly?: boolean }) {
  const searchParams = new URLSearchParams();

  if (params?.category) {
    searchParams.set('category', params.category);
  }

  if (params?.availableOnly) {
    searchParams.set('availableOnly', 'true');
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
  return request<CommunityEventCatalogItem>(`/api/community-events/${id}`);
}

export function registerToCommunityEvent(
  id: string,
  payload: { citizenName: string; citizenEmail: string }
) {
  return request<{ id: string; communityEventId: string; citizenName: string; citizenEmail: string }>(
    `/api/community-events/${id}/registrations`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function listMyCommunityEventRegistrations() {
  return request<CitizenCommunityEventRegistration[]>('/api/community-events/registrations/me');
}

export function cancelCommunityEventRegistration(registrationId: string) {
  return request<void>(
    `/api/community-events/registrations/${registrationId}`,
    { method: 'DELETE' }
  );
}
