import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  getAccessibilityPreferences,
  getComplianceFrameworks,
  getSupportedLocales,
  runComplianceReport,
  updateAccessibilityPreferences,
} from '../api'
import type { AccessibilityPreferences } from '../types'

interface SecurityComplianceCenterProps {
  token: string
  tenantId: string
  onAccessibilityUpdated: (prefs: AccessibilityPreferences) => void
}

const defaultPreferences: AccessibilityPreferences = {
  keyboardOnlyMode: true,
  focusRingStyle: 'default',
  reducedMotion: false,
  highContrastMode: false,
  screenReaderOptimized: false,
}

const standardsChecklist = [
  'JWT authentication with role/tenant policy enforcement',
  'Safe SQL constraints enforced on backend reporting endpoint',
  'Security headers enabled server-side (CSP, X-Frame-Options, etc.)',
  'SAST + dependency audit workflows integrated (bandit + pip-audit)',
  'Tenant-scoped data access for branding/dashboard/reporting operations',
  'WCAG keyboard + focus preferences supported per user',
]

export function SecurityComplianceCenter({
  token,
  tenantId,
  onAccessibilityUpdated,
}: SecurityComplianceCenterProps) {
  const [scopeJson, setScopeJson] = useState('{\n  "includeEvidence": true,\n  "window": "last_90_days"\n}')
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [preferencesOverride, setPreferencesOverride] = useState<AccessibilityPreferences | null>(null)
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null)

  const frameworksQuery = useQuery({
    queryKey: ['compliance-frameworks', token],
    queryFn: () => getComplianceFrameworks(token),
    enabled: Boolean(token),
  })

  const localesQuery = useQuery({
    queryKey: ['supported-locales', token],
    queryFn: () => getSupportedLocales(token),
    enabled: Boolean(token),
  })

  const accessibilityQuery = useQuery({
    queryKey: ['accessibility-preferences', token],
    queryFn: () => getAccessibilityPreferences(token),
    enabled: Boolean(token),
  })

  const effectivePreferences = preferencesOverride ?? accessibilityQuery.data ?? defaultPreferences
  const frameworkValue = selectedFramework ?? frameworksQuery.data?.items?.[0]?.name ?? ''
  const localeValue = selectedLocale ?? localesQuery.data?.items?.[0]?.locale ?? ''

  useEffect(() => {
    if (accessibilityQuery.data) {
      onAccessibilityUpdated(accessibilityQuery.data)
    }
  }, [accessibilityQuery.data, onAccessibilityUpdated])

  const runReportMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      let parsedScope: Record<string, unknown> = {}
      if (scopeJson.trim()) {
        try {
          parsedScope = JSON.parse(scopeJson) as Record<string, unknown>
        } catch {
          throw new Error('Scope JSON is invalid.')
        }
      }
      return runComplianceReport(token, {
        tenantId,
        framework: frameworkValue,
        scope: parsedScope,
      })
    },
    onSuccess: (response) => {
      setStatusMessage(`Compliance report queued: ${response.framework} (${response.reportId})`)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Unable to run compliance report.')
    },
  })

  const updateAccessibilityMutation = useMutation({
    mutationFn: (payload: Partial<AccessibilityPreferences>) => updateAccessibilityPreferences(token, payload),
    onSuccess: (updated) => {
      setPreferencesOverride(updated)
      onAccessibilityUpdated(updated)
      setStatusMessage('Accessibility preferences updated.')
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Unable to update accessibility preferences.')
    },
  })

  const currentLocaleInfo = useMemo(
    () => localesQuery.data?.items.find((item) => item.locale === localeValue),
    [localesQuery.data, localeValue],
  )

  useEffect(() => {
    if (currentLocaleInfo?.direction) {
      document.documentElement.setAttribute('dir', currentLocaleInfo.direction)
    }
  }, [currentLocaleInfo])

  function togglePreference<K extends keyof AccessibilityPreferences>(key: K) {
    setStatusMessage(null)
    setFormError(null)
    const next = { ...effectivePreferences, [key]: !effectivePreferences[key] }
    setPreferencesOverride(next)
    updateAccessibilityMutation.mutate({ [key]: next[key] })
  }

  function updateFocusRingStyle(value: string) {
    setStatusMessage(null)
    setFormError(null)
    const next = { ...effectivePreferences, focusRingStyle: value }
    setPreferencesOverride(next)
    updateAccessibilityMutation.mutate({ focusRingStyle: value })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Security & Compliance Center</h2>
      </div>
      <p className="helper-text">
        Monitor standards posture, run compliance jobs, and enforce accessibility controls for
        enterprise readiness.
      </p>

      <div className="compliance-grid">
        <article className="compliance-card">
          <h3>Security & Standards Checklist</h3>
          <ul>
            {standardsChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="compliance-card">
          <h3>Framework Coverage</h3>
          {frameworksQuery.data?.items?.length ? (
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {frameworksQuery.data.items.map((framework) => (
                  <tr key={framework.name}>
                    <td>{framework.name}</td>
                    <td>{framework.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="helper-text">No framework catalog available.</p>
          )}
        </article>
      </div>

      <div className="compliance-grid">
        <article className="compliance-card">
          <h3>Run Compliance Report</h3>
          <label>
            Framework
            <select value={frameworkValue} onChange={(event) => setSelectedFramework(event.target.value)}>
              {(frameworksQuery.data?.items ?? []).map((framework) => (
                <option key={framework.name} value={framework.name}>
                  {framework.name} ({framework.version})
                </option>
              ))}
            </select>
          </label>
          <label>
            Scope (JSON)
            <textarea
              rows={6}
              value={scopeJson}
              onChange={(event) => setScopeJson(event.target.value)}
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            disabled={!tenantId || !frameworkValue || runReportMutation.isPending}
            onClick={() => runReportMutation.mutate()}
          >
            {runReportMutation.isPending ? 'Submitting...' : 'Queue Compliance Report'}
          </button>
        </article>

        <article className="compliance-card">
          <h3>Accessibility & Localization</h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={effectivePreferences.keyboardOnlyMode}
              onChange={() => togglePreference('keyboardOnlyMode')}
            />
            Keyboard-only mode
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={effectivePreferences.highContrastMode}
              onChange={() => togglePreference('highContrastMode')}
            />
            High contrast
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={effectivePreferences.reducedMotion}
              onChange={() => togglePreference('reducedMotion')}
            />
            Reduced motion
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={effectivePreferences.screenReaderOptimized}
              onChange={() => togglePreference('screenReaderOptimized')}
            />
            Screen reader optimization
          </label>

          <label>
            Focus ring style
            <select
              value={effectivePreferences.focusRingStyle}
              onChange={(event) => updateFocusRingStyle(event.target.value)}
            >
              <option value="default">Default</option>
              <option value="thick">Thick</option>
              <option value="subtle">Subtle</option>
            </select>
          </label>

          <label>
            Preferred locale
            <select value={localeValue} onChange={(event) => setSelectedLocale(event.target.value)}>
              {(localesQuery.data?.items ?? []).map((locale) => (
                <option key={locale.locale} value={locale.locale}>
                  {locale.locale} · {locale.language} · {locale.status}
                </option>
              ))}
            </select>
          </label>
          {currentLocaleInfo ? (
            <p className="helper-text">
              Current direction: <strong>{currentLocaleInfo.direction.toUpperCase()}</strong>
            </p>
          ) : null}
        </article>
      </div>

      {formError ? <p className="error">{formError}</p> : null}
      {statusMessage ? <p className="success">{statusMessage}</p> : null}
      {frameworksQuery.error ? (
        <p className="error">{(frameworksQuery.error as Error).message}</p>
      ) : null}
      {localesQuery.error ? <p className="error">{(localesQuery.error as Error).message}</p> : null}
      {accessibilityQuery.error ? (
        <p className="error">{(accessibilityQuery.error as Error).message}</p>
      ) : null}
    </section>
  )
}
