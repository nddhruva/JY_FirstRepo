import type {
  AccessibilityPreferences,
  ApplicationInstance,
  ApplicationModel,
  AuthProviderCatalogEntry,
  AuthProviderConfig,
  BrandingConfig,
  ConnectorDefinition,
  ComplianceFramework,
  ComplianceReportResponse,
  DashboardAnalyticsResponse,
  DashboardConfig,
  DatabaseCapabilities,
  Domain,
  ExecutionResponse,
  OnboardingPlan,
  LocaleInfo,
  QuestionnaireAssignmentResult,
  ReportMode,
  ReportResult,
  SyncConnectorCatalogEntry,
  SyncConnectorConfig,
  SyncJobResponse,
  TranslationBundle,
} from './types'

function inferApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:8000'
  }

  const { protocol, hostname, port } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000'
  }

  // Cursor cloud domains often encode forwarded port in hostname: "...-5173...."
  if (hostname.includes('-5173.')) {
    return `${protocol}//${hostname.replace('-5173.', '-8000.')}`
  }
  const hostnameWithApiPort = hostname.replace(/-\d+\./, '-8000.')
  if (hostnameWithApiPort !== hostname) {
    return `${protocol}//${hostnameWithApiPort}`
  }
  if (port === '5173') {
    return `${protocol}//${hostname}:8000`
  }
  return `${protocol}//${hostname}`
}

const API_BASE_URL = inferApiBaseUrl()
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? '20000')

export interface AuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface ApiRequestOptions extends RequestInit {
  token?: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408)
    }
    throw new ApiError('Network request failed. Check connectivity and retry.', 503)
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ detail: response.statusText }))) as {
      detail?: string
    }
    if (response.status === 401) {
      throw new ApiError('Session is no longer authorized. Please sign in again.', 401)
    }
    throw new ApiError(payload.detail ?? `Request failed with ${response.status}`, response.status)
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

export async function getSupportedLocales(token: string): Promise<{ items: LocaleInfo[] }> {
  return apiRequest<{ items: LocaleInfo[] }>('/i18n/locales', { token })
}

export async function getAccessibilityPreferences(token: string): Promise<AccessibilityPreferences> {
  return apiRequest<AccessibilityPreferences>('/users/me/accessibility-preferences', { token })
}

