import type {
  ArticraftCatalogItem,
  ArticraftCatalogResponse,
  ArticraftGeneration,
} from './types'

export const ARTICRAFT_API_BASE = '/api/plugins/articraft'

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function isCatalogItem(value: unknown): value is ArticraftCatalogItem {
  const item = object(value)
  const artifact = object(item?.artifact)
  const attribution = object(item?.attribution)
  return Boolean(
    item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      (item.source === 'articraft-10k' || item.source === 'generated') &&
      artifact &&
      (artifact.format === 'urdf' || artifact.format === 'usdz') &&
      typeof artifact.url === 'string' &&
      Array.isArray(item.dimensions) &&
      item.dimensions.length === 3 &&
      Array.isArray(item.parts) &&
      Array.isArray(item.joints) &&
      object(item.defaultJointValues) &&
      attribution &&
      typeof attribution.creator === 'string' &&
      typeof attribution.license === 'string' &&
      typeof attribution.sourceUrl === 'string',
  )
}

export function parseCatalogResponse(value: unknown): ArticraftCatalogResponse {
  const response = object(value)
  if (
    !response ||
    !Array.isArray(response.items) ||
    !response.items.every(isCatalogItem) ||
    typeof response.page !== 'number' ||
    typeof response.pageSize !== 'number' ||
    typeof response.total !== 'number'
  ) {
    throw new Error('The Articraft catalog returned an invalid response.')
  }
  return response as ArticraftCatalogResponse
}

export async function fetchCatalog(input: {
  query?: string
  page?: number
  pageSize?: number
  signal?: AbortSignal
}): Promise<ArticraftCatalogResponse> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    pageSize: String(input.pageSize ?? 24),
  })
  if (input.query?.trim()) params.set('q', input.query.trim())
  const response = await fetch(`${ARTICRAFT_API_BASE}/catalog?${params}`, {
    signal: input.signal,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = object(payload)?.detail
    throw new Error(typeof detail === 'string' ? detail : `Catalog request failed (${response.status}).`)
  }
  return parseCatalogResponse(payload)
}

export async function createGeneration(form: FormData): Promise<ArticraftGeneration> {
  const response = await fetch(`${ARTICRAFT_API_BASE}/generations`, {
    method: 'POST',
    body: form,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = object(payload)?.detail
    throw new Error(
      typeof detail === 'string' ? detail : `Generation request failed (${response.status}).`,
    )
  }
  return parseGeneration(payload)
}

export async function fetchGeneration(id: string): Promise<ArticraftGeneration> {
  const response = await fetch(`${ARTICRAFT_API_BASE}/generations/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = object(payload)?.detail
    throw new Error(
      typeof detail === 'string' ? detail : `Generation status failed (${response.status}).`,
    )
  }
  return parseGeneration(payload)
}

function parseGeneration(value: unknown): ArticraftGeneration {
  const generation = object(value)
  if (
    !generation ||
    typeof generation.id !== 'string' ||
    !['queued', 'running', 'succeeded', 'failed'].includes(String(generation.status)) ||
    (generation.item !== undefined && !isCatalogItem(generation.item))
  ) {
    throw new Error('The Articraft worker returned an invalid response.')
  }
  return generation as ArticraftGeneration
}
