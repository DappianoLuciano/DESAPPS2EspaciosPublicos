import { refreshCityPassSession } from './citypassAuth';

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

export type PublicSpaceCategory = 'PLAZA' | 'SALON' | 'CANCHA' | 'AUDITORIO';

export const PUBLIC_SPACE_CATEGORY_LABELS: Record<PublicSpaceCategory, string> = {
  PLAZA: 'Plaza',
  SALON: 'Salón',
  CANCHA: 'Cancha',
  AUDITORIO: 'Auditorio',
};

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

export const isMockLoginEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK_LOGIN === 'true';

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
  latitude?: number | null;
  longitude?: number | null;
  status: 'ENABLED' | 'DISABLED';
  exposure?: 'INDOOR' | 'OUTDOOR' | 'MIXED';
  category?: PublicSpaceCategory | null;
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
  status: 'ACTIVE' | 'ACTIVE_FULL' | 'SUSPENDED' | 'CANCELLED';
  statusReason?: string | null;
  activeWeatherAlertIds?: string[];
  imageUrl?: string | null;
  publicSpace: {
    id: string;
    name: string;
    address: string;
    zone: string;
    latitude?: number | null;
    longitude?: number | null;
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
  status: 'ACTIVE' | 'ACTIVE_FULL' | 'SUSPENDED' | 'CANCELLED';
  statusReason?: string | null;
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
    status: 'ACTIVE' | 'ACTIVE_FULL' | 'SUSPENDED' | 'CANCELLED';
    statusReason?: string | null;
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

async function request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (response.status === 401 && !isRetry && localStorage.getItem('citypass_refresh_token')) {
    const newToken = await refreshCityPassSession();
    if (newToken) {
      return request<T>(path, options, true);
    }
  }

  return parseResponse<T>(response, 'No se pudo completar la operación.');
}

async function uploadRequest<T>(path: string, formData: FormData, isRetry = false): Promise<T> {
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (response.status === 401 && !isRetry && localStorage.getItem('citypass_refresh_token')) {
    const newToken = await refreshCityPassSession();
    if (newToken) {
      return uploadRequest<T>(path, formData, true);
    }
  }

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

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return getMockIdentityHeaders();
}

function getMockIdentityHeaders(): Record<string, string> {
  if (!isMockLoginEnabled) {
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

export function googleLogin(credential: string) {
  return request<{ user: User; token: string }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
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

export function uploadPublicSpaceImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return uploadRequest<{ imageUrl: string }>('/api/uploads/public-space-image', formData);
}

export interface PublicSpacePayload {
  name: string;
  description: string;
  address: string;
  zone: string;
  capacity: number;
  latitude?: number | null;
  longitude?: number | null;
  status: 'ENABLED' | 'DISABLED';
  exposure: 'INDOOR' | 'OUTDOOR' | 'MIXED';
  category?: PublicSpaceCategory | null;
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

export type WeatherCriticality = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type WeatherPhenomenon =
  | 'TORMENTA_FUERTE' | 'LLUVIA_INTENSA' | 'VIENTO_FUERTE'
  | 'OLA_DE_CALOR' | 'OLA_DE_FRIO' | 'GRANIZO'
  | 'TORMENTA_ELECTRICA' | 'HURACAN' | 'NIEVE';
export type WeatherAlertStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'FINALIZED';

export interface WeatherAlert {
  activeRestrictionCount?: number;
  id: string;
  zone: string;
  latitude: number;
  longitude: number;
  phenomenon: WeatherPhenomenon;
  suggestedCriticality: WeatherCriticality;
  confirmedCriticality?: WeatherCriticality | null;
  status: WeatherAlertStatus;
  validFrom: string;
  validUntil: string;
  detectedAt: string;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  dismissalReason?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  evidence: {
    provider: 'OPEN_METEO' | 'MANUAL';
    locations?: Array<{ latitude: number; longitude: number }>;
    neighborhoods?: string[];
    manual?: { createdBy: string; createdAt: string; reason: string; source: string; locationIds: string[] };
    forecastFrom: string;
    forecastTo: string;
    maxWindGustKmh?: number;
    accumulatedPrecipitationMm?: number;
    temperatureMinC?: number;
    temperatureMaxC?: number;
    weatherCodes: number[];
    evaluatedHours: number;
  };
}

export interface WeatherCycleResult {
  ranAt: string;
  expiredAlertsFinalized: number;
  weatherCheck: {
    checkedAt: string;
    riskDetected: boolean;
    created: boolean;
    message: string;
    alert?: WeatherAlert;
  };
  delivery: { processed: number; published: number; failed: number };
}

export function listWeatherAlerts(status?: WeatherAlertStatus, signal?: AbortSignal) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<WeatherAlert[]>(`/api/admin/weather-alerts${query}`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
  });
}

export interface WeatherLocation {
  id: string; name: string; locality: string; latitude: number; longitude: number;
}

export interface WeatherImpactPlan {
  alertId: string; status: WeatherAlertStatus; validFrom: string; validUntil: string;
  neighborhoods: string[]; canApply: boolean; activeSpaceCount: number; activeEventCount: number;
  appliedSpaces: { id: string; name: string }[];
  appliedEvents: { id: string; title: string }[];
  spaces: {
    id: string; name: string; zone?: string; exposure?: string; restricted: boolean;
    events: { id: string; title: string; startDate: string; endDate: string; status: string; restricted: boolean; selectable: boolean }[];
  }[];
}

export function getWeatherImpact(id: string, signal?: AbortSignal) {
  return request<WeatherImpactPlan>(`/api/admin/weather-alerts/${encodeURIComponent(id)}/impact`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
  });
}

