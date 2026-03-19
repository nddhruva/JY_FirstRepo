export type ReportMode = 'filters' | 'sql' | 'graphql' | 'ai_prompt'
export type Domain = 'IGA' | 'IAM' | 'PAM' | 'SSO'
export type EnvironmentType = 'dev' | 'test' | 'uat' | 'stage' | 'prod' | 'other'

export interface JwtSessionPayload {
  sub: string
  username: string
  tenant_id?: string | null
  roles: string[]
  iat: number
  exp: number
}

export interface BrandingConfig {
  tenantId: string
  brandName?: string
  colorPalette: Record<string, string>
  fonts: Record<string, string>
  logoUrl?: string
  backgroundImageUrl?: string
  customCss?: string
  assets: Record<string, string[]>
}

export interface DashboardWidget {
  id: string
  type: string
  title: string
  config?: Record<string, unknown>
}

export interface DashboardConfig {
  id: string
  tenantId?: string
  userId: string
  name: string
  isDefault: boolean
  layout: Record<string, unknown>
  widgets: DashboardWidget[]
}

export interface DashboardAnalyticsResponse {
  tenantId: string
  role: string
  progress: number
  completions: number
  denials: number
  errors: number
  focusItems: Array<{ type: string; priority: string; count: number; message: string }>
  charts: Array<{
    type: string
    title: string
    data: Record<string, number>
  }>
}

export interface ReportResult {
  id: string
  tenantId: string
  title: string
  mode: ReportMode
  status: string
  summary: string
  data: Array<Record<string, unknown>>
  visualizations: Array<Record<string, unknown>>
  generatedAt: string
}

export interface DatabaseCapabilities {
  relational: {
    currentDialect: string
    supportedDialects: string[]
    databaseUrl: string
  }
  graph: {
    enabled: boolean
    provider: string
    urlConfigured: boolean
  }
  cloudFlavors?: {
    aws: string[]
    azure: string[]
    gcp: string[]
    onPrem: string[]
    graph: string[]
  }
}

export interface LocaleInfo {
  locale: string
  language: string
  direction: 'ltr' | 'rtl' | string
  status: string
}

export interface AccessibilityPreferences {
  keyboardOnlyMode: boolean
  focusRingStyle: string
  reducedMotion: boolean
  highContrastMode: boolean
  screenReaderOptimized: boolean
}

export interface ComplianceFramework {
  name: string
  version: string
}

export interface ComplianceReportResponse {
  reportId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  framework: string
}

export interface SecretReference {
  provider: 'vault' | 'aws_sm' | 'azure_kv' | 'gcp_sm'
  path: string
}

export interface TargetVendor {
  domain: Domain
  vendor: string
  product: string
}

export interface ApplicationInstance {
  id: string
  applicationId: string
  instanceName: string
  environmentType: EnvironmentType
  endpoint?: string
  region?: string
  connectorProfileId?: string
  secretReference?: SecretReference
  status: string
}

export interface ApplicationModel {
  id: string
  tenantId: string
  name: string
  businessCriticality: string
  dataClassification: string
  status: string
  targetVendors: TargetVendor[]
  instances: ApplicationInstance[]
}

export interface OnboardingPlan {
  applicationId: string
  connectorRecommendation: Record<string, unknown>
  riskScore: Record<string, unknown>
}

export interface ExecutionResponse {
  executionId: string
  status: string
}

export interface QuestionnaireAssignmentResult {
  applicationId: string
  assignments: Array<{
    questionnaireInstanceId: string
    assignedToUserId: string
    dueDate: string
  }>
}

export interface ConnectorDefinition {
  id: string
  domain: Domain
  vendor: string
  product: string
  type: 'ootb' | 'custom' | 'webservices'
  operations: string[]
  status: string
}

export interface AuthProviderCatalogEntry {
  id: string
  providerName: string
  providerCategory: string
  supportedProtocols: string[]
  status: string
}

export interface AuthProviderConfig {
  id: string
  tenantId: string
  providerName: string
  protocol: string
  metadata: Record<string, unknown>
  claimMapping: Record<string, unknown>
  isPrimary: boolean
  isFallback: boolean
  loginPolicy: string
  status: string
}

export interface SyncConnectorCatalogEntry {
  id: string
  sourceCategory: string
  providerName: string
  supportedSyncModes: string[]
  supportedObjects: string[]
  status: string
}

export interface SyncConnectorConfig {
  id: string
  tenantId: string
  sourceCategory: string
  providerName: string
  syncMode: string
  includeObjects: string[]
  filterPolicy: Record<string, unknown>
  credentialReference?: SecretReference
  status: string
}

export interface SyncJobResponse {
  jobId: string
  connectorId: string
  runType: string
  status: string
  stats: Record<string, number>
}

export interface TranslationBundle {
  namespace: string
  locale: string
  version: number
  messages: Record<string, string>
}
