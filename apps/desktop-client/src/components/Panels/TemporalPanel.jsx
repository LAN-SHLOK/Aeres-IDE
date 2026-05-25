import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../store.js'

const COLORS = {
  violet: '#7C3AED',
  blue: '#4F8EF7',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  muted: '#64748b',
}

function BarChart({ data, width, height }) {
  if (!data || data.length === 0) return null

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barWidth = Math.max(6, Math.min(24, (width - 40) / data.length - 2))
  const chartHeight = height - 32

  return (
    <svg width={width} height={height} className="select-none">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = 16 + chartHeight * (1 - frac)
        return (
          <g key={frac}>
            <line x1={28} y1={y} x2={width} y2={y} stroke="#1e293b" strokeWidth="0.5" />
            <text x={24} y={y + 3} textAnchor="end" fontSize="8" fill="#475569" fontFamily="monospace">
              {Math.round(maxVal * frac)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = 32 + i * (barWidth + 2)
        const barH = (d.value / maxVal) * chartHeight
        const y = 16 + chartHeight - barH

        const color = d.value > maxVal * 0.8 ? COLORS.red
          : d.value > maxVal * 0.5 ? COLORS.amber
          : d.value > maxVal * 0.3 ? COLORS.blue
          : COLORS.green

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barWidth} height={barH}
              rx={2}
              fill={color}
              opacity={0.85}
              className="transition-all duration-300 hover:opacity-100"
            >
              <title>{d.label}: {d.value}ms</title>
            </rect>
            {barWidth >= 12 && (
              <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" fontSize="7" fill="#475569" fontFamily="monospace">
                {d.label.length > 6 ? d.label.slice(0, 5) + '…' : d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function SparkLine({ data, width = 120, height = 28 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={COLORS.violet}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r="2.5"
        fill={COLORS.violet}
      />
    </svg>
  )
}

export default function TemporalPanel() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)

  const [timings, setTimings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(280)

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Fetch timing data
  useEffect(() => {
    if (!activeTab?.path || !window.electron?.temporal) return
    setLoading(true)
    setError(null)

    const fetch = async () => {
      try {
        const res = await window.electron.temporal.getFile(activeTab.path)
        if (res?.error) {
          setError(res.error)
          setTimings([])
        } else {
          setTimings(Array.isArray(res) ? res : [])
        }
      } catch (err) {
        setError(err.message || 'Failed to load temporal data')
        setTimings([])
      } finally {
        setLoading(false)
      }
    }

    fetch()
    const int = setInterval(fetch, 4000)
    return () => clearInterval(int)
  }, [activeTab?.path])

  // Process bar chart data
  const barData = useMemo(() => {
    if (!timings || timings.length === 0) return []
    return timings.slice(0, 30).map(t => ({
      label: t.name || t.function_name || `L${t.line || '?'}`,
      value: Math.round(t.duration_ms || t.avg_ms || 0),
    }))
  }, [timings])

  // Aggregate stats
  const stats = useMemo(() => {
    if (!timings || timings.length === 0) return null
    const values = timings.map(t => t.duration_ms || t.avg_ms || 0)
    const total = values.reduce((a, b) => a + b, 0)
    const avg = total / values.length
    const max = Math.max(...values)
    const p95idx = Math.floor(values.sort((a, b) => a - b).length * 0.95)
    const p95 = values[p95idx] || max
    return { total: Math.round(total), avg: Math.round(avg), max: Math.round(max), p95: Math.round(p95), count: values.length }
  }, [timings])

  // History sparkline (last 10 totals)
  const [history, setHistory] = useState([])
  useEffect(() => {
    if (!stats) return
    setHistory(prev => [...prev.slice(-9), stats.total])
  }, [stats?.total])

  if (!activeTab) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30 mb-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span className="text-xs">Open a file to see performance timings</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-slate-950/40 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Temporal Lens</h3>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-[9px] text-slate-500 font-mono">{stats.count} fn</span>
          )}
          {loading && (
            <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-2 my-2 p-2.5 rounded-lg border border-red-800/40 bg-red-950/20 text-red-400 text-[10px] leading-relaxed">
          <div className="flex gap-2 items-start">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <span className="font-bold block mb-0.5">Profiler Unavailable</span>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-1 p-2 border-b border-slate-800/30">
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40 text-center">
            <div className="text-[8px] text-slate-600 uppercase font-bold">Total</div>
            <div className="text-[13px] text-white font-bold font-mono">{stats.total}<span className="text-[8px] text-slate-500">ms</span></div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40 text-center">
            <div className="text-[8px] text-slate-600 uppercase font-bold">Avg</div>
            <div className="text-[13px] text-blue-400 font-bold font-mono">{stats.avg}<span className="text-[8px] text-slate-500">ms</span></div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40 text-center">
            <div className="text-[8px] text-slate-600 uppercase font-bold">P95</div>
            <div className="text-[13px] text-amber-400 font-bold font-mono">{stats.p95}<span className="text-[8px] text-slate-500">ms</span></div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40 text-center">
            <div className="text-[8px] text-slate-600 uppercase font-bold">Max</div>
            <div className="text-[13px] text-red-400 font-bold font-mono">{stats.max}<span className="text-[8px] text-slate-500">ms</span></div>
          </div>
        </div>
      )}

      {/* Sparkline trend */}
      {history.length >= 2 && (
        <div className="px-3 py-2 border-b border-slate-800/30 flex items-center justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Trend</span>
          <SparkLine data={history} width={containerWidth - 80} height={24} />
        </div>
      )}

      {/* Bar chart */}
      <div className="flex-1 overflow-hidden p-2">
        {barData.length > 0 ? (
          <BarChart data={barData} width={containerWidth - 16} height={200} />
        ) : !loading && !error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-violet-600/10 blur-xl rounded-full" />
              <div className="relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-800 bg-slate-900/80 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mb-1">No Performance Data</p>
            <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
              Run or debug your code to capture function-level latency timings. The Temporal Lens records execution durations automatically.
            </p>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 text-[9px] text-slate-600 bg-slate-950/60 border-t border-slate-800/30 flex items-center gap-1">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        Latency data auto-captured from runtime profiling
      </div>
    </div>
  )
}
