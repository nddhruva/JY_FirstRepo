import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'

import { getBranding, saveBranding, uploadBrandingAsset } from '../api'
import { validateAssetFile } from '../security'
import type { BrandingConfig } from '../types'
import { brandingUrlSchema, firstValidationError } from '../validation'

interface ThemeEditorProps {
  token: string
  tenantId: string
  onThemeUpdated: (theme: BrandingConfig) => void
}

const defaultPalette: Record<string, string> = {
  primary: '#304ffe',
  secondary: '#00c853',
  accent: '#aa3bff',
  surface: '#ffffff',
  text: '#101828',
}

const defaultFonts: Record<string, string> = {
  primary: 'Inter, system-ui, sans-serif',
  heading: 'Poppins, Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, ui-monospace, monospace',
}

export function ThemeEditor({ token, tenantId, onThemeUpdated }: ThemeEditorProps) {
  const queryClient = useQueryClient()
  const [assetType, setAssetType] = useState<'logo' | 'font' | 'background' | 'palette' | 'other'>(
    'logo',
  )
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<Partial<BrandingConfig>>({})
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const brandingQuery = useQuery({
    queryKey: ['branding', tenantId],
    queryFn: () => getBranding(token, tenantId),
    enabled: Boolean(token && tenantId),
  })

  const initialConfig = useMemo<BrandingConfig>(() => {
    const current = brandingQuery.data
    return {
      tenantId,
      brandName: current?.brandName ?? '',
      colorPalette: { ...defaultPalette, ...(current?.colorPalette ?? {}) },
      fonts: { ...defaultFonts, ...(current?.fonts ?? {}) },
      logoUrl: current?.logoUrl ?? '',
      backgroundImageUrl: current?.backgroundImageUrl ?? '',
      customCss: current?.customCss ?? '',
      assets: current?.assets ?? {},
    }
  }, [brandingQuery.data, tenantId])

  useEffect(() => {
    onThemeUpdated(initialConfig)
  }, [initialConfig, onThemeUpdated])

  const formState = useMemo<BrandingConfig>(
    () => ({
      ...initialConfig,
      ...draft,
      colorPalette: { ...initialConfig.colorPalette, ...(draft.colorPalette ?? {}) },
      fonts: { ...initialConfig.fonts, ...(draft.fonts ?? {}) },
    }),
    [draft, initialConfig],
  )

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<BrandingConfig>) => saveBranding(token, tenantId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['branding', tenantId], data)
      setDraft({})
      onThemeUpdated(data)
      setSaveMessage('Branding saved successfully.')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!assetFile) throw new Error('Select an asset file first')
      return uploadBrandingAsset(token, tenantId, assetType, assetFile)
    },
    onSuccess: (response) => {
      const updated: Partial<BrandingConfig> = {
        logoUrl: assetType === 'logo' ? response.filePath : formState.logoUrl,
        backgroundImageUrl:
          assetType === 'background' ? response.filePath : formState.backgroundImageUrl,
      }
      setDraft((current) => ({ ...current, ...updated }))
      setAssetFile(null)
      setSaveMessage(`Uploaded ${assetType} asset successfully.`)
    },
  })

  function updatePalette(key: string, value: string) {
    setDraft((current) => ({
      ...current,
      colorPalette: { ...(current.colorPalette ?? {}), [key]: value },
    }))
  }

  function updateFont(key: string, value: string) {
    setDraft((current) => ({
      ...current,
      fonts: { ...(current.fonts ?? {}), [key]: value },
    }))
  }

  async function handleSave() {
    setSaveMessage(null)
    setFormError(null)
    try {
      brandingUrlSchema.parse(formState.logoUrl ?? '')
      brandingUrlSchema.parse(formState.backgroundImageUrl ?? '')
    } catch (error) {
      if (error instanceof ZodError) {
        setFormError(firstValidationError(error))
        return
      }
    }
    await saveMutation.mutateAsync({
      brandName: formState.brandName,
      colorPalette: formState.colorPalette,
      fonts: formState.fonts,
      logoUrl: formState.logoUrl,
      backgroundImageUrl: formState.backgroundImageUrl,
      customCss: formState.customCss,
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Theme Editor</h2>
        <button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
      <p className="helper-text">
        Configure tenant branding (palette, fonts, logos, and backgrounds) to match your enterprise
        standards.
      </p>

      <label>
        Brand Name
        <input
          value={formState.brandName ?? ''}
          onChange={(event) =>
            setDraft((current) => ({ ...current, brandName: event.target.value }))
          }
          placeholder="Acme Identity Onboarding"
        />
      </label>

      <div className="grid two-col">
        {Object.entries(formState.colorPalette).map(([key, value]) => (
          <label key={key}>
            {key}
            <div className="color-input">
              <input
                type="color"
                value={value}
                onChange={(event) => updatePalette(key, event.target.value)}
              />
              <input
                value={value}
                onChange={(event) => updatePalette(key, event.target.value)}
                placeholder="#000000"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="grid two-col">
        {Object.entries(formState.fonts).map(([key, value]) => (
          <label key={key}>
            {key} font stack
            <input value={value} onChange={(event) => updateFont(key, event.target.value)} />
          </label>
        ))}
      </div>

      <div className="grid two-col">
        <label>
          Logo URL
          <input
            value={formState.logoUrl ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, logoUrl: event.target.value }))
            }
            placeholder="https://cdn.example.com/logo.svg"
          />
        </label>
        <label>
          Background Image URL
          <input
            value={formState.backgroundImageUrl ?? ''}
            onChange={(event) =>
              setDraft((current) => ({ ...current, backgroundImageUrl: event.target.value }))
            }
            placeholder="https://cdn.example.com/background.jpg"
          />
        </label>
      </div>

      <label>
        Custom CSS (optional)
        <textarea
          value={formState.customCss ?? ''}
          onChange={(event) =>
            setDraft((current) => ({ ...current, customCss: event.target.value }))
          }
          rows={4}
          placeholder=":root { --brand-radius: 14px; }"
        />
      </label>

      <div className="upload-row">
        <select
          value={assetType}
          onChange={(event) =>
            setAssetType(event.target.value as 'logo' | 'font' | 'background' | 'palette' | 'other')
          }
        >
          <option value="logo">Logo</option>
          <option value="font">Font</option>
          <option value="background">Background</option>
          <option value="palette">Palette</option>
          <option value="other">Other</option>
        </select>
        <input
          type="file"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null
            if (!selected) {
              setAssetFile(null)
              return
            }
            const validationError = validateAssetFile(selected)
            if (validationError) {
              setAssetFile(null)
              setFormError(validationError)
              return
            }
            setSaveMessage(null)
            setFormError(null)
            setAssetFile(selected)
          }}
          aria-label="Upload branding asset"
        />
        <button
          disabled={!assetFile || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Asset'}
        </button>
      </div>

      {brandingQuery.isLoading ? <p className="helper-text">Loading branding...</p> : null}
      {brandingQuery.error ? (
        <p className="error">{(brandingQuery.error as Error).message}</p>
      ) : null}
      {saveMutation.error ? <p className="error">{(saveMutation.error as Error).message}</p> : null}
      {uploadMutation.error ? (
        <p className="error">{(uploadMutation.error as Error).message}</p>
      ) : null}
      {formError ? <p className="error">{formError}</p> : null}
      {saveMessage ? <p className="success">{saveMessage}</p> : null}
    </section>
  )
}
