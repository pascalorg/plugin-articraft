'use client'

import { useScene } from '@pascal-app/core'
import { SegmentedControl, useEditor } from '@pascal-app/editor'
import { useEffect, useState } from 'react'
import { createGeneration, fetchCatalog, fetchGeneration } from './api'
import { useArticraftStore } from './store'
import type { ArticraftCatalogItem, ArticraftGeneration } from './types'

type Mode = 'browse' | 'generate'

const inputStyle: React.CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--foreground)',
  font: 'inherit',
  fontSize: 13,
  outline: 'none',
  padding: '9px 10px',
  width: '100%',
}

const primaryButton: React.CSSProperties = {
  background: 'var(--primary)',
  border: 0,
  borderRadius: 999,
  color: 'var(--primary-foreground)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  padding: '9px 14px',
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
        gap: 16,
        padding: 16,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Articraft</h2>
          <span
            style={{
              background: 'var(--sidebar-accent)',
              borderRadius: 999,
              color: 'var(--muted-foreground)',
              fontSize: 11,
              padding: '3px 8px',
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

      {mode === 'browse' ? <Catalog /> : <Generate />}

      <footer
        style={{
          borderTop: '1px solid var(--sidebar-border)',
          color: 'var(--muted-foreground)',
          fontSize: 11,
          lineHeight: 1.5,
          margin: '4px -16px -16px',
          padding: '12px 16px',
        }}
      >
        Articraft-10K assets are CC BY 4.0. Generation uses the configured
        mini-articraft worker and its provider credits.
      </footer>
    </div>
  )
}

function Catalog() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ArticraftCatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetchCatalog({ query: submitted, page, pageSize: 24, signal: controller.signal })
      .then((response) => {
        setItems(response.items)
        setTotal(response.total)
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [submitted, page])

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setSubmitted(query)
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          aria-label="Search Articraft catalog"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search 10,000 articulated assets"
          style={inputStyle}
          value={query}
        />
        <button style={primaryButton} type="submit">
          Search
        </button>
      </form>

      {loading && <Status>Loading catalog…</Status>}
      {error && <Status error>{error}</Status>}
      {!loading && !error && items.length === 0 && <Status>No matching assets.</Status>}

      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        }}
      >
        {items.map((item) => (
          <CatalogCard item={item} key={item.id} />
        ))}
      </div>

      {total > 24 && (
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            style={secondaryButton(page === 1)}
            type="button"
          >
            Previous
          </button>
          <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>
            {Math.min((page - 1) * 24 + 1, total)}–{Math.min(page * 24, total)} of {total}
          </span>
          <button
            disabled={page * 24 >= total}
            onClick={() => setPage((value) => value + 1)}
            style={secondaryButton(page * 24 >= total)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}

function CatalogCard({ item }: { item: ArticraftCatalogItem }) {
  const selected = useArticraftStore((state) => state.selectedItem?.id === item.id)
  const activeTool = useEditor((state) => state.tool)
  const armed = selected && activeTool === 'articraft:asset'
  return (
    <button
      onClick={() => arm(item)}
      style={{
        background: armed ? 'var(--sidebar-accent)' : 'transparent',
        border: `1px solid ${armed ? 'var(--ring)' : 'var(--sidebar-border)'}`,
        borderRadius: 12,
        color: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        minWidth: 0,
        padding: 8,
        textAlign: 'left',
      }}
      type="button"
    >
      {item.thumbnailUrl ? (
        <img
          alt=""
          src={item.thumbnailUrl}
          style={{
            aspectRatio: '1 / 1',
            background: 'var(--muted)',
            borderRadius: 8,
            objectFit: 'cover',
            width: '100%',
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            alignItems: 'center',
            aspectRatio: '1 / 1',
            background: 'var(--muted)',
            borderRadius: 8,
            color: 'var(--muted-foreground)',
            display: 'flex',
            fontSize: 28,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          ◎
        </div>
      )}
      <span
        style={{
          display: '-webkit-box',
          fontSize: 12,
          fontWeight: 600,
          overflow: 'hidden',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
        }}
      >
        {item.title}
      </span>
      <span style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
        {item.joints.filter((joint) => joint.type !== 'fixed').length} movable joints
      </span>
    </button>
  )
}

function Generate() {
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [job, setJob] = useState<ArticraftGeneration | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return
    const timer = window.setTimeout(() => {
      void fetchGeneration(job.id)
        .then((next) => {
          setJob(next)
          if (next.status === 'succeeded' && next.item) arm(next.item)
        })
        .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [job])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData()
    form.set('prompt', prompt)
    form.set('provider', provider)
    if (model.trim()) form.set('model', model.trim())
    if (image) form.set('image', image)
    try {
      setJob(await createGeneration(form))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={labelStyle}>
        Prompt
        <textarea
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A folding task chair with adjustable arms"
          required
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={prompt}
        />
      </label>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
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
      <label style={labelStyle}>
        Reference image (optional)
        <input
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          style={inputStyle}
          type="file"
        />
      </label>
      <button disabled={submitting || !prompt.trim()} style={primaryButton} type="submit">
        {submitting ? 'Submitting…' : 'Generate articulated asset'}
      </button>
      {job && (
        <Status error={job.status === 'failed'}>
          {job.status === 'succeeded'
            ? 'Ready. Click the ground to place the generated asset.'
            : job.message ?? `Generation ${job.status}…`}
        </Status>
      )}
      {error && <Status error>{error}</Status>}
      <Status>
        The worker receives this prompt and reference image. The selected provider charges the
        credential configured on the worker; Pascal never sends that key to the browser.
      </Status>
    </form>
  )
}

function Status({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p
      style={{
        background: error ? 'color-mix(in srgb, #ef4444 12%, transparent)' : 'var(--muted)',
        borderRadius: 10,
        color: error ? '#ef4444' : 'var(--muted-foreground)',
        fontSize: 12,
        lineHeight: 1.5,
        margin: 0,
        padding: '9px 10px',
      }}
    >
      {children}
    </p>
  )
}

const labelStyle: React.CSSProperties = {
  color: 'var(--muted-foreground)',
  display: 'flex',
  flexDirection: 'column',
  fontSize: 11,
  gap: 6,
}

function secondaryButton(disabled: boolean): React.CSSProperties {
  return {
    background: 'var(--secondary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: 'var(--secondary-foreground)',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 11,
    opacity: disabled ? 0.4 : 1,
    padding: '6px 10px',
  }
}