export function applyWeatherRestrictions(id: string, payload: { spaceIds: string[]; eventIds: string[]; reason: string }) {
  return request<WeatherImpactPlan>(`/api/admin/weather-alerts/${encodeURIComponent(id)}/restrictions`, {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export function releaseWeatherRestrictions(id: string) {
  return request<WeatherImpactPlan>(`/api/admin/weather-alerts/${encodeURIComponent(id)}/restrictions/release`, {
    method: 'POST', body: JSON.stringify({}),
  });
}

export function listWeatherLocations() {
  return request<WeatherLocation[]>('/api/admin/weather-alerts/locations');
}

export function createManualWeatherAlert(payload: {
  fenomeno: WeatherPhenomenon; nivelCriticidad: WeatherCriticality; ubicacionesIds: string[];
  vigenciaDesde: string; vigenciaHasta: string; motivo: string; fuente: string;
  rafagaMaxKmh?: number; precipitacionAcumuladaMm?: number;
  temperaturaMinC?: number; temperaturaMaxC?: number;
}) {
  return request<WeatherAlert>('/api/admin/weather-alerts/manual', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export function checkWeatherNow() {
  return request<Pick<WeatherCycleResult, 'weatherCheck'>>('/api/admin/weather-alerts/check', {
    method: 'POST',
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(45_000),
  });
}

export function confirmWeatherAlert(
  id: string,
  payload: { nivelCriticidad: WeatherCriticality; vigenciaHasta: string }
) {
  return request<{ alert: WeatherAlert; delivery: { processed: number; published: number; failed: number } }>(
    `/api/admin/weather-alerts/${encodeURIComponent(id)}/confirm`,
    { method: 'POST', body: JSON.stringify(payload), signal: AbortSignal.timeout(60_000) }
  );
}

export function dismissWeatherAlert(id: string, motivo: string) {
  return request<WeatherAlert>(`/api/admin/weather-alerts/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function finalizeWeatherAlert(id: string) {
  return request<{ alert: WeatherAlert; delivery: { processed: number; published: number; failed: number } }>(
    `/api/admin/weather-alerts/${encodeURIComponent(id)}/finalize`,
    { method: 'POST', body: JSON.stringify({}), signal: AbortSignal.timeout(60_000) }
  );
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

export function getCommunityEventRegistration(registrationId: string) {
  return request<CitizenCommunityEventRegistration>(
    `/api/community-events/registrations/${encodeURIComponent(registrationId)}`
  );
}

export function cancelCommunityEventRegistration(registrationId: string) {
  return request<void>(
    `/api/community-events/registrations/${encodeURIComponent(registrationId)}`,
    { method: 'DELETE' }
  );
}

export interface RoutePath {
  coordinates: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
}

interface RoutePlanIncidentBase {
  source: string;
  category: string | null;
  zone: string | null;
}

/** Incidente con coordenadas a 1000 m o menos del evento. */
export interface RoutePlanRadiusIncident extends RoutePlanIncidentBase {
  matchedBy: 'RADIUS';
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

/** Emergencia sin coordenadas en el mismo barrio que el espacio: no se dibuja en el mapa. */
export interface RoutePlanZoneIncident extends RoutePlanIncidentBase {
  matchedBy: 'ZONE';
  latitude: null;
  longitude: null;
  distanceMeters: null;
}

export type RoutePlanIncident = RoutePlanRadiusIncident | RoutePlanZoneIncident;

export interface EventRoutePlan {
  destination: { eventId: string; title: string; latitude: number; longitude: number; address: string };
  incidents: RoutePlanIncident[];
  dropoff: {
    stationName: string;
    latitude: number;
    longitude: number;
    availableSlots: number | null;
    distanceMeters: number | null;
    message: string;
    discardedByIncidents: number;
    calculatedAt: string;
  } | null;
  origin: { latitude: number; longitude: number } | null;
  bikeRoute: RoutePath | null;
  walkRoute: RoutePath | null;
  warnings: string[];
}

export function getEventRoutePlan(id: string, from?: { latitude: number; longitude: number }) {
  const query = from ? `?fromLat=${from.latitude}&fromLng=${from.longitude}` : '';

  return request<EventRoutePlan>(`/api/community-events/${encodeURIComponent(id)}/route-plan${query}`);
}

export type CancellationCauseType = 'EVENTO_CLIMATICO' | 'RECLAMO' | 'INCIDENTE_VIAL';

export interface CancellationCause {
  causaTipo: CancellationCauseType;
  causaId: string;
}

export function cancelCommunityEvent(id: string, reason?: string, cause?: CancellationCause) {
  return request<CommunityEvent>(`/api/community-events/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ ...(reason ? { reason } : {}), ...cause }),
  });
}

export function changeCommunityEventSuspension(id: string, action: 'suspend' | 'resume', reason?: string) {
  return request<CommunityEvent>(`/api/community-events/${encodeURIComponent(id)}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify(action === 'suspend' ? { reason } : {}),
  });
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

export type EmergencyImpactStatus = 'SUSPENDIDA' | 'CONFIRMADA' | 'REPROGRAMADA' | 'A_REPROGRAMAR';

export interface EmergencyImpact {
  id: string;
  emergenciaId: string;
  bookingType: 'RESERVATION' | 'COMMUNITY_EVENT';
  bookingId: string;
  publicSpaceId: string;
  startDate: string;
  endDate: string;
  status: EmergencyImpactStatus;
  organizerName: string;
  rescheduledBy: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface SpaceProblem {
  id: string;
  emergenciaId: string;
  publicSpaceId: string | null;
  type: string;
  createdAt: string;
}

export interface EmergencyImpactSummary {
  reservations: number;
  affectedBookings: number;
  releasedSpaces: number;
  problems: number;
}

export interface EmergencyImpactsResponse {
  summary: EmergencyImpactSummary;
  impacts: EmergencyImpact[];
  problems: SpaceProblem[];
}

export function getEmergencyImpacts() {
  return request<EmergencyImpactsResponse>('/api/emergency-impacts');
}

export function rescheduleEmergencyImpact(id: string, startDate: string, endDate: string) {
  return request<EmergencyImpact>(`/api/emergency-impacts/${encodeURIComponent(id)}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  });
}

export interface EmergencyEventNotice {
  eventId: string;
  status: EmergencyImpactStatus;
  startDate: string;
  endDate: string;
}

export function listEmergencyEventNotices() {
  return request<EmergencyEventNotice[]>('/api/emergency-impacts/notices');
}

export type InterventionResult = 'RESUELTO' | 'RECHAZADO';

export interface PendingIntervention {
  reclamoId: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
  reportedAt: string;
}

export function listPendingInterventions() {
  return request<PendingIntervention[]>('/api/admin/interventions');
}

export function finishIntervention(reclamoId: string, resultado: InterventionResult, idAuto?: string) {
  return request<Record<string, unknown>>(`/api/admin/interventions/${encodeURIComponent(reclamoId)}/finish`, {
    method: 'POST',
    body: JSON.stringify(idAuto ? { resultado, idAuto } : { resultado }),
  });
}
