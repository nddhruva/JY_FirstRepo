import { z } from 'zod'

import type { JwtSessionPayload } from './types'

const JWT_PAYLOAD_SCHEMA = z.object({
  sub: z.string(),
  username: z.string(),
  tenant_id: z.string().nullable().optional(),
  roles: z.array(z.string()).default([]),
  iat: z.number(),
  exp: z.number(),
})

const FORBIDDEN_SQL_TOKENS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'grant',
  'revoke',
  'truncate',
  'attach',
  'detach',
  'pragma',
]

const SAFE_SQL_TABLES = [
  'applications',
  'application_instances',
  'executions',
  'sync_jobs',
  'provider_access_requests',
  'compliance_reports',
]

const allowedAssetExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.json',
])

const MAX_ASSET_BYTES = 5 * 1024 * 1024

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return atob(padded)
}

export function parseJwtSession(token: string): JwtSessionPayload | null {
  if (!token.includes('.')) return null
  const segments = token.split('.')
  if (segments.length !== 3 || !segments[1]) return null
  try {
    const payload = JSON.parse(base64UrlDecode(segments[1])) as unknown
    return JWT_PAYLOAD_SCHEMA.parse(payload)
  } catch {
    return null
  }
}

export function tokenExpiresInSeconds(payload: JwtSessionPayload | null): number | null {
  if (!payload) return null
  const nowSeconds = Math.floor(Date.now() / 1000)
  return payload.exp - nowSeconds
}

export function validateSafeSqlClient(sqlQuery: string): string | null {
  const query = sqlQuery.trim()
  if (!query) return 'SQL query is required.'
  const normalized = query.replace(/\s+/g, ' ').toLowerCase()
  if (!normalized.startsWith('select ')) return 'Only SELECT queries are allowed.'
  if (normalized.includes(';') || normalized.includes('--') || normalized.includes('/*')) {
    return 'Unsafe SQL constructs are not allowed.'
  }
  if (FORBIDDEN_SQL_TOKENS.some((token) => normalized.includes(token))) {
    return 'Unsafe SQL keyword detected.'
  }
  const hasAllowedTable = SAFE_SQL_TABLES.some((table) => normalized.includes(` ${table}`))
  if (!hasAllowedTable) return 'Query must target approved reporting tables.'
  return null
}

export function validateAssetFile(file: File): string | null {
  const extensionIndex = file.name.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : ''
  if (!allowedAssetExtensions.has(extension)) {
    return `Unsupported file extension: ${extension || 'none'}`
  }
  if (file.size <= 0) return 'Empty file upload is not allowed.'
  if (file.size > MAX_ASSET_BYTES) return 'File exceeds 5 MB size limit.'
  return null
}
