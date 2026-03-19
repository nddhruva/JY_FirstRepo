import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  assignQuestionnaires,
  createApplication,
  createApplicationInstance,
  executeOnboarding,
  generateOnboardingPlan,
  ingestApplicationData,
  listApplicationInstances,
  listApplications,
} from '../api'
import type { ApplicationModel, Domain, EnvironmentType, ExecutionResponse, OnboardingPlan } from '../types'
import { uuidSchema } from '../validation'

interface OnboardingWorkbenchProps {
  token: string
  tenantId: string
  canWrite: boolean
}

const domains: Domain[] = ['IGA', 'IAM', 'PAM', 'SSO']
const environments: EnvironmentType[] = ['dev', 'test', 'uat', 'stage', 'prod', 'other']

export function OnboardingWorkbench({ token, tenantId, canWrite }: OnboardingWorkbenchProps) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatedPlan, setGeneratedPlan] = useState<OnboardingPlan | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null)

  const [createForm, setCreateForm] = useState({
    name: '',
    businessCriticality: 'medium',
    dataClassification: 'internal',
    domain: 'IAM' as Domain,
    vendor: '',
    product: '',
    instanceName: '',
    environmentType: 'dev' as EnvironmentType,
    endpoint: '',
    region: '',
  })

  const [instanceForm, setInstanceForm] = useState({
    instanceName: '',
    environmentType: 'test' as EnvironmentType,
    endpoint: '',
    region: '',
  })

  const [ingestForm, setIngestForm] = useState({
    sourceType: 'grc_manual',
    payloadJson: '{\n  "owner": "app.owner@example.com"\n}',
  })

  const [questionnaireForm, setQuestionnaireForm] = useState({
    templateIdsCsv: '',
    stakeholderRole: 'ApplicationOwner',
    stakeholderUserId: '',
  })

  const [executeForm, setExecuteForm] = useState({
    targetVendorDomain: 'IAM' as Domain,
    vendor: '',
    product: '',
    connectorId: '',
    secretProvider: 'vault',
    secretPath: '',
  })

  const applicationsQuery = useQuery({
    queryKey: ['applications', tenantId, statusFilter, environmentFilter],
    queryFn: () =>
      listApplications(token, {
        tenantId,
        status: statusFilter || undefined,
        environment: environmentFilter || undefined,
      }),
    enabled: Boolean(token && tenantId),
  })

  const instancesQuery = useQuery({
    queryKey: ['application-instances', selectedApplicationId],
    queryFn: () => listApplicationInstances(token, selectedApplicationId),
    enabled: Boolean(token && selectedApplicationId),
  })

  const selectedApp = useMemo<ApplicationModel | undefined>(
    () => applicationsQuery.data?.items.find((item) => item.id === selectedApplicationId),
    [applicationsQuery.data?.items, selectedApplicationId],
  )

  const createMutation = useMutation({
    mutationFn: () =>
      createApplication(token, {
        tenantId,
        name: createForm.name.trim(),
        businessCriticality: createForm.businessCriticality,
        dataClassification: createForm.dataClassification,
        targetVendors: [
          {
            domain: createForm.domain,
            vendor: createForm.vendor.trim(),
            product: createForm.product.trim(),
          },
        ],
        instances: createForm.instanceName.trim()
          ? [
              {
                instanceName: createForm.instanceName.trim(),
                environmentType: createForm.environmentType,
                endpoint: createForm.endpoint.trim() || undefined,
                region: createForm.region.trim() || undefined,
              },
            ]
          : [],
      }),
    onSuccess: (app) => {
      setMessage(`Application created: ${app.name}`)
      setError(null)
      setSelectedApplicationId(app.id)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create application'),
  })

  const instanceMutation = useMutation({
    mutationFn: () =>
      createApplicationInstance(token, selectedApplicationId, {
        instanceName: instanceForm.instanceName.trim(),
        environmentType: instanceForm.environmentType,
        endpoint: instanceForm.endpoint.trim() || undefined,
        region: instanceForm.region.trim() || undefined,
      }),
    onSuccess: () => {
      setMessage('Application instance created.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['application-instances', selectedApplicationId] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create instance'),
  })

  const ingestMutation = useMutation({
    mutationFn: () => {
      const payload = JSON.parse(ingestForm.payloadJson) as Record<string, unknown>
      return ingestApplicationData(token, selectedApplicationId, {
        sourceType: ingestForm.sourceType,
        payload,
      })
    },
    onSuccess: () => {
      setMessage('Application data ingest accepted.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to ingest data'),
  })

  const questionnaireMutation = useMutation({
    mutationFn: () => {
      const templateIds = questionnaireForm.templateIdsCsv
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      for (const templateId of templateIds) {
        if (!uuidSchema.safeParse(templateId).success) {
          throw new Error(`Invalid template ID: ${templateId}`)
        }
      }
      if (!uuidSchema.safeParse(questionnaireForm.stakeholderUserId).success) {
        throw new Error('Stakeholder user ID must be a UUID.')
      }
      return assignQuestionnaires(token, selectedApplicationId, {
        templateIds,
        stakeholders: [
          {
            role: questionnaireForm.stakeholderRole,
            userId: questionnaireForm.stakeholderUserId.trim(),
          },
        ],
      })
    },
    onSuccess: (response) => {
      setMessage(`Assigned ${response.assignments.length} questionnaire(s).`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to assign questionnaires'),
  })

  const planMutation = useMutation({
    mutationFn: () => generateOnboardingPlan(token, selectedApplicationId),
    onSuccess: (plan) => {
      setGeneratedPlan(plan)
      setMessage('Onboarding plan generated.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to generate onboarding plan'),
  })

  const executeMutation = useMutation({
    mutationFn: () =>
      executeOnboarding(token, selectedApplicationId, {
        targetVendorDomain: executeForm.targetVendorDomain,
        vendor: executeForm.vendor.trim(),
        product: executeForm.product.trim(),
        connectorId: executeForm.connectorId.trim() || undefined,
        secretReferences: executeForm.secretPath.trim()
          ? [{ provider: executeForm.secretProvider as 'vault' | 'aws_sm' | 'azure_kv' | 'gcp_sm', path: executeForm.secretPath.trim() }]
          : [],
      }),
    onSuccess: (response) => {
      setExecutionResult(response)
      setMessage(`Execution queued: ${response.executionId}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to execute onboarding'),
  })

  function ensureWritable(action: string): boolean {
    if (!canWrite) {
      setError(`${action} requires write permissions for your role.`)
      return false
    }
    return true
  }

  function selectedRequired(action: string): boolean {
    if (!selectedApplicationId) {
      setError(`Select an application before ${action}.`)
      return false
    }
    return true
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Onboarding Workbench</h2>
      </div>
      <p className="helper-text">
        End-to-end onboarding operations: create applications, manage instances, ingest context, assign questionnaires, and execute onboarding.
      </p>

      <article className="subpanel">
        <h3>Create Application</h3>
        <div className="grid two-col">
          <label>
            Application name
            <input value={createForm.name} onChange={(event) => setCreateForm((s) => ({ ...s, name: event.target.value }))} />
          </label>
          <label>
            Business criticality
            <input
              value={createForm.businessCriticality}
              onChange={(event) => setCreateForm((s) => ({ ...s, businessCriticality: event.target.value }))}
            />
          </label>
          <label>
            Data classification
            <input
              value={createForm.dataClassification}
              onChange={(event) => setCreateForm((s) => ({ ...s, dataClassification: event.target.value }))}
            />
          </label>
          <label>
            Domain
            <select
              value={createForm.domain}
              onChange={(event) => setCreateForm((s) => ({ ...s, domain: event.target.value as Domain }))}
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vendor
            <input value={createForm.vendor} onChange={(event) => setCreateForm((s) => ({ ...s, vendor: event.target.value }))} />
          </label>
          <label>
            Product
            <input value={createForm.product} onChange={(event) => setCreateForm((s) => ({ ...s, product: event.target.value }))} />
          </label>
        </div>

        <p className="helper-text">Optional initial instance</p>
        <div className="grid two-col">
          <label>
            Instance name
            <input
              value={createForm.instanceName}
              onChange={(event) => setCreateForm((s) => ({ ...s, instanceName: event.target.value }))}
            />
          </label>
          <label>
            Environment
            <select
              value={createForm.environmentType}
              onChange={(event) => setCreateForm((s) => ({ ...s, environmentType: event.target.value as EnvironmentType }))}
            >
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </label>
          <label>
            Endpoint
            <input value={createForm.endpoint} onChange={(event) => setCreateForm((s) => ({ ...s, endpoint: event.target.value }))} />
          </label>
          <label>
            Region
            <input value={createForm.region} onChange={(event) => setCreateForm((s) => ({ ...s, region: event.target.value }))} />
          </label>
        </div>
        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => {
            if (!ensureWritable('Application creation')) return
            if (!createForm.name.trim() || !createForm.vendor.trim() || !createForm.product.trim()) {
              setError('Name, vendor, and product are required.')
              return
            }
            createMutation.mutate()
          }}
        >
          {createMutation.isPending ? 'Creating...' : 'Create Application'}
        </button>
      </article>

      <article className="subpanel">
        <h3>Application Catalog</h3>
        <div className="grid two-col">
          <label>
            Filter status
            <input value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="draft / completed" />
          </label>
          <label>
            Filter environment
            <select value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)}>
              <option value="">All</option>
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Classification</th>
                <th>Criticality</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(applicationsQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                  <td>{item.dataClassification}</td>
                  <td>{item.businessCriticality}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedApplicationId(item.id)}>
                      {selectedApplicationId === item.id ? 'Selected' : 'Select'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {selectedApp ? (
        <article className="subpanel">
          <h3>Selected Application: {selectedApp.name}</h3>
          <div className="grid two-col">
            <label>
              Instance name
              <input
                value={instanceForm.instanceName}
                onChange={(event) => setInstanceForm((s) => ({ ...s, instanceName: event.target.value }))}
              />
            </label>
            <label>
              Environment
              <select
                value={instanceForm.environmentType}
                onChange={(event) => setInstanceForm((s) => ({ ...s, environmentType: event.target.value as EnvironmentType }))}
              >
                {environments.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Endpoint
              <input value={instanceForm.endpoint} onChange={(event) => setInstanceForm((s) => ({ ...s, endpoint: event.target.value }))} />
            </label>
            <label>
              Region
              <input value={instanceForm.region} onChange={(event) => setInstanceForm((s) => ({ ...s, region: event.target.value }))} />
            </label>
          </div>
          <button
            type="button"
            disabled={instanceMutation.isPending}
            onClick={() => {
              if (!ensureWritable('Instance creation') || !selectedRequired('creating an instance')) return
              if (!instanceForm.instanceName.trim()) {
                setError('Instance name is required.')
                return
              }
              instanceMutation.mutate()
            }}
          >
            {instanceMutation.isPending ? 'Adding...' : 'Add Instance'}
          </button>

          <div className="table-wrap">
            <h4>Instances</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Region</th>
                  <th>Endpoint</th>
                </tr>
              </thead>
              <tbody>
                {(instancesQuery.data?.items ?? []).map((instance) => (
                  <tr key={instance.id}>
                    <td>{instance.instanceName}</td>
                    <td>{instance.environmentType}</td>
                    <td>{instance.status}</td>
                    <td>{instance.region ?? '-'}</td>
                    <td>{instance.endpoint ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid two-col">
            <label>
              Ingest source type
              <input value={ingestForm.sourceType} onChange={(event) => setIngestForm((s) => ({ ...s, sourceType: event.target.value }))} />
            </label>
            <label>
              Questionnaire template IDs (CSV UUID)
              <input
                value={questionnaireForm.templateIdsCsv}
                onChange={(event) => setQuestionnaireForm((s) => ({ ...s, templateIdsCsv: event.target.value }))}
              />
            </label>
            <label>
              Stakeholder role
              <input
                value={questionnaireForm.stakeholderRole}
                onChange={(event) => setQuestionnaireForm((s) => ({ ...s, stakeholderRole: event.target.value }))}
              />
            </label>
            <label>
              Stakeholder user ID
              <input
                value={questionnaireForm.stakeholderUserId}
                onChange={(event) => setQuestionnaireForm((s) => ({ ...s, stakeholderUserId: event.target.value }))}
              />
            </label>
          </div>
          <label>
            Ingest payload JSON
            <textarea
              rows={5}
              value={ingestForm.payloadJson}
              onChange={(event) => setIngestForm((s) => ({ ...s, payloadJson: event.target.value }))}
            />
          </label>

          <div className="row">
            <button
              type="button"
              onClick={() => {
                if (!ensureWritable('Data ingestion') || !selectedRequired('ingesting application data')) return
                ingestMutation.mutate()
              }}
            >
              Ingest Data
            </button>
            <button
              type="button"
              onClick={() => {
                if (!ensureWritable('Questionnaire assignment') || !selectedRequired('assigning questionnaires')) return
                questionnaireMutation.mutate()
              }}
            >
              Assign Questionnaires
            </button>
          </div>

          <h4>Onboarding Plan & Execute</h4>
          <div className="grid two-col">
            <label>
              Target domain
              <select
                value={executeForm.targetVendorDomain}
                onChange={(event) => setExecuteForm((s) => ({ ...s, targetVendorDomain: event.target.value as Domain }))}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vendor
              <input value={executeForm.vendor} onChange={(event) => setExecuteForm((s) => ({ ...s, vendor: event.target.value }))} />
            </label>
            <label>
              Product
              <input value={executeForm.product} onChange={(event) => setExecuteForm((s) => ({ ...s, product: event.target.value }))} />
            </label>
            <label>
              Connector ID (optional)
              <input
                value={executeForm.connectorId}
                onChange={(event) => setExecuteForm((s) => ({ ...s, connectorId: event.target.value }))}
              />
            </label>
            <label>
              Secret provider
              <select
                value={executeForm.secretProvider}
                onChange={(event) => setExecuteForm((s) => ({ ...s, secretProvider: event.target.value }))}
              >
                <option value="vault">vault</option>
                <option value="aws_sm">aws_sm</option>
                <option value="azure_kv">azure_kv</option>
                <option value="gcp_sm">gcp_sm</option>
              </select>
            </label>
            <label>
              Secret path
              <input
                value={executeForm.secretPath}
                onChange={(event) => setExecuteForm((s) => ({ ...s, secretPath: event.target.value }))}
              />
            </label>
          </div>
          <div className="row">
            <button
              type="button"
              onClick={() => {
                if (!selectedRequired('generating onboarding plan')) return
                planMutation.mutate()
              }}
            >
              Generate Plan
            </button>
            <button
              type="button"
              onClick={() => {
                if (!ensureWritable('Onboarding execution') || !selectedRequired('executing onboarding')) return
                if (!executeForm.vendor.trim() || !executeForm.product.trim()) {
                  setError('Vendor and product are required to execute onboarding.')
                  return
                }
                executeMutation.mutate()
              }}
            >
              Execute Onboarding
            </button>
          </div>

          {generatedPlan ? (
            <pre className="json-preview">{JSON.stringify(generatedPlan, null, 2)}</pre>
          ) : null}
          {executionResult ? (
            <pre className="json-preview">{JSON.stringify(executionResult, null, 2)}</pre>
          ) : null}
        </article>
      ) : null}

      {applicationsQuery.isLoading ? <p className="helper-text">Loading applications...</p> : null}
      {applicationsQuery.error ? (
        <p className="error">{(applicationsQuery.error as Error).message}</p>
      ) : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
