import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createAuthProviderConfig,
  createSyncConnectorConfig,
  getSyncJobStatus,
  listAuthProviderCatalog,
  listAuthProviderConfigs,
  listSyncConnectorCatalog,
  listSyncConnectorConfigs,
  runSyncJob,
  scaffoldCustomConnector,
  searchConnectors,
  updateAuthProviderConfig,
} from '../api'
import type { ConnectorDefinition, Domain } from '../types'
import { uuidSchema } from '../validation'

interface IntegrationsAdminPanelProps {
  token: string
  tenantId: string
  canWrite: boolean
}

const domains: Domain[] = ['IGA', 'IAM', 'PAM', 'SSO']

export function IntegrationsAdminPanel({ token, tenantId, canWrite }: IntegrationsAdminPanelProps) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectorSearchResult, setConnectorSearchResult] = useState<ConnectorDefinition[]>([])
  const [syncJobResult, setSyncJobResult] = useState<Record<string, unknown> | null>(null)

  const [connectorSearchForm, setConnectorSearchForm] = useState({
    domain: 'IAM' as Domain,
    vendor: '',
    product: '',
    productVersion: '',
  })
  const [customScaffoldForm, setCustomScaffoldForm] = useState({
    applicationId: '',
    targetVendorDomain: 'IAM' as Domain,
    schemaJson: '{\n  "fields": ["username", "email"]\n}',
  })
  const [authProviderForm, setAuthProviderForm] = useState({
    providerName: '',
    protocol: 'OIDC',
    metadataJson: '{\n  "issuer": ""\n}',
    claimMappingJson: '{\n  "email": "mail"\n}',
    isPrimary: true,
    isFallback: false,
    loginPolicy: 'always',
  })
  const [updateProviderForm, setUpdateProviderForm] = useState({
    providerConfigId: '',
    status: 'active',
  })
  const [syncConnectorForm, setSyncConnectorForm] = useState({
    sourceCategory: 'iam',
    providerName: '',
    syncMode: 'delta',
    includeObjectsCsv: 'users,groups,applications',
    filterPolicyJson: '{\n  "includeInactive": false\n}',
    credentialProvider: 'vault',
    credentialPath: '',
  })
  const [syncRunForm, setSyncRunForm] = useState({
    connectorId: '',
    runType: 'delta',
    dryRun: false,
    statusJobId: '',
  })

  const authCatalogQuery = useQuery({
    queryKey: ['auth-provider-catalog'],
    queryFn: () => listAuthProviderCatalog(token),
    enabled: Boolean(token),
  })
  const authConfigQuery = useQuery({
    queryKey: ['auth-provider-configs'],
    queryFn: () => listAuthProviderConfigs(token),
    enabled: Boolean(token),
  })
  const syncCatalogQuery = useQuery({
    queryKey: ['sync-connector-catalog'],
    queryFn: () => listSyncConnectorCatalog(token),
    enabled: Boolean(token),
  })
  const syncConfigQuery = useQuery({
    queryKey: ['sync-connector-configs'],
    queryFn: () => listSyncConnectorConfigs(token),
    enabled: Boolean(token),
  })

  const authProviderOptions = useMemo(
    () => authCatalogQuery.data?.items.map((item) => item.providerName) ?? [],
    [authCatalogQuery.data?.items],
  )
  const syncProviderOptions = useMemo(
    () => syncCatalogQuery.data?.items.map((item) => item.providerName) ?? [],
    [syncCatalogQuery.data?.items],
  )

  const searchMutation = useMutation({
    mutationFn: () =>
      searchConnectors(token, {
        domain: connectorSearchForm.domain,
        vendor: connectorSearchForm.vendor.trim(),
        product: connectorSearchForm.product.trim(),
        productVersion: connectorSearchForm.productVersion.trim() || undefined,
      }),
    onSuccess: (response) => {
      setConnectorSearchResult(response.items)
      setMessage(`Found ${response.items.length} connector match(es).`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Connector search failed'),
  })

  const scaffoldMutation = useMutation({
    mutationFn: () =>
      scaffoldCustomConnector(token, {
        applicationId: customScaffoldForm.applicationId.trim(),
        targetVendorDomain: customScaffoldForm.targetVendorDomain,
        schema: JSON.parse(customScaffoldForm.schemaJson) as Record<string, unknown>,
      }),
    onSuccess: (response) => {
      setMessage(`Custom connector scaffolded: ${response.product}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Connector scaffold failed'),
  })

  const authCreateMutation = useMutation({
    mutationFn: () =>
      createAuthProviderConfig(token, {
        tenantId,
        providerName: authProviderForm.providerName.trim(),
        protocol: authProviderForm.protocol.trim(),
        metadata: JSON.parse(authProviderForm.metadataJson) as Record<string, unknown>,
        claimMapping: JSON.parse(authProviderForm.claimMappingJson) as Record<string, unknown>,
        isPrimary: authProviderForm.isPrimary,
        isFallback: authProviderForm.isFallback,
        loginPolicy: authProviderForm.loginPolicy.trim() || 'always',
      }),
    onSuccess: () => {
      setMessage('Auth provider configuration created.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['auth-provider-configs'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create auth provider config'),
  })

  const authUpdateMutation = useMutation({
    mutationFn: () =>
      updateAuthProviderConfig(token, updateProviderForm.providerConfigId.trim(), {
        status: updateProviderForm.status.trim(),
      }),
    onSuccess: () => {
      setMessage('Auth provider configuration updated.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['auth-provider-configs'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update auth provider config'),
  })

  const syncCreateMutation = useMutation({
    mutationFn: () =>
      createSyncConnectorConfig(token, {
        tenantId,
        sourceCategory: syncConnectorForm.sourceCategory.trim(),
        providerName: syncConnectorForm.providerName.trim(),
        syncMode: syncConnectorForm.syncMode.trim(),
        includeObjects: syncConnectorForm.includeObjectsCsv.split(',').map((item) => item.trim()).filter(Boolean),
        filterPolicy: JSON.parse(syncConnectorForm.filterPolicyJson) as Record<string, unknown>,
        credentialReference: syncConnectorForm.credentialPath.trim()
          ? {
              provider: syncConnectorForm.credentialProvider as 'vault' | 'aws_sm' | 'azure_kv' | 'gcp_sm',
              path: syncConnectorForm.credentialPath.trim(),
            }
          : undefined,
      }),
    onSuccess: () => {
      setMessage('Sync connector configuration created.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['sync-connector-configs'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create sync connector config'),
  })

  const syncRunMutation = useMutation({
    mutationFn: () =>
      runSyncJob(token, {
        connectorId: syncRunForm.connectorId.trim(),
        runType: syncRunForm.runType.trim(),
        dryRun: syncRunForm.dryRun,
      }),
    onSuccess: (response) => {
      setSyncJobResult(response as unknown as Record<string, unknown>)
      setMessage(`Sync job ${response.jobId} completed with status ${response.status}.`)
      setError(null)
      setSyncRunForm((current) => ({ ...current, statusJobId: response.jobId }))
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to run sync job'),
  })

  const syncStatusMutation = useMutation({
    mutationFn: () => getSyncJobStatus(token, syncRunForm.statusJobId.trim()),
    onSuccess: (response) => {
      setSyncJobResult(response as unknown as Record<string, unknown>)
      setMessage(`Fetched sync job status: ${response.status}`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to fetch sync job status'),
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
        <h2>Integrations Administration</h2>
      </div>
      <p className="helper-text">
        Manage connectors, auth providers, and sync operations across IAM/IGA/PAM/SSO integrations.
      </p>

      <article className="subpanel">
        <h3>Connector Search & Custom Scaffold</h3>
        <div className="grid two-col">
          <label>
            Domain
            <select
              value={connectorSearchForm.domain}
              onChange={(event) => setConnectorSearchForm((s) => ({ ...s, domain: event.target.value as Domain }))}
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
            <input value={connectorSearchForm.vendor} onChange={(event) => setConnectorSearchForm((s) => ({ ...s, vendor: event.target.value }))} />
          </label>
          <label>
            Product
            <input value={connectorSearchForm.product} onChange={(event) => setConnectorSearchForm((s) => ({ ...s, product: event.target.value }))} />
          </label>
          <label>
            Product version
            <input
              value={connectorSearchForm.productVersion}
              onChange={(event) => setConnectorSearchForm((s) => ({ ...s, productVersion: event.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!connectorSearchForm.vendor.trim() || !connectorSearchForm.product.trim()) {
              setError('Vendor and product are required for connector search.')
              return
            }
            searchMutation.mutate()
          }}
        >
          Search Connectors
        </button>
        {connectorSearchResult.length ? (
          <pre className="json-preview">{JSON.stringify(connectorSearchResult, null, 2)}</pre>
        ) : null}

        <div className="grid two-col">
          <label>
            Application ID
            <input
              value={customScaffoldForm.applicationId}
              onChange={(event) => setCustomScaffoldForm((s) => ({ ...s, applicationId: event.target.value }))}
              placeholder="UUID"
            />
          </label>
          <label>
            Target Domain
            <select
              value={customScaffoldForm.targetVendorDomain}
              onChange={(event) => setCustomScaffoldForm((s) => ({ ...s, targetVendorDomain: event.target.value as Domain }))}
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Schema JSON
          <textarea
            rows={5}
            value={customScaffoldForm.schemaJson}
            onChange={(event) => setCustomScaffoldForm((s) => ({ ...s, schemaJson: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Custom connector scaffold')) return
            if (!uuidSchema.safeParse(customScaffoldForm.applicationId).success) {
              setError('Application ID must be a UUID.')
              return
            }
            scaffoldMutation.mutate()
          }}
        >
          Generate Custom Connector Scaffold
        </button>
      </article>

      <article className="subpanel">
        <h3>Authentication Provider Configuration</h3>
        <p className="helper-text">
          Available providers: {(authProviderOptions.length ? authProviderOptions.join(', ') : 'loading...')}
        </p>
        <div className="grid two-col">
          <label>
            Provider name
            <input
              list="auth-provider-options"
              value={authProviderForm.providerName}
              onChange={(event) => setAuthProviderForm((s) => ({ ...s, providerName: event.target.value }))}
            />
            <datalist id="auth-provider-options">
              {authProviderOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            Protocol
            <input value={authProviderForm.protocol} onChange={(event) => setAuthProviderForm((s) => ({ ...s, protocol: event.target.value }))} />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={authProviderForm.isPrimary}
              onChange={(event) => setAuthProviderForm((s) => ({ ...s, isPrimary: event.target.checked }))}
            />
            Primary provider
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={authProviderForm.isFallback}
              onChange={(event) => setAuthProviderForm((s) => ({ ...s, isFallback: event.target.checked }))}
            />
            Fallback provider
          </label>
        </div>
        <label>
          Metadata JSON
          <textarea
            rows={4}
            value={authProviderForm.metadataJson}
            onChange={(event) => setAuthProviderForm((s) => ({ ...s, metadataJson: event.target.value }))}
          />
        </label>
        <label>
          Claim Mapping JSON
          <textarea
            rows={4}
            value={authProviderForm.claimMappingJson}
            onChange={(event) => setAuthProviderForm((s) => ({ ...s, claimMappingJson: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Auth provider creation')) return
            if (!authProviderForm.providerName.trim()) {
              setError('Provider name is required.')
              return
            }
            authCreateMutation.mutate()
          }}
        >
          Create Auth Provider Config
        </button>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Provider</th>
                <th>Protocol</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(authConfigQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.providerName}</td>
                  <td>{item.protocol}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid two-col">
          <label>
            Provider Config ID
            <input
              value={updateProviderForm.providerConfigId}
              onChange={(event) => setUpdateProviderForm((s) => ({ ...s, providerConfigId: event.target.value }))}
              placeholder="UUID"
            />
          </label>
          <label>
            Status
            <select
              value={updateProviderForm.status}
              onChange={(event) => setUpdateProviderForm((s) => ({ ...s, status: event.target.value }))}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Auth provider update')) return
            if (!uuidSchema.safeParse(updateProviderForm.providerConfigId).success) {
              setError('Provider config ID must be a UUID.')
              return
            }
            authUpdateMutation.mutate()
          }}
        >
          Update Provider Status
        </button>
      </article>

      <article className="subpanel">
        <h3>Sync Connector Administration</h3>
        <p className="helper-text">
          Sync catalog: {(syncProviderOptions.length ? syncProviderOptions.join(', ') : 'loading...')}
        </p>
        <div className="grid two-col">
          <label>
            Source category
            <input
              value={syncConnectorForm.sourceCategory}
              onChange={(event) => setSyncConnectorForm((s) => ({ ...s, sourceCategory: event.target.value }))}
            />
          </label>
          <label>
            Provider name
            <input
              list="sync-provider-options"
              value={syncConnectorForm.providerName}
              onChange={(event) => setSyncConnectorForm((s) => ({ ...s, providerName: event.target.value }))}
            />
            <datalist id="sync-provider-options">
              {syncProviderOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            Sync mode
            <input value={syncConnectorForm.syncMode} onChange={(event) => setSyncConnectorForm((s) => ({ ...s, syncMode: event.target.value }))} />
          </label>
          <label>
            Include objects (CSV)
            <input
              value={syncConnectorForm.includeObjectsCsv}
              onChange={(event) => setSyncConnectorForm((s) => ({ ...s, includeObjectsCsv: event.target.value }))}
            />
          </label>
          <label>
            Credential provider
            <select
              value={syncConnectorForm.credentialProvider}
              onChange={(event) => setSyncConnectorForm((s) => ({ ...s, credentialProvider: event.target.value }))}
            >
              <option value="vault">vault</option>
              <option value="aws_sm">aws_sm</option>
              <option value="azure_kv">azure_kv</option>
              <option value="gcp_sm">gcp_sm</option>
            </select>
          </label>
          <label>
            Credential path
            <input
              value={syncConnectorForm.credentialPath}
              onChange={(event) => setSyncConnectorForm((s) => ({ ...s, credentialPath: event.target.value }))}
            />
          </label>
        </div>
        <label>
          Filter policy JSON
          <textarea
            rows={4}
            value={syncConnectorForm.filterPolicyJson}
            onChange={(event) => setSyncConnectorForm((s) => ({ ...s, filterPolicyJson: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!ensureWritable('Sync connector creation')) return
            if (!syncConnectorForm.providerName.trim()) {
              setError('Sync provider name is required.')
              return
            }
            syncCreateMutation.mutate()
          }}
        >
          Create Sync Connector
        </button>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Provider</th>
                <th>Category</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(syncConfigQuery.data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.providerName}</td>
                  <td>{item.sourceCategory}</td>
                  <td>{item.syncMode}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid two-col">
          <label>
            Connector ID
            <input
              value={syncRunForm.connectorId}
              onChange={(event) => setSyncRunForm((s) => ({ ...s, connectorId: event.target.value }))}
              placeholder="UUID"
            />
          </label>
          <label>
            Run type
            <input value={syncRunForm.runType} onChange={(event) => setSyncRunForm((s) => ({ ...s, runType: event.target.value }))} />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={syncRunForm.dryRun}
              onChange={(event) => setSyncRunForm((s) => ({ ...s, dryRun: event.target.checked }))}
            />
            Dry run
          </label>
          <label>
            Job ID for status lookup
            <input
              value={syncRunForm.statusJobId}
              onChange={(event) => setSyncRunForm((s) => ({ ...s, statusJobId: event.target.value }))}
              placeholder="UUID"
            />
          </label>
        </div>
        <div className="row">
          <button
            type="button"
            onClick={() => {
              if (!ensureWritable('Sync job run')) return
              if (!uuidSchema.safeParse(syncRunForm.connectorId).success) {
                setError('Connector ID must be a UUID.')
                return
              }
              syncRunMutation.mutate()
            }}
          >
            Run Sync Job
          </button>
          <button
            type="button"
            onClick={() => {
              if (!syncRunForm.statusJobId.trim()) {
                setError('Job ID is required to check status.')
                return
              }
              syncStatusMutation.mutate()
            }}
          >
            Get Sync Job Status
          </button>
        </div>
        {syncJobResult ? <pre className="json-preview">{JSON.stringify(syncJobResult, null, 2)}</pre> : null}
      </article>

      {authCatalogQuery.error ? <p className="error">{(authCatalogQuery.error as Error).message}</p> : null}
      {authConfigQuery.error ? <p className="error">{(authConfigQuery.error as Error).message}</p> : null}
      {syncCatalogQuery.error ? <p className="error">{(syncCatalogQuery.error as Error).message}</p> : null}
      {syncConfigQuery.error ? <p className="error">{(syncConfigQuery.error as Error).message}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
