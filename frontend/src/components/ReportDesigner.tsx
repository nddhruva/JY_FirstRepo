import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { generateReport, listReports } from '../api'
import type { ReportMode, ReportResult } from '../types'

interface ReportDesignerProps {
  token: string
  tenantId: string
}

interface ReportDraft {
  title: string
  mode: ReportMode
  status: string
  classification: string
  sqlQuery: string
  graphqlQuery: string
  aiPrompt: string
  limit: number
}

const aiPromptSuggestions = [
  'Show me errors and focus areas for this tenant',
  'Summarize progress, completions, and denials by business criticality',
  'Identify applications that need urgent onboarding attention',
]

export function ReportDesigner({ token, tenantId }: ReportDesignerProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ReportDraft>({
    title: 'Custom Operations Report',
    mode: 'filters',
    status: '',
    classification: '',
    sqlQuery: 'SELECT id, name, status, tenant_id FROM applications',
    graphqlQuery: 'query { applications { id name status } }',
    aiPrompt: aiPromptSuggestions[0],
    limit: 100,
  })

  const reportsQuery = useQuery({
    queryKey: ['reports', tenantId],
    queryFn: () => listReports(token, tenantId),
    enabled: Boolean(token && tenantId),
  })

  const reportMutation = useMutation({
    mutationFn: () =>
      generateReport(token, {
        tenantId,
        title: draft.title,
        mode: draft.mode,
        filters: draft.mode === 'filters' ? { status: draft.status, classification: draft.classification } : {},
        sqlQuery: draft.mode === 'sql' ? draft.sqlQuery : undefined,
        graphqlQuery: draft.mode === 'graphql' ? draft.graphqlQuery : undefined,
        aiPrompt: draft.mode === 'ai_prompt' ? draft.aiPrompt : undefined,
        limit: draft.limit,
      }),
    onSuccess: (report) => {
      queryClient.setQueryData<{ items: ReportResult[] }>(['reports', tenantId], (current) => ({
        items: [report, ...(current?.items ?? [])],
      }))
    },
  })

  const latestReport = useMemo<ReportResult | undefined>(() => {
    if (reportMutation.data) return reportMutation.data
    return reportsQuery.data?.items?.[0]
  }, [reportMutation.data, reportsQuery.data?.items])

  const statusCounts = useMemo(() => {
    const rows = latestReport?.data ?? []
    const counts: Record<string, number> = {}
    for (const row of rows) {
      const status = String(row.status ?? 'unknown')
      counts[status] = (counts[status] ?? 0) + 1
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }))
  }, [latestReport?.data])

  function setMode(mode: ReportMode) {
    setDraft((current) => ({ ...current, mode }))
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Report Designer</h2>
        <button disabled={reportMutation.isPending} onClick={() => reportMutation.mutate()}>
          {reportMutation.isPending ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
      <p className="helper-text">
        Generate rich reports using filters, safe SQL, GraphQL query shape, or AI prompt-driven
        mode.
      </p>

      <div className="grid two-col">
        <label>
          Report Title
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          Limit
          <input
            type="number"
            min={1}
            max={500}
            value={draft.limit}
            onChange={(event) =>
              setDraft((current) => ({ ...current, limit: Number(event.target.value) || 100 }))
            }
          />
        </label>
      </div>

      <div className="segmented">
        {(['filters', 'sql', 'graphql', 'ai_prompt'] as ReportMode[]).map((mode) => (
          <button
            key={mode}
            className={mode === draft.mode ? 'active' : ''}
            onClick={() => setMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {draft.mode === 'filters' ? (
        <div className="grid two-col">
          <label>
            Status filter
            <input
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              placeholder="draft / onboarded / completed"
            />
          </label>
          <label>
            Classification filter
            <input
              value={draft.classification}
              onChange={(event) =>
                setDraft((current) => ({ ...current, classification: event.target.value }))
              }
              placeholder="internal / confidential / restricted"
            />
          </label>
        </div>
      ) : null}

      {draft.mode === 'sql' ? (
        <label>
          SQL Query (read-only)
          <textarea
            rows={5}
            value={draft.sqlQuery}
            onChange={(event) => setDraft((current) => ({ ...current, sqlQuery: event.target.value }))}
          />
        </label>
      ) : null}

      {draft.mode === 'graphql' ? (
        <label>
          GraphQL Query
          <textarea
            rows={5}
            value={draft.graphqlQuery}
            onChange={(event) =>
              setDraft((current) => ({ ...current, graphqlQuery: event.target.value }))
            }
          />
        </label>
      ) : null}

      {draft.mode === 'ai_prompt' ? (
        <div>
          <label>
            AI Prompt
            <textarea
              rows={4}
              value={draft.aiPrompt}
              onChange={(event) => setDraft((current) => ({ ...current, aiPrompt: event.target.value }))}
            />
          </label>
          <div className="suggestions">
            {aiPromptSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, aiPrompt: prompt }))}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="report-layout">
        <article className="report-summary">
          <h3>Latest Report Summary</h3>
          {latestReport ? (
            <>
              <p>
                <strong>{latestReport.title}</strong> · {latestReport.mode}
              </p>
              <p>{latestReport.summary}</p>
              <p className="helper-text">{new Date(latestReport.generatedAt).toLocaleString()}</p>
            </>
          ) : (
            <p className="helper-text">No report generated yet.</p>
          )}
        </article>

        <article className="report-chart">
          <h3>Status Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusCounts}>
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>

      <div className="table-wrap">
        <h3>Report Data</h3>
        {latestReport?.data?.length ? (
          <table>
            <thead>
              <tr>
                {Object.keys(latestReport.data[0]).map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latestReport.data.slice(0, 20).map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, valueIndex) => (
                    <td key={valueIndex}>{String(value ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="helper-text">No row-level data available yet.</p>
        )}
      </div>

      <div className="report-history">
        <h3>Recent Reports</h3>
        <ul>
          {(reportsQuery.data?.items ?? []).slice(0, 8).map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> · {item.mode} · {item.status}
            </li>
          ))}
        </ul>
      </div>

      {reportMutation.error ? (
        <p className="error">{(reportMutation.error as Error).message}</p>
      ) : null}
      {reportsQuery.error ? <p className="error">{(reportsQuery.error as Error).message}</p> : null}
    </section>
  )
}
