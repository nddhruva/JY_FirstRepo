import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import {
  generateReport,
  getBranding,
  getComplianceFrameworks,
  getDashboardAnalytics,
  listApplications,
  listAuthProviderConfigs,
  listReports,
  listSyncConnectorConfigs,
  runComplianceReport,
} from '../api'

interface DemoPresentationCenterProps {
  token: string
  tenantId: string
  canWrite: boolean
}

const personaCredentials = [
  { role: 'Platform Admin', username: 'platform_admin' },
  { role: 'Tenant Admin', username: 'tenant_admin_northstar' },
  { role: 'Application Owner', username: 'app_owner_payments' },
  { role: 'Integration Admin', username: 'integration_admin_northstar' },
  { role: 'Compliance Admin', username: 'compliance_admin_northstar' },
  { role: 'Auditor', username: 'auditor_northstar' },
]

const demoNarrative = [
  'Start as Tenant Admin: show branding, dashboard analytics, and onboarding status mix.',
  'Switch to App Owner: demonstrate application onboarding planning and execution handoff.',
  'Switch to Integration Admin: demonstrate connector strategy, IdP config, and sync jobs.',
  'Switch to Compliance Admin: run compliance report and review report designer outputs.',
  'Switch to Auditor: read-only experience with reports and compliance visibility.',
]