export async function updateAccessibilityPreferences(
  token: string,
  payload: Partial<AccessibilityPreferences>,
): Promise<AccessibilityPreferences> {
  return apiRequest<AccessibilityPreferences>('/users/me/accessibility-preferences', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function getComplianceFrameworks(token: string): Promise<{ items: ComplianceFramework[] }> {
  return apiRequest<{ items: ComplianceFramework[] }>('/compliance/frameworks', { token })
}

export async function runComplianceReport(
  token: string,
  payload: {
    tenantId: string
    framework: string
    scope?: Record<string, unknown>
  },
): Promise<ComplianceReportResponse> {
  return apiRequest<ComplianceReportResponse>('/compliance/reports/run', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function createApplication(
  token: string,
  payload: {
    tenantId: string
    name: string
    businessCriticality: string
    dataClassification: string
    targetVendors: Array<{ domain: Domain; vendor: string; product: string }>
    instances?: Array<{
      instanceName: string
      environmentType: string
      endpoint?: string
      region?: string
    }>
  },
): Promise<ApplicationModel> {
  return apiRequest<ApplicationModel>('/applications', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listApplications(
  token: string,
  options: {
    tenantId?: string
    status?: string
    environment?: string
  },
): Promise<{ items: ApplicationModel[] }> {
  const query = new URLSearchParams()
  if (options.tenantId) query.set('tenantId', options.tenantId)
  if (options.status) query.set('status', options.status)
  if (options.environment) query.set('environment', options.environment)
  const queryString = query.toString()
  return apiRequest<{ items: ApplicationModel[] }>(
    `/applications${queryString ? `?${queryString}` : ''}`,
    { token },
  )
}

export async function ingestApplicationData(
  token: string,
  applicationId: string,
  payload: {
    sourceType: string
    payload: Record<string, unknown>
  },
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/applications/${applicationId}/ingest`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listApplicationInstances(
  token: string,
  applicationId: string,
): Promise<{ items: ApplicationInstance[] }> {
  return apiRequest<{ items: ApplicationInstance[] }>(`/applications/${applicationId}/instances`, { token })
}

export async function createApplicationInstance(
  token: string,
  applicationId: string,
  payload: {
    instanceName: string
    environmentType: string
    endpoint?: string
    region?: string
  },
): Promise<ApplicationInstance> {
  return apiRequest<ApplicationInstance>(`/applications/${applicationId}/instances`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function updateApplicationInstance(
  token: string,
  applicationId: string,
  instanceId: string,
  payload: Partial<{
    instanceName: string
    environmentType: string
    endpoint: string
    region: string
  }>,
): Promise<ApplicationInstance> {
  return apiRequest<ApplicationInstance>(`/applications/${applicationId}/instances/${instanceId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export async function assignQuestionnaires(
  token: string,
  applicationId: string,
  payload: {
    templateIds: string[]
    stakeholders: Array<{ role: string; userId: string }>
  },
): Promise<QuestionnaireAssignmentResult> {
  return apiRequest<QuestionnaireAssignmentResult>(
    `/applications/${applicationId}/questionnaires/assign`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    },
  )
}

export async function upsertQuestionnaireTemplate(
  token: string,
  payload: {
    id: string
    version: number
    name: string
    sections: Array<Record<string, unknown>>
  },
): Promise<{ id: string; version: number; name: string }> {
  return apiRequest<{ id: string; version: number; name: string }>('/questionnaire-templates', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function createWorkflowTemplate(
  token: string,
  payload: {
    id: string
    version: number
    name: string
    nodes: Array<Record<string, unknown>>
    transitions: Array<Record<string, unknown>>
  },
): Promise<{ id: string; version: number; name: string }> {
  return apiRequest<{ id: string; version: number; name: string }>('/workflow-templates', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function generateOnboardingPlan(
  token: string,
  applicationId: string,
): Promise<OnboardingPlan> {
  return apiRequest<OnboardingPlan>(`/applications/${applicationId}/onboarding/plan`, {
    method: 'POST',
    token,
  })
}

export async function executeOnboarding(
  token: string,
  applicationId: string,
  payload: {
    targetVendorDomain: Domain
    vendor: string
    product: string
    connectorId?: string
    secretReferences?: Array<{ provider: 'vault' | 'aws_sm' | 'azure_kv' | 'gcp_sm'; path: string }>
  },
): Promise<ExecutionResponse> {
  return apiRequest<ExecutionResponse>(`/applications/${applicationId}/onboarding/execute`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function searchConnectors(
  token: string,
  payload: {
    domain: Domain
    vendor: string
    product: string
    productVersion?: string
  },
): Promise<{ items: ConnectorDefinition[] }> {
  return apiRequest<{ items: ConnectorDefinition[] }>('/connectors/catalog/search', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function scaffoldCustomConnector(
  token: string,
  payload: {
    applicationId: string
    targetVendorDomain: Domain
    schema: Record<string, unknown>
  },
): Promise<ConnectorDefinition> {
  return apiRequest<ConnectorDefinition>('/connectors/custom/scaffold', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function exportConfiguration(
  token: string,
  payload: {
    tenantId: string
    applicationIds: string[]
    destination: {
      type: string
      url: string
      branch?: string
    }
    includeEnvironments: boolean
  },
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/exports/configuration', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function requestProviderAccess(
  token: string,
  payload: {
    id: string
    tenantId: string
    requestedBy?: string
    purpose: string
    allowedDataScope: string[]
    expiresAt: string
    status?: string
  },
): Promise<{ id: string; tenantId: string; status: string }> {
  return apiRequest<{ id: string; tenantId: string; status: string }>('/consent/provider-access', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function decideProviderAccess(
  token: string,
  payload: {
    requestId: string
    decision: string
    decidedBy: string
    reason?: string
  },
): Promise<{ requestId: string; decision: string }> {
  return apiRequest<{ requestId: string; decision: string }>('/consent/provider-access', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listAuthProviderCatalog(
  token: string,
): Promise<{ items: AuthProviderCatalogEntry[] }> {
  return apiRequest<{ items: AuthProviderCatalogEntry[] }>('/integrations/auth-providers/catalog', {
    token,
  })
}

export async function createAuthProviderConfig(
  token: string,
  payload: {
    tenantId: string
    providerName: string
    protocol: string
    metadata: Record<string, unknown>
    claimMapping: Record<string, unknown>
    isPrimary: boolean
    isFallback: boolean
    loginPolicy: string
  },
): Promise<AuthProviderConfig> {
  return apiRequest<AuthProviderConfig>('/integrations/auth-providers', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listAuthProviderConfigs(token: string): Promise<{ items: AuthProviderConfig[] }> {
  return apiRequest<{ items: AuthProviderConfig[] }>('/integrations/auth-providers', { token })
}

export async function updateAuthProviderConfig(
  token: string,
  providerConfigId: string,
  payload: Partial<{
    metadata: Record<string, unknown>
    claimMapping: Record<string, unknown>
    isPrimary: boolean
    isFallback: boolean
    loginPolicy: string
    status: string
  }>,
): Promise<AuthProviderConfig> {
  return apiRequest<AuthProviderConfig>(`/integrations/auth-providers/${providerConfigId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listSyncConnectorCatalog(
  token: string,
): Promise<{ items: SyncConnectorCatalogEntry[] }> {
  return apiRequest<{ items: SyncConnectorCatalogEntry[] }>('/integrations/sync/connectors/catalog', { token })
}

export async function createSyncConnectorConfig(
  token: string,
  payload: {
    tenantId: string
    sourceCategory: string
    providerName: string
    syncMode: string
    includeObjects: string[]
    filterPolicy: Record<string, unknown>
    credentialReference?: { provider: 'vault' | 'aws_sm' | 'azure_kv' | 'gcp_sm'; path: string }
  },
): Promise<SyncConnectorConfig> {
  return apiRequest<SyncConnectorConfig>('/integrations/sync/connectors', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function listSyncConnectorConfigs(token: string): Promise<{ items: SyncConnectorConfig[] }> {
  return apiRequest<{ items: SyncConnectorConfig[] }>('/integrations/sync/connectors', { token })
}

export async function runSyncJob(
  token: string,
  payload: {
    connectorId: string
    runType: string
    dryRun?: boolean
  },
): Promise<SyncJobResponse> {
  return apiRequest<SyncJobResponse>('/integrations/sync/jobs/run', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function getSyncJobStatus(token: string, jobId: string): Promise<SyncJobResponse> {
  return apiRequest<SyncJobResponse>(`/integrations/sync/jobs/${jobId}`, { token })
}

export async function getTranslationBundle(
  token: string,
  namespace: string,
  locale: string,
): Promise<TranslationBundle> {
  return apiRequest<TranslationBundle>(
    `/i18n/translations/${encodeURIComponent(namespace)}?locale=${encodeURIComponent(locale)}`,
    { token },
  )
}
