import { useState } from 'react'
import { ZodError } from 'zod'

import { createTenant, login } from '../api'
import type { AuthTokenResponse } from '../api'
import { createTenantSchema, firstValidationError, loginSchema, uuidSchema } from '../validation'

interface AuthPanelProps {
  onAuthenticated: (token: string) => void
  tenantId: string
  setTenantId: (value: string) => void
}

export function AuthPanel({ onAuthenticated, tenantId, setTenantId }: AuthPanelProps) {
  const [username, setUsername] = useState('platform_admin')
  const [password, setPassword] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantRegion, setTenantRegion] = useState('us-east-1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      loginSchema.parse({ username, password })
      if (tenantId) {
        uuidSchema.parse(tenantId)
      }
      const tokenResponse: AuthTokenResponse = await login(username, password)
      onAuthenticated(tokenResponse.access_token)
      setSuccess('Authentication successful.')
    } catch (err) {
      if (err instanceof ZodError) {
        setError(firstValidationError(err))
      } else {
        setError(err instanceof Error ? err.message : 'Failed to login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateTenant() {
    if (!tenantName.trim()) {
      setError('Tenant name is required to create a tenant')
      return
    }
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      loginSchema.parse({ username, password })
      createTenantSchema.parse({ name: tenantName.trim(), region: tenantRegion })
      const tokenResponse: AuthTokenResponse = await login(username, password)
      const tenant = await createTenant(tokenResponse.access_token, {
        name: tenantName.trim(),
        region: tenantRegion,
        isolationTier: 'shared',
        defaultLocale: 'en-US',
        supportedLocales: ['en-US'],
      })
      setTenantId(tenant.id)
      onAuthenticated(tokenResponse.access_token)
      setSuccess('Tenant created and session authenticated.')
    } catch (err) {
      if (err instanceof ZodError) {
        setError(firstValidationError(err))
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create tenant')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel auth-panel">
      <h2>Authenticate</h2>
      <p className="helper-text">
        Use a platform admin account, then set or create a tenant to start configuring branding,
        dashboards, and reports.
      </p>

      <div className="grid two-col">
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter platform admin password"
          />
        </label>
      </div>

      <label>
        Existing Tenant ID
        <input
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          placeholder="Paste tenant UUID"
        />
      </label>

      <div className="row">
        <button disabled={isLoading} onClick={handleLogin}>
          {isLoading ? 'Please wait...' : 'Login'}
        </button>
      </div>

      <hr />

      <h3>Create Tenant (Optional)</h3>
      <div className="grid two-col">
        <label>
          Tenant Name
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            placeholder="Acme Corp"
          />
        </label>
        <label>
          Region
          <input
            value={tenantRegion}
            onChange={(event) => setTenantRegion(event.target.value)}
            placeholder="us-east-1"
          />
        </label>
      </div>
      <div className="row">
        <button disabled={isLoading} onClick={handleCreateTenant}>
          {isLoading ? 'Creating...' : 'Create Tenant + Login'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}
    </section>
  )
}
