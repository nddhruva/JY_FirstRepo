export type ReportMode = 'filters' | 'sql' | 'graphql' | 'ai_prompt'

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
