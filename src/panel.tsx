'use client'

import { useScene } from '@pascal-app/core'
import { SegmentedControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  createGeneration,
  createReferenceRender,
  fetchCatalog,
  fetchGeneration,
  fetchProjectImages,
  fetchReferenceRender,
} from './api'
import { useArticraftStore } from './store'
import type {
  ArticraftCatalogItem,
  ArticraftCategory,
  ArticraftGeneration,
  ArticraftProjectImage,
  ArticraftReferenceRender,
} from './types'

type Mode = 'browse' | 'generate'

const ACCENT = '#ff6b3d'
const PAGE_SIZE = 24

const inputStyle: CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--foreground)',
  font: 'inherit',
  fontSize: 12,
  outline: 'none',
  padding: '9px 10px',
  width: '100%',
}

const primaryButton: CSSProperties = {
  alignItems: 'center',
  background: ACCENT,
  border: 0,
  borderRadius: 999,
  color: '#17120f',
  cursor: 'pointer',
  display: 'flex',
  fontSize: 12,
  fontWeight: 700,
  gap: 7,
  justifyContent: 'center',
  padding: '10px 14px',
}

function arm(item: ArticraftCatalogItem) {
  useArticraftStore.getState().setSelectedItem(item)
  ;(useEditor.getState().setTool as (tool: string) => void)('articraft:asset')
  useEditor.getState().setMode('build')
}

