import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  createWorkflowTemplate,
  decideProviderAccess,
  exportConfiguration,
  getSupportedLocales,
  getTranslationBundle,
  requestProviderAccess,
  upsertQuestionnaireTemplate,
} from '../api'
import type { TranslationBundle } from '../types'
import { uuidSchema } from '../validation'

interface GovernanceConfigCenterProps {
  token: string
  tenantId: string
  userId?: string
  canWrite: boolean
}

export function GovernanceConfigCenter({ token, tenantId, userId, canWrite }: GovernanceConfigCenterProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [translationResult, setTranslationResult] = useState<TranslationBundle | null>(null)

  const [exportForm, setExportForm] = useState({
    appIdsCsv: '',
    destinationType: 'git',
    destinationUrl: '',
    branch: 'main',
    includeEnvironments: true,
  })
  const [providerRequestForm, setProviderRequestForm] = useState({
    purpose: '',
    allowedDataScopeCsv: 'application_metadata',
    expiresAt: '',
  })
  const [providerDecisionForm, setProviderDecisionForm] = useState({
    requestId: '',
    decision: 'approved',
    reason: '',
  })
  const [questionnaireTemplateForm, setQuestionnaireTemplateForm] = useState({
    id: '',
    version: 1,
    name: '',
    sectionsJson: '[{"title":"General","questions":[]}]',
  })
  const [workflowTemplateForm, setWorkflowTemplateForm] = useState({
    id: '',
    version: 1,
    name: '',
    nodesJson: '[{"id":"start","type":"start"}]',
    transitionsJson: '[{"from":"start","to":"end"}]',
  })
  const [translationForm, setTranslationForm] = useState({
    namespace: 'common',
    locale: 'en-US',
  })

  const localesQuery = useQuery({
    queryKey: ['supported-locales-governance'],
    queryFn: () => getSupportedLocales(token),
    enabled: Boolean(token),
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      exportConfiguration(token, {
        tenantId,
        applicationIds: exportForm.appIdsCsv
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        destination: {
          type: exportForm.destinationType,
          url: exportForm.destinationUrl.trim(),
          branch: exportForm.branch.trim() || undefined,
        },
        includeEnvironments: exportForm.includeEnvironments,
      }),
    onSuccess: () => {
      setMessage('Configuration export queued.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to queue export'),
  })

  const providerRequestMutation = useMutation({
    mutationFn: () =>
      requestProviderAccess(token, {
        id: crypto.randomUUID(),
        tenantId,
        requestedBy: userId,
        purpose: providerRequestForm.purpose.trim(),
        allowedDataScope: providerRequestForm.allowedDataScopeCsv
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        expiresAt: providerRequestForm.expiresAt
          ? new Date(providerRequestForm.expiresAt).toISOString()
          : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        status: 'pending',
      }),
    onSuccess: (response) => {
      setMessage(`Provider access request submitted: ${response.id}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to request provider access'),
  })

  const providerDecisionMutation = useMutation({
    mutationFn: () =>
      decideProviderAccess(token, {
        requestId: providerDecisionForm.requestId.trim(),
        decision: providerDecisionForm.decision,
        decidedBy: userId ?? crypto.randomUUID(),
        reason: providerDecisionForm.reason.trim() || undefined,
      }),
    onSuccess: (response) => {
      setMessage(`Provider access decision saved: ${response.decision}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save provider access decision'),
  })

  const questionnaireMutation = useMutation({
    mutationFn: () =>
      upsertQuestionnaireTemplate(token, {
        id: questionnaireTemplateForm.id.trim() || crypto.randomUUID(),
        version: Number(questionnaireTemplateForm.version) || 1,
        name: questionnaireTemplateForm.name.trim(),
        sections: JSON.parse(questionnaireTemplateForm.sectionsJson) as Array<Record<string, unknown>>,
      }),
    onSuccess: (response) => {
      setMessage(`Questionnaire template upserted: ${response.name}`)
      setError(null)
      setQuestionnaireTemplateForm((current) => ({ ...current, id: response.id }))
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save questionnaire template'),
  })

  const workflowMutation = useMutation({
    mutationFn: () =>
      createWorkflowTemplate(token, {
        id: workflowTemplateForm.id.trim() || crypto.randomUUID(),
        version: Number(workflowTemplateForm.version) || 1,
        name: workflowTemplateForm.name.trim(),
        nodes: JSON.parse(workflowTemplateForm.nodesJson) as Array<Record<string, unknown>>,
        transitions: JSON.parse(workflowTemplateForm.transitionsJson) as Array<Record<string, unknown>>,
      }),
    onSuccess: (response) => {
      setMessage(`Workflow template created: ${response.name}`)
      setError(null)
      setWorkflowTemplateForm((current) => ({ ...current, id: response.id }))
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create workflow template'),
  })

  const translationMutation = useMutation({
    mutationFn: () =>
      getTranslationBundle(token, translationForm.namespace.trim(), translationForm.locale.trim()),
    onSuccess: (response) => {
      setTranslationResult(response)
      setMessage(`Loaded ${translationForm.namespace} translations for ${translationForm.locale}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to fetch translation bundle'),
  })

  function ensureWritable(action: string): boolean {
    if (!canWrite) {
      setError(`${action} requires write permissions for your role.`)
      return false
    }
    return true
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Governance, Settings & Configuration</h2>
      </div>
      <p className="helper-text">
        Administrative controls for exports, provider consent, questionnaire/workflow templates, and localization support.
      </p>

      <article className="subpanel">
        <h3>Configuration Export</h3>
        <div className="grid two-col">
          <label>
            Application IDs (CSV UUID)
            <input
              value={exportForm.appIdsCsv}
              onChange={(event) => setExportForm((s) => ({ ...s, appIdsCsv: event.target.value }))}
            />
          </label>
          <label>
            Destination type
            <input
              value={exportForm.destinationType}
              onChange={(event) => setExportForm((s) => ({ ...s, destinationType: event.target.value }))}
            />
          </label>
          <label>
            Destination URL
            <input
              value={exportForm.destinationUrl}
              onChange={(event) => setExportForm((s) => ({ ...s, destinationUrl: event.target.value }))}
            />
          </label>
          <label>
            Branch
            <input value={exportForm.branch} onChange={(event) => setExportForm((s) => ({ ...s, branch: event.target.value }))} />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={exportForm.includeEnvironments}
              onChange={(event) => setExportForm((s) => ({ ...s, includeEnvironments: event.target.checked }))}
            />
            Include environment instances
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Configuration export')) return
            if (!exportForm.destinationUrl.trim()) {
              setError('Destination URL is required.')
              return
            }
            exportMutation.mutate()
          }}
        >
          Queue Export
        </button>
      </article>

      <article className="subpanel">
        <h3>Provider Consent Management</h3>
        <div className="grid two-col">
          <label>
            Purpose
            <input
              value={providerRequestForm.purpose}
              onChange={(event) => setProviderRequestForm((s) => ({ ...s, purpose: event.target.value }))}
            />
          </label>
          <label>
            Allowed data scope (CSV)
            <input
              value={providerRequestForm.allowedDataScopeCsv}
              onChange={(event) => setProviderRequestForm((s) => ({ ...s, allowedDataScopeCsv: event.target.value }))}
            />
          </label>
          <label>
            Expires at
            <input
              type="datetime-local"
              value={providerRequestForm.expiresAt}
              onChange={(event) => setProviderRequestForm((s) => ({ ...s, expiresAt: event.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Provider access request')) return
            if (!providerRequestForm.purpose.trim()) {
              setError('Purpose is required.')
              return
            }
            providerRequestMutation.mutate()
          }}
        >
          Submit Provider Access Request
        </button>

        <div className="grid two-col">
          <label>
            Access request ID
            <input
              value={providerDecisionForm.requestId}
              onChange={(event) => setProviderDecisionForm((s) => ({ ...s, requestId: event.target.value }))}
            />
          </label>
          <label>
            Decision
            <select
              value={providerDecisionForm.decision}
              onChange={(event) => setProviderDecisionForm((s) => ({ ...s, decision: event.target.value }))}
            >
              <option value="approved">approved</option>
              <option value="denied">denied</option>
            </select>
          </label>
          <label>
            Reason
            <input
              value={providerDecisionForm.reason}
              onChange={(event) => setProviderDecisionForm((s) => ({ ...s, reason: event.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Provider decision')) return
            if (!uuidSchema.safeParse(providerDecisionForm.requestId).success) {
              setError('Request ID must be a UUID.')
              return
            }
            providerDecisionMutation.mutate()
          }}
        >
          Save Provider Access Decision
        </button>
      </article>

      <article className="subpanel">
        <h3>Template Configuration Studio</h3>
        <div className="grid two-col">
          <label>
            Questionnaire template ID (optional)
            <input
              value={questionnaireTemplateForm.id}
              onChange={(event) => setQuestionnaireTemplateForm((s) => ({ ...s, id: event.target.value }))}
            />
          </label>
          <label>
            Questionnaire version
            <input
              type="number"
              value={questionnaireTemplateForm.version}
              onChange={(event) =>
                setQuestionnaireTemplateForm((s) => ({ ...s, version: Number(event.target.value) || 1 }))
              }
            />
          </label>
          <label>
            Questionnaire name
            <input
              value={questionnaireTemplateForm.name}
              onChange={(event) => setQuestionnaireTemplateForm((s) => ({ ...s, name: event.target.value }))}
            />
          </label>
        </div>
        <label>
          Sections JSON
          <textarea
            rows={4}
            value={questionnaireTemplateForm.sectionsJson}
            onChange={(event) => setQuestionnaireTemplateForm((s) => ({ ...s, sectionsJson: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Questionnaire template update')) return
            if (!questionnaireTemplateForm.name.trim()) {
              setError('Questionnaire template name is required.')
              return
            }
            questionnaireMutation.mutate()
          }}
        >
          Save Questionnaire Template
        </button>

        <div className="grid two-col">
          <label>
            Workflow template ID (optional)
            <input
              value={workflowTemplateForm.id}
              onChange={(event) => setWorkflowTemplateForm((s) => ({ ...s, id: event.target.value }))}
            />
          </label>
          <label>
            Workflow version
            <input
              type="number"
              value={workflowTemplateForm.version}
              onChange={(event) =>
                setWorkflowTemplateForm((s) => ({ ...s, version: Number(event.target.value) || 1 }))
              }
            />
          </label>
          <label>
            Workflow name
            <input
              value={workflowTemplateForm.name}
              onChange={(event) => setWorkflowTemplateForm((s) => ({ ...s, name: event.target.value }))}
            />
          </label>
        </div>
        <label>
          Nodes JSON
          <textarea
            rows={4}
            value={workflowTemplateForm.nodesJson}
            onChange={(event) => setWorkflowTemplateForm((s) => ({ ...s, nodesJson: event.target.value }))}
          />
        </label>
        <label>
          Transitions JSON
          <textarea
            rows={4}
            value={workflowTemplateForm.transitionsJson}
            onChange={(event) => setWorkflowTemplateForm((s) => ({ ...s, transitionsJson: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Workflow template creation')) return
            if (!workflowTemplateForm.name.trim()) {
              setError('Workflow template name is required.')
              return
            }
            workflowMutation.mutate()
          }}
        >
          Create Workflow Template
        </button>
      </article>

      <article className="subpanel">
        <h3>Localization Viewer</h3>
        <div className="grid two-col">
          <label>
            Namespace
            <input
              value={translationForm.namespace}
              onChange={(event) => setTranslationForm((s) => ({ ...s, namespace: event.target.value }))}
            />
          </label>
          <label>
            Locale
            <select
              value={translationForm.locale}
              onChange={(event) => setTranslationForm((s) => ({ ...s, locale: event.target.value }))}
            >
              {(localesQuery.data?.items ?? []).map((item) => (
                <option key={item.locale} value={item.locale}>
                  {item.locale} · {item.language}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => translationMutation.mutate()}>
          Load Translation Bundle
        </button>
        {translationResult ? (
          <pre className="json-preview">{JSON.stringify(translationResult, null, 2)}</pre>
        ) : null}
      </article>

      {localesQuery.error ? <p className="error">{(localesQuery.error as Error).message}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
