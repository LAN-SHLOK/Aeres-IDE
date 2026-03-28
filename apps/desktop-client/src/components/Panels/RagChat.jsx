import { useCallback, useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '../../store.js'

export default function RagChat() {
  const chatMessages = useStore((s) => s.chatMessages)
  const appendChatMessage = useStore((s) => s.appendChatMessage)
  const clearChat = useStore((s) => s.clearChat)
  const backendUrl = useStore((s) => s.backendUrl)
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)

  const [input, setInput] = useState('')
  const [crawlUrl, setCrawlUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    appendChatMessage({ role: 'user', content: q })
    setLoading(true)

    try {
      const e = window.electron
      let token = ''
      try { token = await e?.auth.getToken() } catch { /* ok */ }

      const activeTab = tabs.find((t) => t.id === activeTabId)
      const context = activeTab?.content?.slice(0, 3000) || ''
      const rootPath = useStore.getState().rootPath
      const base = backendUrl || 'http://127.0.0.1:8008'

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const resp = await fetch(`${base}/api/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: q, context, root_path: rootPath }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const data = await resp.json()
      appendChatMessage({
        role: 'assistant',
        content: data.answer || 'I could not find an answer.',
        sourceUrl: data.source_url || '',
      })
    } catch (err) {
      console.error('[RagChat] error:', err)
      appendChatMessage({
        role: 'assistant',
        content:
          err.name === 'AbortError'
            ? 'Request timed out. The backend might be busy or model still loading.'
            : `Error: ${err.message}`,
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, backendUrl, tabs, activeTabId, appendChatMessage])

  const handleCrawl = useCallback(async () => {
    const url = crawlUrl.trim()
    if (!url || isCrawling) return
    setIsCrawling(true)
    try {
      const e = window.electron
      let token = ''
      try { token = await e?.auth.getToken() } catch { /* ok */ }
      const base = backendUrl || 'http://127.0.0.1:8008'
      
      const resp = await fetch(`${base}/api/rag/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url, name: url.split('/').pop() || 'docs' }),
      })
      if (resp.ok) {
        appendChatMessage({ role: 'assistant', content: `Successfully ingested documentation from ${url}. I can now answer questions about it!` })
        setCrawlUrl('')
      } else {
        throw new Error('Crawl failed')
      }
    } catch (err) {
      appendChatMessage({ role: 'assistant', content: `Failed to crawl ${url}: ${err.message}` })
    } finally {
      setIsCrawling(false)
    }
  }, [crawlUrl, isCrawling, backendUrl, appendChatMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-aether-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-aether-muted">AI Chat</span>
        <button
          type="button"
          onClick={clearChat}
          className="rounded px-2 py-0.5 text-[10px] text-aether-muted transition hover:text-red-400"
        >
          Clear
        </button>
      </div>

      {/* Ingest Bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-aether-border bg-aether-surface/30 p-2">
        <input
          type="text"
          value={crawlUrl}
          onChange={(e) => setCrawlUrl(e.target.value)}
          placeholder="Paste doc URL to ingest (e.g. react docs)"
          className="flex-1 rounded border border-aether-border/50 bg-transparent px-2 py-0.5 text-[10px] text-aether-text placeholder:text-aether-muted focus:outline-none"
        />
        <button
          onClick={handleCrawl}
          disabled={isCrawling || !crawlUrl.trim()}
          className="rounded bg-aether-blue/20 px-2 py-0.5 text-[10px] font-medium text-aether-blue transition hover:bg-aether-blue/30 disabled:opacity-30"
        >
          {isCrawling ? 'Crawling…' : 'Ingest'}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-center text-xs text-aether-muted mt-8">
            Ask anything about your code…
          </p>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-aether-violet/20 text-aether-text'
                  : 'bg-aether-surface text-aether-text'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none [&_code]:bg-aether-bg [&_code]:px-1 [&_code]:rounded [&_pre]:bg-aether-bg [&_pre]:p-2 [&_pre]:rounded">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
            {msg.sourceUrl && (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[9px] text-aether-muted">Source:</span>
                <span className="max-w-[200px] truncate text-[9px] text-aether-blue">{msg.sourceUrl}</span>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="rounded-lg bg-aether-surface px-3 py-2 text-xs text-aether-muted animate-pulse">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-2 border-t border-aether-border bg-aether-surface p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about your code…"
          className="flex-1 rounded-md border border-aether-border bg-aether-bg px-3 py-1.5 text-xs text-aether-text placeholder:text-aether-muted focus:border-aether-violet focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-md bg-aether-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}
