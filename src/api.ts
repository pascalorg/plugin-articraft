import type {
  ArticraftCatalogItem,
  ArticraftCatalogResponse,
  ArticraftCategory,
  ArticraftGeneration,
  ArticraftProjectImage,
  ArticraftReferenceRender,
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
    !(
      response &&
      Array.isArray(response.categories) &&
      Array.isArray(response.items) &&
      response.items.every(isCatalogItem)
    ) ||
    typeof response.page !== 'number' ||
    typeof response.pageSize !== 'number' ||
    typeof response.total !== 'number'
  ) {
    throw new Error('The Articraft catalog returned an invalid response.')
  }
  return response as ArticraftCatalogResponse
}

export async function fetchCatalog(input: {
  category?: ArticraftCategory
  query?: string
  page?: number
  pageSize?: number
  signal?: AbortSignal
}): Promise<ArticraftCatalogResponse> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    pageSize: String(input.pageSize ?? 24),
  })
  if (input.category) params.set('category', input.category)
  if (input.query?.trim()) params.set('q', input.query.trim())
  const response = await fetch(`${ARTICRAFT_API_BASE}/catalog?${params}`, {
    signal: input.signal,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = object(payload)?.detail
    throw new Error(
      typeof detail === 'string' ? detail : `Catalog request failed (${response.status}).`,
    )
  }
  return parseCatalogResponse(payload)
}

export async function fetchProjectImages(
  projectId: string,
  signal?: AbortSignal,
): Promise<ArticraftProjectImage[]> {
  const response = await fetch(
    `${ARTICRAFT_API_BASE}/files?projectId=${encodeURIComponent(projectId)}`,
    { cache: 'no-store', signal },
  )
  const payload = await response.json().catch(() => null)
  const record = object(payload)
  if (!response.ok) throw new Error(responseError(record, response.status, 'Files request failed'))
  if (!Array.isArray(record?.items)) throw new Error('Pascal Files returned an invalid response.')
  return record.items.flatMap((value) => {
    const item = object(value)
    return item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.url === 'string'
      ? [{ id: item.id, name: item.name, url: item.url }]
      : []
  })
}

export async function createReferenceRender(input: {
  projectId: string
  prompt: string
  sourceUrl?: string
}): Promise<ArticraftReferenceRender> {
  const response = await fetch('/api/ai/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: input.projectId,
      modelId: 'gpt-image-2',
      prompt: input.prompt,
      settings: { aspectRatio: '1:1', quality: 'medium' },
      sources: input.sourceUrl ? [{ type: 'upload', url: input.sourceUrl }] : [],
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(responseError(object(payload), response.status, 'Reference generation failed'))
  }
  return parseReferenceRender(payload)
}

export async function fetchReferenceRender(id: string): Promise<ArticraftReferenceRender> {
  const response = await fetch(`/api/ai/renders/${encodeURIComponent(id)}/status`, {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(responseError(object(payload), response.status, 'Reference status failed'))
  }
  return parseReferenceRender(payload)
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

function parseReferenceRender(value: unknown): ArticraftReferenceRender {
  const render = object(value)
  if (
    !render ||
    typeof render.id !== 'string' ||
    !['pending', 'completed', 'failed'].includes(String(render.status))
  ) {
    throw new Error('GPT Image 2 returned an invalid response.')
  }
  return {
    id: render.id,
    status: render.status as ArticraftReferenceRender['status'],
    ...(typeof render.image_url === 'string' ? { imageUrl: render.image_url } : {}),
    ...(typeof render.error_text === 'string' ? { errorText: render.error_text } : {}),
    ...(typeof render.queue_position === 'number' || render.queue_position === null
      ? { queuePosition: render.queue_position }
      : {}),
  }
}

function responseError(
  value: Record<string, unknown> | null,
  status: number,
  fallback: string,
): string {
  const detail = value?.detail ?? value?.error
  return typeof detail === 'string' ? detail : `${fallback} (${status}).`
}