export function DemoPresentationCenter({ token, tenantId, canWrite }: DemoPresentationCenterProps) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applicationsQuery = useQuery({
    queryKey: ['demo-applications', tenantId],
    queryFn: () => listApplications(token, { tenantId }),
    enabled: Boolean(token && tenantId),
  })
  const analyticsQuery = useQuery({
    queryKey: ['demo-analytics', tenantId],
    queryFn: () => getDashboardAnalytics(token, tenantId),
    enabled: Boolean(token && tenantId),
  })
  const reportsQuery = useQuery({
    queryKey: ['demo-reports', tenantId],
    queryFn: () => listReports(token, tenantId),
    enabled: Boolean(token && tenantId),
  })
  const authConfigsQuery = useQuery({
    queryKey: ['demo-auth-configs'],
    queryFn: () => listAuthProviderConfigs(token),
    enabled: Boolean(token),
  })
  const syncConfigsQuery = useQuery({
    queryKey: ['demo-sync-configs'],
    queryFn: () => listSyncConnectorConfigs(token),
    enabled: Boolean(token),
  })
  const frameworksQuery = useQuery({
    queryKey: ['demo-frameworks'],
    queryFn: () => getComplianceFrameworks(token),
    enabled: Boolean(token),
  })
  const brandingQuery = useQuery({
    queryKey: ['demo-branding', tenantId],
    queryFn: () => getBranding(token, tenantId),
    enabled: Boolean(token && tenantId),
  })

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['demo-applications', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['demo-analytics', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['demo-reports', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['demo-auth-configs'] }),
        queryClient.invalidateQueries({ queryKey: ['demo-sync-configs'] }),
        queryClient.invalidateQueries({ queryKey: ['demo-frameworks'] }),
      ])
    },
    onSuccess: () => {
      setMessage('Demo data refreshed from backend.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to refresh demo data'),
  })

  const generateDemoReportMutation = useMutation({
    mutationFn: () =>
      generateReport(token, {
        tenantId,
        title: 'Demo Presentation Snapshot',
        mode: 'filters',
        filters: {},
        limit: 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-reports', tenantId] })
      setMessage('Demo presentation report generated.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to generate demo report'),
  })

  const runComplianceMutation = useMutation({
    mutationFn: () =>
      runComplianceReport(token, {
        tenantId,
        framework: 'SOC2',
        scope: { includeEvidence: true, window: 'last_90_days' },
      }),
    onSuccess: (response) => {
      setMessage(`Compliance demo run queued: ${response.framework} (${response.reportId})`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to queue compliance demo run'),
  })

  const statusDistribution = useMemo(() => {
    const rows = applicationsQuery.data?.items ?? []
    const counts = new Map<string, number>()
    for (const item of rows) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }))
  }, [applicationsQuery.data?.items])

  const kpiCards = useMemo(
    () => [
      { label: 'Applications', value: applicationsQuery.data?.items.length ?? 0 },
      { label: 'Progress %', value: analyticsQuery.data?.progress ?? 0 },
      { label: 'Reports', value: reportsQuery.data?.items.length ?? 0 },
      { label: 'Auth Providers', value: authConfigsQuery.data?.items.length ?? 0 },
      { label: 'Sync Connectors', value: syncConfigsQuery.data?.items.length ?? 0 },
      { label: 'Compliance Frameworks', value: frameworksQuery.data?.items.length ?? 0 },
    ],
    [
      applicationsQuery.data?.items.length,
      analyticsQuery.data?.progress,
      reportsQuery.data?.items.length,
      authConfigsQuery.data?.items.length,
      syncConfigsQuery.data?.items.length,
      frameworksQuery.data?.items.length,
    ],
  )

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Demo Presentation Center</h2>
        <div className="row">
          <button type="button" onClick={() => refreshMutation.mutate()}>
            Refresh Demo
          </button>
          <button
            type="button"
            disabled={!canWrite || generateDemoReportMutation.isPending}
            onClick={() => {
              if (!canWrite) {
                setError('This action requires write permissions.')
                return
              }
              generateDemoReportMutation.mutate()
            }}
          >
            Generate Demo Report
          </button>
          <button
            type="button"
            disabled={!canWrite || runComplianceMutation.isPending}
            onClick={() => {
              if (!canWrite) {
                setError('This action requires write permissions.')
                return
              }
              runComplianceMutation.mutate()
            }}
          >
            Queue SOC2 Demo Run
          </button>
        </div>
      </div>
      <p className="helper-text">
        Presenter-friendly view of the product state with realistic demo personas and operational metrics.
      </p>

      <article className="subpanel">
        <h3>Tenant Storyline</h3>
        <p className="helper-text">
          Branding: <strong>{brandingQuery.data?.brandName ?? 'Not configured'}</strong> · Tenant ID:{' '}
          <strong>{tenantId}</strong>
        </p>
        <ol className="storyline-list">
          {demoNarrative.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </article>

      <article className="subpanel">
        <h3>Demo Personas</h3>
        <p className="helper-text">Default demo password: <code>DemoPass123!</code></p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {personaCredentials.map((persona) => (
                <tr key={persona.username}>
                  <td>{persona.role}</td>
                  <td>{persona.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="subpanel">
        <h3>KPI Snapshot</h3>
        <div className="demo-kpi-grid">
          {kpiCards.map((card) => (
            <div key={card.label} className="demo-kpi-card">
              <p>{card.label}</p>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="subpanel">
        <h3>Status Distribution</h3>
        <div className="analytics-grid">
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="count" nameKey="status" innerRadius={50} outerRadius={88}>
                  {statusDistribution.map((_, index) => (
                    <Cell
                      key={`status-cell-${index}`}
                      fill={['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusDistribution}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className="subpanel">
        <h3>Recent Reports (Demo)</h3>
        <ul>
          {(reportsQuery.data?.items ?? []).slice(0, 6).map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> · {item.mode} · {new Date(item.generatedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </article>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {applicationsQuery.error ? <p className="error">{(applicationsQuery.error as Error).message}</p> : null}
      {analyticsQuery.error ? <p className="error">{(analyticsQuery.error as Error).message}</p> : null}
      {reportsQuery.error ? <p className="error">{(reportsQuery.error as Error).message}</p> : null}
      {authConfigsQuery.error ? <p className="error">{(authConfigsQuery.error as Error).message}</p> : null}
      {syncConfigsQuery.error ? <p className="error">{(syncConfigsQuery.error as Error).message}</p> : null}
      {frameworksQuery.error ? <p className="error">{(frameworksQuery.error as Error).message}</p> : null}
    </section>
  )
}