export default function ArticraftPanel() {
  const [mode, setMode] = useState<Mode>('browse')
  const count = useScene(
    (state) =>
      Object.values(state.nodes).filter((node) => (node.type as string) === 'articraft:asset')
        .length,
  )

  return (
    <div
      style={{
        color: 'var(--sidebar-foreground)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 13,
          padding: '15px 15px 13px',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 9 }}>
            <div
              aria-hidden
              style={{
                alignItems: 'center',
                background: ACCENT,
                borderRadius: 8,
                color: '#17120f',
                display: 'flex',
                fontSize: 10,
                fontWeight: 900,
                height: 25,
                justifyContent: 'center',
                letterSpacing: '-0.04em',
                width: 25,
              }}
            >
              A10
            </div>
            <div>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Articraft
              </h2>
              <span
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Articulated object library
              </span>
            </div>
          </div>
          <span
            style={{
              background: 'var(--sidebar-accent)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 999,
              color: 'var(--muted-foreground)',
              fontSize: 10,
              padding: '4px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {count} placed
          </span>
        </div>
        <SegmentedControl
          onChange={setMode}
          options={[
            { label: 'Browse', value: 'browse' },
            { label: 'Generate', value: 'generate' },
          ]}
          value={mode}
        />
      </header>

      <div style={{ flex: 1, padding: 15 }}>{mode === 'browse' ? <Catalog /> : <Generate />}</div>

      <footer
        style={{
          borderTop: '1px solid var(--sidebar-border)',
          color: 'var(--muted-foreground)',
          fontSize: 10,
          lineHeight: 1.45,
          padding: '10px 15px',
        }}
      >
        Articraft-10K · CC BY 4.0 · Cambridge Visual Structure Learning Lab
      </footer>
    </div>
  )
}

function Catalog() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const [category, setCategory] = useState<ArticraftCategory | undefined>()
  const [categories, setCategories] = useState<Array<{ count: number; name: ArticraftCategory }>>(
    [],
  )
  const [items, setItems] = useState<ArticraftCatalogItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setPage(1)
    void fetchCatalog({
      category,
      query: debouncedQuery,
      page: 1,
      pageSize: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((response) => {
        setItems(response.items)
        setTotal(response.total)
        setCategories(response.categories)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [category, debouncedQuery])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || items.length >= total) return
    const nextPage = page + 1
    setLoadingMore(true)
    setError('')
    try {
      const response = await fetchCatalog({
        category,
        query: debouncedQuery,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setItems((current) => uniqueItems([...current, ...response.items]))
      setPage(nextPage)
      setTotal(response.total)
      setCategories(response.categories)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoadingMore(false)
    }
  }, [category, debouncedQuery, items.length, loading, loadingMore, page, total])

  useEffect(() => {
    const target = sentinel.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '180px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore])

  const suggestions = debouncedQuery
    ? items
        .filter((item) => item.title.toLocaleLowerCase() !== debouncedQuery.toLocaleLowerCase())
        .slice(0, 5)
    : []
  const allCount = categories.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <Icon name="search" style={{ left: 10, position: 'absolute', top: 10, zIndex: 1 }} />
        <input
          aria-label="Search Articraft catalog"
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Search hinges, chairs, tools…"
          style={{
            ...inputStyle,
            paddingLeft: 31,
            paddingRight: query ? 30 : 10,
          }}
          value={query}
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => setQuery('')}
            style={iconButtonStyle({ position: 'absolute', right: 5, top: 5 })}
            type="button"
          >
            ×
          </button>
        )}
        {searchFocused && suggestions.length > 0 && (
          <div
            style={{
              background: 'var(--popover, var(--background))',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 12px 30px rgba(0,0,0,.24)',
              left: 0,
              overflow: 'hidden',
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 5px)',
              zIndex: 10,
            }}
          >
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => setQuery(item.title)}
                style={{
                  alignItems: 'center',
                  background: 'transparent',
                  border: 0,
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: 11,
                  gap: 8,
                  padding: '8px 10px',
                  textAlign: 'left',
                  width: '100%',
                }}
                type="button"
              >
                <Icon name="corner" size={12} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset
        aria-label="Filter by category"
        style={{
          border: 0,
          display: 'flex',
          gap: 6,
          margin: '0 -15px',
          overflowX: 'auto',
          padding: '0 15px',
        }}
      >
        <CategoryChip
          active={!category}
          count={allCount || total}
          label="All"
          onClick={() => setCategory(undefined)}
        />
        {categories.map((entry) => (
          <CategoryChip
            active={category === entry.name}
            count={entry.count}
            key={entry.name}
            label={entry.name}
            onClick={() => setCategory(entry.name)}
          />
        ))}
      </fieldset>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
          {loading ? 'Reading catalog…' : `${total.toLocaleString()} articulated assets`}
        </span>
        {!loading && total > 0 && (
          <span
            style={{
              color: ACCENT,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Place-ready
          </span>
        )}
      </div>

      {error && <Status error>{error}</Status>}
      {loading ? (
        <div style={catalogGridStyle}>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((key) => (
            <CatalogSkeleton key={key} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          detail="Try another object name or clear the active category."
          icon="search"
          title="No matching assets"
        />
      ) : (
        <div style={catalogGridStyle}>
          {items.map((item) => (
            <CatalogCard item={item} key={item.id} />
          ))}
        </div>
      )}

      <div ref={sentinel} style={{ minHeight: 1 }} />
      {!loading && items.length < total && (
        <button
          disabled={loadingMore}
          onClick={() => void loadMore()}
          style={secondaryButton(loadingMore, { alignSelf: 'center' })}
          type="button"
        >
          {loadingMore ? 'Loading more…' : `Load more · ${items.length} of ${total}`}
        </button>
      )}
    </section>
  )
}

function CategoryChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'color-mix(in srgb, #ff6b3d 14%, var(--background))' : 'transparent',
        border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
        borderRadius: 999,
        color: active ? ACCENT : 'var(--muted-foreground)',
        cursor: 'pointer',
        flex: '0 0 auto',
        fontSize: 10,
        padding: '5px 8px',
        whiteSpace: 'nowrap',
      }}
      type="button"
    >
      {label} <span style={{ opacity: 0.62 }}>{count.toLocaleString()}</span>
    </button>
  )
}

function CatalogCard({ item }: { item: ArticraftCatalogItem }) {
  const selected = useArticraftStore((state) => state.selectedItem?.id === item.id)
  const activeTool = useEditor((state) => state.tool)
  const [imageFailed, setImageFailed] = useState(false)
  const armed = selected && activeTool === 'articraft:asset'
  const movingJoints = item.joints.filter((joint) => joint.type !== 'fixed').length

  return (
    <button
      aria-label={`Place ${item.title}`}
      onClick={() => arm(item)}
      style={{
        background: armed
          ? 'color-mix(in srgb, #ff6b3d 10%, var(--background))'
          : 'var(--background)',
        border: `1px solid ${armed ? ACCENT : 'var(--sidebar-border)'}`,
        borderRadius: 11,
        color: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        padding: 0,
        position: 'relative',
        textAlign: 'left',
      }}
      type="button"
    >
      <div
        style={{
          aspectRatio: '4 / 3',
          background: 'var(--muted)',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {item.thumbnailUrl && !imageFailed ? (
          <img
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={item.thumbnailUrl}
            style={{ height: '100%', objectFit: 'cover', width: '100%' }}
          />
        ) : (
          <PreviewFallback category={item.category} />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          padding: '8px 8px 9px',
          width: '100%',
        }}
      >
        <span
          style={{
            display: '-webkit-box',
            fontSize: 11,
            fontWeight: 650,
            lineHeight: 1.3,
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            alignItems: 'center',
            color: 'var(--muted-foreground)',
            display: 'flex',
            fontSize: 9,
            gap: 4,
          }}
        >
          <Icon name="joint" size={10} />
          {movingJoints} {movingJoints === 1 ? 'joint' : 'joints'} · {item.parts.length} parts
        </span>
      </div>
      {armed && (
        <span
          style={{
            background: ACCENT,
            borderRadius: 999,
            color: '#17120f',
            fontSize: 8,
            fontWeight: 800,
            padding: '3px 6px',
            position: 'absolute',
            right: 6,
            top: 6,
          }}
        >
          ARMED
        </span>
      )}
    </button>
  )
}

function PreviewFallback({ category }: { category?: ArticraftCategory }) {
  return (
    <div
      aria-hidden
      style={{
        alignItems: 'center',
        backgroundColor: '#17181b',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
        color: '#828892',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <Icon name="cube" size={27} />
      <span
        style={{
          fontSize: 8,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {category ?? 'Articulated'}
      </span>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        border: '1px solid var(--sidebar-border)',
        borderRadius: 11,
        overflow: 'hidden',
      }}
    >
      <div style={{ aspectRatio: '4 / 3', background: 'var(--muted)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
        <div
          style={{
            background: 'var(--muted)',
            borderRadius: 4,
            height: 9,
            width: '82%',
          }}
        />
        <div
          style={{
            background: 'var(--muted)',
            borderRadius: 4,
            height: 7,
            width: '55%',
          }}
        />
      </div>
    </div>
  )
}

function Generate() {
  const projectId = useViewer((state) => state.projectId)
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [localImage, setLocalImage] = useState<File | null>(null)
  const [projectImage, setProjectImage] = useState<ArticraftProjectImage | null>(null)
  const [referenceRender, setReferenceRender] = useState<ArticraftReferenceRender | null>(null)
  const [projectImages, setProjectImages] = useState<ArticraftProjectImage[]>([])
  const [filesOpen, setFilesOpen] = useState(false)
  const [filesLoading, setFilesLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [job, setJob] = useState<ArticraftGeneration | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generatingReference, setGeneratingReference] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const localPreview = useMemo(
    () => (localImage ? URL.createObjectURL(localImage) : null),
    [localImage],
  )
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview],
  )

  const referenceUrl = localPreview ?? referenceRender?.imageUrl ?? projectImage?.url ?? null
  const referenceName = referenceRender?.imageUrl
    ? 'GPT Image 2 reference'
    : (localImage?.name ?? projectImage?.name ?? 'Reference image')

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    setFilesLoading(true)
    void fetchProjectImages(projectId, controller.signal)
      .then(setProjectImages)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setFilesLoading(false)
      })
    return () => controller.abort()
  }, [projectId])

  useEffect(() => {
    if (referenceRender?.status !== 'pending') return
    const timer = window.setTimeout(() => {
      void fetchReferenceRender(referenceRender.id)
        .then((next) => {
          setReferenceRender(next)
          if (next.status === 'failed') setError(next.errorText ?? 'Reference generation failed.')
        })
        .catch((cause) => setError(errorMessage(cause)))
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [referenceRender])

  useEffect(() => {
    if (!(job && ['queued', 'running'].includes(job.status))) return
    const timer = window.setTimeout(() => {
      void fetchGeneration(job.id)
        .then((next) => {
          setJob(next)
          if (next.status === 'succeeded' && next.item) arm(next.item)
        })
        .catch((cause) => setError(errorMessage(cause)))
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [job])

  const chooseLocalImage = (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Reference image must be JPEG, PNG, or WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Reference image must be 10 MB or smaller.')
      return
    }
    setError('')
    setLocalImage(file)
    setProjectImage(null)
    setReferenceRender(null)
    setFilesOpen(false)
  }

  const generateReference = async () => {
    if (!(projectId && prompt.trim())) return
    setError('')
    setGeneratingReference(true)
    setLocalImage(null)
    try {
      const render = await createReferenceRender({
        projectId,
        prompt: `Clean product reference of ${prompt.trim()}. Single articulated object, fully visible, neutral studio background, clear separations between moving parts, no text.`,
        ...(projectImage ? { sourceUrl: projectImage.url } : {}),
      })
      setReferenceRender(render)
      setFilesOpen(false)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setGeneratingReference(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData()
    form.set('prompt', prompt)
    form.set('provider', provider)
    if (model.trim()) form.set('model', model.trim())
    try {
      if (localImage) {
        form.set('image', localImage)
      } else if (referenceUrl) {
        form.set('image', await imageFileFromUrl(referenceUrl, referenceName))
      }
      setJob(await createGeneration(form))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    chooseLocalImage(event.dataTransfer.files[0])
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <Step eyebrow="01 · Describe" title="What should move?">
        <textarea
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A compact task chair with adjustable arms and a tilting back…"
          required
          rows={5}
          style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical' }}
          value={prompt}
        />
        <div
          style={{
            color: 'var(--muted-foreground)',
            display: 'flex',
            fontSize: 9,
            gap: 5,
          }}
        >
          <Icon name="joint" size={11} />
          Name moving parts, hinges, sliders, and expected range of motion.
        </div>
      </Step>

      <Step eyebrow="02 · Reference · Optional" title="Give it visual intent">
        {referenceUrl ? (
          <div
            style={{
              background: 'var(--muted)',
              border: `1px solid ${referenceRender?.status === 'pending' ? ACCENT : 'var(--border)'}`,
              borderRadius: 11,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              alt="Selected reference"
              src={referenceUrl}
              style={{
                aspectRatio: '16 / 10',
                display: 'block',
                objectFit: 'cover',
                width: '100%',
              }}
            />
            <div
              style={{
                alignItems: 'center',
                background: 'color-mix(in srgb, var(--background) 92%, transparent)',
                bottom: 0,
                display: 'flex',
                gap: 7,
                left: 0,
                padding: '7px 8px',
                position: 'absolute',
                right: 0,
              }}
            >
              <Icon name={referenceRender?.imageUrl ? 'sparkles' : 'image'} size={12} />
              <span
                style={{
                  flex: 1,
                  fontSize: 9,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {referenceName}
              </span>
              <button
                aria-label="Remove reference"
                onClick={() => {
                  setLocalImage(null)
                  setProjectImage(null)
                  setReferenceRender(null)
                }}
                style={iconButtonStyle()}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        ) : referenceRender?.status === 'pending' ? (
          <Status>
            GPT Image 2 is composing a clean object reference
            {referenceRender.queuePosition ? ` · queue ${referenceRender.queuePosition}` : ''}…
          </Status>
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            style={{
              alignItems: 'center',
              background: dragging
                ? 'color-mix(in srgb, #ff6b3d 10%, var(--background))'
                : 'var(--background)',
              border: `1px dashed ${dragging ? ACCENT : 'var(--border)'}`,
              borderRadius: 11,
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '16px 12px',
              textAlign: 'center',
              width: '100%',
            }}
            type="button"
          >
            <Icon name="upload" size={20} />
            <span style={{ fontSize: 11, fontWeight: 650 }}>Drop a product image here</span>
            <span style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>
              JPEG, PNG or WebP · up to 10 MB
            </span>
          </button>
        )}

        <input
          accept="image/png,image/jpeg,image/webp"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            chooseLocalImage(event.target.files?.[0])
          }
          ref={fileInput}
          style={{ display: 'none' }}
          type="file"
        />
        <div
          style={{
            display: 'grid',
            gap: 6,
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          <ReferenceAction
            icon="upload"
            label="Upload"
            onClick={() => fileInput.current?.click()}
          />
          <ReferenceAction
            active={filesOpen}
            icon="folder"
            label="Pascal Files"
            onClick={() => setFilesOpen((value) => !value)}
          />
          <ReferenceAction
            disabled={!(projectId && prompt.trim()) || generatingReference}
            icon="sparkles"
            label={generatingReference ? 'Starting…' : 'GPT Image 2'}
            onClick={() => void generateReference()}
          />
        </div>

        {filesOpen && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 11,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 240,
              overflow: 'auto',
              padding: 8,
            }}
          >
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 650 }}>Project images</span>
              <span style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>
                {projectImages.length} files
              </span>
            </div>
            {filesLoading ? (
              <Status>Loading Pascal Files…</Status>
            ) : projectImages.length === 0 ? (
              <Status>No image files in this project yet.</Status>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: 6,
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                }}
              >
                {projectImages.map((image) => (
                  <button
                    aria-label={`Use ${image.name}`}
                    key={image.id}
                    onClick={() => {
                      setProjectImage(image)
                      setLocalImage(null)
                      setReferenceRender(null)
                      setFilesOpen(false)
                    }}
                    style={{
                      background: 'var(--muted)',
                      border: 0,
                      borderRadius: 8,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: 0,
                    }}
                    title={image.name}
                    type="button"
                  >
                    <img
                      alt=""
                      loading="lazy"
                      src={image.url}
                      style={{
                        aspectRatio: '1 / 1',
                        display: 'block',
                        objectFit: 'cover',
                        width: '100%',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            background: 'color-mix(in srgb, #ff6b3d 7%, var(--background))',
            border: '1px solid color-mix(in srgb, #ff6b3d 28%, var(--border))',
            borderRadius: 10,
            display: 'flex',
            gap: 8,
            padding: '9px 10px',
          }}
        >
          <Icon color={ACCENT} name="sparkles" size={13} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 650 }}>Reference sketch with GPT Image 2</span>
            <span
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 9,
                lineHeight: 1.4,
              }}
            >
              Creates a 1:1 medium-quality reference and uses Pascal Studio credits. If a Pascal
              File is selected, GPT Image 2 restyles it first.
            </span>
          </div>
        </div>
      </Step>

      <details
        style={{
          border: '1px solid var(--border)',
          borderRadius: 11,
          overflow: 'hidden',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 650,
            padding: '9px 10px',
          }}
        >
          Worker settings
        </summary>
        <div
          style={{
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gap: 8,
            gridTemplateColumns: '1fr 1fr',
            padding: 10,
          }}
        >
          <label style={labelStyle}>
            Provider
            <select
              onChange={(event) => setProvider(event.target.value)}
              style={inputStyle}
              value={provider}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </label>
          <label style={labelStyle}>
            Model override
            <input
              onChange={(event) => setModel(event.target.value)}
              placeholder="Worker default"
              style={inputStyle}
              value={model}
            />
          </label>
        </div>
      </details>

      <button
        disabled={submitting || !prompt.trim() || referenceRender?.status === 'pending'}
        style={{
          ...primaryButton,
          opacity: submitting || !prompt.trim() || referenceRender?.status === 'pending' ? 0.48 : 1,
        }}
        type="submit"
      >
        <Icon color="#17120f" name="cube" size={14} />
        {submitting ? 'Preparing reference…' : 'Generate articulated asset'}
      </button>

      {job && (
        <Status error={job.status === 'failed'}>
          {job.status === 'succeeded'
            ? 'Asset ready and armed. Click the ground to place it.'
            : (job.message ?? `Articraft generation ${job.status}…`)}
        </Status>
      )}
      {error && <Status error>{error}</Status>}
      <p
        style={{
          color: 'var(--muted-foreground)',
          fontSize: 9,
          lineHeight: 1.45,
          margin: 0,
        }}
      >
        Generation runs through Pascal’s credentialed Articraft worker. Provider keys never leave
        the server.
      </p>
    </form>
  )
}

function Step({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            color: ACCENT,
            fontSize: 8,
            fontWeight: 750,
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function ReferenceAction({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        alignItems: 'center',
        background: active
          ? 'color-mix(in srgb, #ff6b3d 10%, var(--background))'
          : 'var(--background)',
        border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
        borderRadius: 9,
        color: active ? ACCENT : 'var(--foreground)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 9,
        gap: 4,
        justifyContent: 'center',
        minHeight: 49,
        opacity: disabled ? 0.42 : 1,
        padding: '6px 3px',
      }}
      type="button"
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  )
}

function EmptyState({ detail, icon, title }: { detail: string; icon: IconName; title: string }) {
  return (
    <div
      style={{
        alignItems: 'center',
        border: '1px dashed var(--border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <Icon name={icon} size={21} />
      <span style={{ fontSize: 11, fontWeight: 650 }}>{title}</span>
      <span
        style={{
          color: 'var(--muted-foreground)',
          fontSize: 9,
          lineHeight: 1.4,
        }}
      >
        {detail}
      </span>
    </div>
  )
}

function Status({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      style={{
        background: error ? 'color-mix(in srgb, #ef4444 12%, transparent)' : 'var(--muted)',
        border: `1px solid ${error ? 'color-mix(in srgb, #ef4444 35%, transparent)' : 'transparent'}`,
        borderRadius: 10,
        color: error ? '#ef6d6d' : 'var(--muted-foreground)',
        fontSize: 10,
        lineHeight: 1.45,
        margin: 0,
        padding: '8px 9px',
      }}
    >
      {children}
    </p>
  )
}

type IconName = 'corner' | 'cube' | 'folder' | 'image' | 'joint' | 'search' | 'sparkles' | 'upload'

const iconPaths: Record<IconName, ReactNode> = {
  corner: <path d="m9 7 5 5-5 5M4 4v4a4 4 0 0 0 4 4h6" />,
  cube: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />,
  folder: (
    <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2v1Z" />
  ),
  image: <path d="M4 5h16v14H4zM4 15l4-4 4 4 2-2 6 6M15.5 9.5h.01" />,
  joint: <path d="M6 12a3 3 0 1 0 0 .01M18 12a3 3 0 1 0 0 .01M9 12h6" />,
  search: <path d="m20 20-4.4-4.4M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />,
  sparkles: (
    <path d="m12 3 1.1 3.4L16.5 7.5l-3.4 1.1L12 12l-1.1-3.4-3.4-1.1 3.4-1.1L12 3ZM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 12l.8 2.2L9 15l-2.2.8L6 18l-.8-2.2L3 15l2.2-.8L6 12Z" />
  ),
  upload: <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" />,
}

function Icon({
  color = 'currentColor',
  name,
  size = 15,
  style,
}: {
  color?: string
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      style={{ flex: '0 0 auto', ...style }}
      viewBox="0 0 24 24"
      width={size}
    >
      <title>{name}</title>
      {iconPaths[name]}
    </svg>
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [delay, value])
  return debounced
}

async function imageFileFromUrl(url: string, name: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read the selected reference (${response.status}).`)
  const blob = await response.blob()
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const basename = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .slice(0, 80)
  return new File([blob], `${basename || 'reference'}.${extension}`, {
    type: blob.type,
  })
}

function uniqueItems(items: ArticraftCatalogItem[]): ArticraftCatalogItem[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value)
}

const catalogGridStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
}

const labelStyle: CSSProperties = {
  color: 'var(--muted-foreground)',
  display: 'flex',
  flexDirection: 'column',
  fontSize: 9,
  gap: 5,
}

function iconButtonStyle(extra?: CSSProperties): CSSProperties {
  return {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    borderRadius: 999,
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    display: 'flex',
    fontSize: 17,
    height: 28,
    justifyContent: 'center',
    padding: 0,
    width: 28,
    ...extra,
  }
}

function secondaryButton(disabled: boolean, extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--secondary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--secondary-foreground)',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 10,
    opacity: disabled ? 0.45 : 1,
    padding: '7px 11px',
    ...extra,
  }
}
