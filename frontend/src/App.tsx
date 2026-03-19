import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getDatabaseCapabilities } from './api'
import { AuthPanel } from './components/AuthPanel'
import { DashboardBuilder } from './components/DashboardBuilder'
import { DemoPresentationCenter } from './components/DemoPresentationCenter'
import { GovernanceConfigCenter } from './components/GovernanceConfigCenter'
import { IntegrationsAdminPanel } from './components/IntegrationsAdminPanel'
import { OnboardingWorkbench } from './components/OnboardingWorkbench'
import { ReportDesigner } from './components/ReportDesigner'
import { SecurityComplianceCenter } from './components/SecurityComplianceCenter'
import { ThemeEditor } from './components/ThemeEditor'
import { parseJwtSession, tokenExpiresInSeconds } from './security'
import type { AccessibilityPreferences, BrandingConfig, JwtSessionPayload } from './types'
import { uuidSchema } from './validation'

type Tab =
  | 'demo'
  | 'onboarding'
  | 'integrations'
  | 'governance'
  | 'theme'
  | 'dashboard'
  | 'reports'
  | 'compliance'

function applyTheme(branding: BrandingConfig) {
  const root = document.documentElement
  const palette = branding.colorPalette ?? {}
  root.style.setProperty('--brand-primary', palette.primary ?? '#304ffe')
  root.style.setProperty('--brand-secondary', palette.secondary ?? '#00c853')
  root.style.setProperty('--brand-accent', palette.accent ?? '#aa3bff')
  root.style.setProperty('--brand-surface', palette.surface ?? '#ffffff')
  root.style.setProperty('--brand-text', palette.text ?? '#101828')

  const fonts = branding.fonts ?? {}
  root.style.setProperty('--font-primary', fonts.primary ?? 'Inter, system-ui, sans-serif')
  root.style.setProperty('--font-heading', fonts.heading ?? 'Poppins, Inter, system-ui, sans-serif')
  root.style.setProperty('--font-mono', fonts.mono ?? 'JetBrains Mono, ui-monospace, monospace')

  if (branding.backgroundImageUrl) {
    root.style.setProperty('--app-background-image', `url(${branding.backgroundImageUrl})`)
  } else {
    root.style.setProperty('--app-background-image', 'none')
  }
}

function applyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement
  root.classList.toggle('a11y-high-contrast', preferences.highContrastMode)
  root.classList.toggle('a11y-reduced-motion', preferences.reducedMotion)
  root.classList.toggle('a11y-screen-reader', preferences.screenReaderOptimized)
  root.classList.toggle('a11y-keyboard-only', preferences.keyboardOnlyMode)
  root.setAttribute('data-focus-ring-style', preferences.focusRingStyle || 'default')
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('aop_token') ?? '')
  const [tenantId, setTenantId] = useState(() => sessionStorage.getItem('aop_tenant_id') ?? '')
  const [activeTab, setActiveTab] = useState<Tab>('demo')
  const [themePreview, setThemePreview] = useState<BrandingConfig | null>(null)
  const [sessionTick, setSessionTick] = useState(() => Date.now())
  const [notice, setNotice] = useState<string | null>(null)
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>({
    keyboardOnlyMode: true,
    focusRingStyle: 'default',
    reducedMotion: false,
    highContrastMode: false,
    screenReaderOptimized: false,
  })
  const tenantIsValid = useMemo(() => uuidSchema.safeParse(tenantId).success, [tenantId])
  const session = useMemo<JwtSessionPayload | null>(() => parseJwtSession(token), [token])
  const roles = useMemo(() => new Set(session?.roles ?? []), [session?.roles])

  const roleFlags = useMemo(
    () => ({
      platformAdmin: roles.has('platform_admin'),
      tenantAdmin: roles.has('tenant_admin'),
      appOwner: roles.has('app_owner'),
      integrationAdmin: roles.has('integration_admin'),
      complianceAdmin: roles.has('compliance_admin'),
      auditor: roles.has('auditor'),
    }),
    [roles],
  )

  const canWriteBranding = roleFlags.platformAdmin || roleFlags.tenantAdmin
  const canWriteDashboard = roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.appOwner
  const canWriteReports = roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.complianceAdmin
  const canWriteCompliance = roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.complianceAdmin
  const canWriteOnboarding =
    roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.appOwner || roleFlags.integrationAdmin
  const canWriteIntegrations = roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.integrationAdmin
  const canWriteGovernance = roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.integrationAdmin

  const navTabs = useMemo<Array<{ id: Tab; label: string; visible: boolean }>>(
    () => [
      {
        id: 'demo',
        label: 'Demo Center',
        visible: true,
      },
      {
        id: 'onboarding',
        label: 'Onboarding Workbench',
        visible:
          roleFlags.platformAdmin ||
          roleFlags.tenantAdmin ||
          roleFlags.appOwner ||
          roleFlags.integrationAdmin ||
          roleFlags.auditor,
      },
      {
        id: 'integrations',
        label: 'Integrations Admin',
        visible: roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.integrationAdmin || roleFlags.auditor,
      },
      {
        id: 'governance',
        label: 'Governance & Config',
        visible:
          roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.integrationAdmin || roleFlags.complianceAdmin,
      },
      {
        id: 'theme',
        label: 'Theme Editor',
        visible: roleFlags.platformAdmin || roleFlags.tenantAdmin,
      },
      { id: 'dashboard', label: 'Dashboard Builder', visible: true },
      { id: 'reports', label: 'Report Designer', visible: true },
      {
        id: 'compliance',
        label: 'Security & Compliance',
        visible: roleFlags.platformAdmin || roleFlags.tenantAdmin || roleFlags.complianceAdmin || roleFlags.auditor,
      },
    ],
    [roleFlags],
  )
  const visibleTabs = useMemo(() => navTabs.filter((tab) => tab.visible), [navTabs])
  const currentTab = useMemo<Tab>(
    () => (visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? 'dashboard')),
    [activeTab, visibleTabs],
  )

  const dbCapabilitiesQuery = useQuery({
    queryKey: ['db-capabilities', token],
    queryFn: () => getDatabaseCapabilities(token),
    enabled: Boolean(token),
  })

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('aop_token', token)
    } else {
      sessionStorage.removeItem('aop_token')
    }
  }, [token])

  useEffect(() => {
    if (tenantId) sessionStorage.setItem('aop_tenant_id', tenantId)
    else sessionStorage.removeItem('aop_tenant_id')
  }, [tenantId])

  useEffect(() => {
    if (themePreview) {
      applyTheme(themePreview)
    }
  }, [themePreview])

  useEffect(() => {
    applyAccessibilityPreferences(accessibility)
  }, [accessibility])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSessionTick(Date.now())
      const expiresIn = tokenExpiresInSeconds(session)
      if (typeof expiresIn === 'number' && expiresIn <= 0) {
        setNotice('Session expired for security reasons. Please sign in again.')
        setToken('')
      }
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [session])

  useEffect(() => {
    function onHotkeys(event: KeyboardEvent) {
      if (!token || !tenantId || !event.altKey) return
      if (event.key === '1') setActiveTab('demo')
      if (event.key === '2') setActiveTab('onboarding')
      if (event.key === '3') setActiveTab('integrations')
      if (event.key === '4') setActiveTab('governance')
      if (event.key === '5') setActiveTab('theme')
      if (event.key === '6') setActiveTab('dashboard')
      if (event.key === '7') setActiveTab('reports')
      if (event.key === '8') setActiveTab('compliance')
    }
    window.addEventListener('keydown', onHotkeys)
    return () => window.removeEventListener('keydown', onHotkeys)
  }, [token, tenantId])

  const tabTitle = useMemo(() => {
    if (currentTab === 'demo') return 'Demo Presentation Center'
    if (currentTab === 'onboarding') return 'Onboarding Workbench'
    if (currentTab === 'integrations') return 'Integrations Administration'
    if (currentTab === 'governance') return 'Governance, Settings & Configuration'
    if (currentTab === 'theme') return 'Theme Editor'
    if (currentTab === 'dashboard') return 'Dashboard Builder'
    if (currentTab === 'reports') return 'Report Designer'
    return 'Security & Compliance Center'
  }, [currentTab])

  const sessionExpiryLabel = useMemo(() => {
    if (!session) return 'Not signed in'
    const nowSeconds = Math.floor(sessionTick / 1000)
    const expiresIn = session.exp - nowSeconds
    if (expiresIn <= 0) return 'Expired'
    const minutes = Math.floor(expiresIn / 60)
    const seconds = expiresIn % 60
    return `${minutes}m ${seconds}s`
  }, [session, sessionTick])

  function handleSignOut() {
    setToken('')
    setTenantId('')
    setThemePreview(null)
    setNotice('Signed out.')
  }

  function handleTenantChange(value: string) {
    setNotice(null)
    if (!value.trim()) {
      setTenantId('')
      return
    }
    const validation = uuidSchema.safeParse(value.trim())
    if (!validation.success) {
      setNotice('Tenant ID should be a valid UUID.')
      setTenantId(value)
      return
    }
    setNotice(null)
    setTenantId(value.trim())
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <div>
          <h1>AOP Studio</h1>
          <p>
            Professional onboarding operations console with enterprise branding, analytics,
            reporting, and compliance controls.
          </p>
        </div>
        <div className="topbar-actions">
          <input
            value={tenantId}
            onChange={(event) => handleTenantChange(event.target.value)}
            placeholder="Tenant UUID"
            aria-label="Tenant UUID"
          />
          {session ? (
            <span className="session-pill" aria-label={`Session expires in ${sessionExpiryLabel}`}>
              Session: {sessionExpiryLabel}
            </span>
          ) : null}
          {token ? (
            <button className="ghost" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : null}
        </div>
      </header>

      <main id="main-content" className="content">
        {notice ? (
          <p role="status" aria-live="polite" className="info-banner">
            {notice}
          </p>
        ) : null}
        {!token ? (
          <AuthPanel onAuthenticated={setToken} tenantId={tenantId} setTenantId={setTenantId} />
        ) : null}

        {token && tenantId && tenantIsValid ? (
          <div className="workspace">
            <aside className="sidebar">
              <h3>Workspace</h3>
              <p className="helper-text">Use Alt+1..8 keyboard shortcuts to switch modules.</p>
              {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={currentTab === tab.id ? 'active' : ''}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}

              <div className="meta-card">
                <h4>Backend Capability</h4>
                {dbCapabilitiesQuery.data ? (
                  <ul>
                    <li>
                      SQL: <strong>{dbCapabilitiesQuery.data.relational.currentDialect}</strong>
                    </li>
                    <li>
                      Graph:{' '}
                      <strong>
                        {dbCapabilitiesQuery.data.graph.enabled
                          ? dbCapabilitiesQuery.data.graph.provider
                          : 'disabled'}
                      </strong>
                    </li>
                    <li>
                      Cloud DB:{' '}
                      <strong>
                        {(dbCapabilitiesQuery.data.cloudFlavors?.aws ?? []).length +
                          (dbCapabilitiesQuery.data.cloudFlavors?.azure ?? []).length +
                          (dbCapabilitiesQuery.data.cloudFlavors?.gcp ?? []).length}
                      </strong>
                    </li>
                  </ul>
                ) : (
                  <p className="helper-text">Loading capabilities...</p>
                )}
              </div>

              <div className="meta-card">
                <h4>Session Context</h4>
                {session ? (
                  <ul>
                    <li>
                      User: <strong>{session.username}</strong>
                    </li>
                    <li>
                      Roles: <strong>{session.roles.join(', ') || 'none'}</strong>
                    </li>
                  </ul>
                ) : (
                  <p className="helper-text">No active session metadata.</p>
                )}
              </div>
            </aside>

            <section className="workspace-main">
              <h2>{tabTitle}</h2>
              {currentTab === 'demo' ? (
                <DemoPresentationCenter token={token} tenantId={tenantId} canWrite={canWriteReports} />
              ) : null}
              {currentTab === 'onboarding' ? (
                <OnboardingWorkbench token={token} tenantId={tenantId} canWrite={canWriteOnboarding} />
              ) : null}
              {currentTab === 'integrations' ? (
                <IntegrationsAdminPanel token={token} tenantId={tenantId} canWrite={canWriteIntegrations} />
              ) : null}
              {currentTab === 'governance' ? (
                <GovernanceConfigCenter
                  token={token}
                  tenantId={tenantId}
                  userId={session?.sub}
                  canWrite={canWriteGovernance}
                />
              ) : null}
              {currentTab === 'theme' ? (
                <ThemeEditor
                  token={token}
                  tenantId={tenantId}
                  onThemeUpdated={setThemePreview}
                  canWrite={canWriteBranding}
                />
              ) : null}
              {currentTab === 'dashboard' ? (
                <DashboardBuilder token={token} tenantId={tenantId} canWrite={canWriteDashboard} />
              ) : null}
              {currentTab === 'reports' ? (
                <ReportDesigner token={token} tenantId={tenantId} canWrite={canWriteReports} />
              ) : null}
              {currentTab === 'compliance' ? (
                <SecurityComplianceCenter
                  token={token}
                  tenantId={tenantId}
                  onAccessibilityUpdated={setAccessibility}
                  canWrite={canWriteCompliance}
                />
              ) : null}
            </section>
          </div>
        ) : null}
        {token && tenantId && !tenantIsValid ? (
          <section className="panel">
            <h2>Tenant ID validation</h2>
            <p className="helper-text">
              Provide a valid tenant UUID to access branding, dashboards, reports, and compliance
              operations.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
