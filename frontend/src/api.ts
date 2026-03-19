import type {
  BrandingConfig,
  DashboardAnalyticsResponse,
  DashboardConfig,
  DatabaseCapabilities,
  ReportMode,
  ReportResult,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface AuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface ApiRequestOptions extends RequestInit {
  token?: string
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ detail: response.statusText }))) as {
      detail?: string
    }
    throw new Error(payload.detail ?? `Request failed with ${response.status}`)
  }
  return (await response.json()) as T
}

export async function login(username: string, password: string): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>('/auth/token', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getDatabaseCapabilities(token: string): Promise<DatabaseCapabilities> {
  return apiRequest<DatabaseCapabilities>('/system/database-capabilities', { token })
}

export async function createTenant(
  token: string,
  payload: {
    name: string
    region: string
    isolationTier: 'shared' | 'dedicated'
    defaultLocale: string
    supportedLocales: string[]
  },
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/tenants', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function getBranding(token: string, tenantId: string): Promise<BrandingConfig> {
  return apiRequest<BrandingConfig>(`/tenants/${tenantId}/branding`, { token })
}

export async function saveBranding(
  token: string,
  tenantId: string,
  payload: Partial<BrandingConfig>,
): Promise<BrandingConfig> {
  return apiRequest<BrandingConfig>(`/tenants/${tenantId}/branding`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function uploadBrandingAsset(
  token: string,
  tenantId: string,
  assetType: 'logo' | 'font' | 'background' | 'palette' | 'other',
  file: File,
): Promise<{ filePath: string }> {
  const formData = new FormData()
  formData.set('assetType', assetType)
  formData.set('file', file)
  return apiRequest<{ filePath: string }>(`/tenants/${tenantId}/branding/assets`, {
    method: 'POST',
    token,
    body: formData,
  })
}

export async function getDashboard(token: string, tenantId: string): Promise<DashboardConfig> {
  return apiRequest<DashboardConfig>(`/dashboards/me?tenantId=${encodeURIComponent(tenantId)}`, {
    token,
  })
}

export async function saveDashboard(
  token: string,
  payload: Partial<DashboardConfig> & { tenantId: string },
): Promise<DashboardConfig> {
  return apiRequest<DashboardConfig>('/dashboards/me', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function getDashboardAnalytics(
  token: string,
  tenantId: string,
): Promise<DashboardAnalyticsResponse> {
  return apiRequest<DashboardAnalyticsResponse>(
    `/dashboards/analytics?tenantId=${encodeURIComponent(tenantId)}`,
    { token },
  )
}

export async function generateReport(
  token: string,
  payload: {
    tenantId: string
    title: string
    mode: ReportMode
    filters?: Record<string, unknown>
    sqlQuery?: string
    graphqlQuery?: string
    aiPrompt?: string
    limit?: number
  },
): Promise<ReportResult> {
  return apiRequest<ReportResult>('/reports/generate', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listReports(
  token: string,
  tenantId: string,
): Promise<{ items: ReportResult[] }> {
  return apiRequest<{ items: ReportResult[] }>(
    `/reports?tenantId=${encodeURIComponent(tenantId)}`,
    { token },
  )
}
