import { z } from 'zod'

export const uuidSchema = z
  .string()
  .uuid('Provide a valid UUID (example: 123e4567-e89b-12d3-a456-426614174000).')

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.').max(128),
  password: z.string().min(1, 'Password is required.').max(256),
})

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Tenant name should be at least 2 characters.').max(255),
  region: z.string().min(2, 'Region is required.').max(128),
})

export const brandingUrlSchema = z.string().url().or(z.literal(''))

export const reportDraftSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(120),
  limit: z.number().int().min(1).max(500),
})

export function firstValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.'
}
