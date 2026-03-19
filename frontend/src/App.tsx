import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getDatabaseCapabilities } from './api'
import { AuthPanel } from './components/AuthPanel'
import { DashboardBuilder } from './components/DashboardBuilder'
import { ReportDesigner } from './components/ReportDesigner'
import { ThemeEditor } from './components/ThemeEditor'
import type { BrandingConfig } from './types'

type Tab = 'theme' | 'dashboard' | 'reports'

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

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('aop_token') ?? '')
  const [tenantId, setTenantId] = useState(() => localStorage.getItem('aop_tenant_id') ?? '')
  const [activeTab, setActiveTab] = useState<Tab>('theme')
  const [themePreview, setThemePreview] = useState<BrandingConfig | null>(null)

  const dbCapabilitiesQuery = useQuery({
    queryKey: ['db-capabilities', token],
    queryFn: () => getDatabaseCapabilities(token),
    enabled: Boolean(token),
  })

  useEffect(() => {
    if (token) localStorage.setItem('aop_token', token)
    else localStorage.removeItem('aop_token')
  }, [token])

  useEffect(() => {
    if (tenantId) localStorage.setItem('aop_tenant_id', tenantId)
    else localStorage.removeItem('aop_tenant_id')
  }, [tenantId])

  useEffect(() => {
    if (themePreview) {
      applyTheme(themePreview)
    }
  }, [themePreview])

  const tabTitle = useMemo(() => {
    if (activeTab === 'theme') return 'Theme Editor'
    if (activeTab === 'dashboard') return 'Dashboard Builder'
    return 'Report Designer'
  }, [activeTab])

  function handleSignOut() {
    setToken('')
    setThemePreview(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>AOP Studio</h1>
          <p>Branding, dashboard design, and intelligent reporting for IAM onboarding</p>
        </div>
        <div className="topbar-actions">
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="Tenant UUID"
            aria-label="Tenant UUID"
          />
          {token ? (
            <button className="ghost" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : null}
        </div>
      </header>

      <main className="content">
        {!token ? (
          <AuthPanel onAuthenticated={setToken} tenantId={tenantId} setTenantId={setTenantId} />
        ) : null}

        {token && tenantId ? (
          <div className="workspace">
            <aside className="sidebar">
              <h3>Workspace</h3>
              <button
                className={activeTab === 'theme' ? 'active' : ''}
                onClick={() => setActiveTab('theme')}
              >
                Theme Editor
              </button>
              <button
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard Builder
              </button>
              <button
                className={activeTab === 'reports' ? 'active' : ''}
                onClick={() => setActiveTab('reports')}
              >
                Report Designer
              </button>

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
                  </ul>
                ) : (
                  <p className="helper-text">Loading capabilities...</p>
                )}
              </div>
            </aside>

            <section className="workspace-main">
              <h2>{tabTitle}</h2>
              {activeTab === 'theme' ? (
                <ThemeEditor token={token} tenantId={tenantId} onThemeUpdated={setThemePreview} />
              ) : null}
              {activeTab === 'dashboard' ? (
                <DashboardBuilder token={token} tenantId={tenantId} />
              ) : null}
              {activeTab === 'reports' ? (
                <ReportDesigner token={token} tenantId={tenantId} />
              ) : null}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default App
