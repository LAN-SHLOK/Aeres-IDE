import React, { useState } from 'react'
import { useStore } from '../../store.js'
export default function ApiSandboxPanel() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [body, setBody] = useState('{\n  \n}')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [time, setTime] = useState(null)

  const handleSend = async () => {
    setLoading(true)
    setResponse(null)
    setStatus(null)
    setTime(null)
    
    const startTime = performance.now()
    try {
      let parsedHeaders = {}
      try {
        if (headers.trim()) parsedHeaders = JSON.parse(headers)
      } catch (e) {
        throw new Error('Invalid Headers JSON')
      }

      const backendUrl = useStore.getState().backendUrl || 'http://127.0.0.1:8008'
      const proxyUrl = `${backendUrl}/api/proxy/`
      
      const options = {
        method,
        headers: {
            ...parsedHeaders,
            'x-proxy-target': url
        },
      }
      
      if (method !== 'GET' && method !== 'HEAD') {
        options.body = body
      }

      const res = await fetch(proxyUrl, options)
      const endTime = performance.now()
      setTime(Math.round(endTime - startTime))
      setStatus({ code: res.status, text: res.statusText })
      
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json()
        setResponse(JSON.stringify(data, null, 2))
      } else {
        const text = await res.text()
        setResponse(text)
      }
    } catch (err) {
      setStatus({ code: 'Error', text: err.message })
      setResponse(err.stack || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAI = async () => {
    setLoading(true)
    try {
      const port = useStore.getState().backendUrl?.split(':').pop() || 8008
      const auth = localStorage.getItem('aeres-token')
      
      const targetMethod = method === 'GET' ? 'POST' : method
      if (method === 'GET') setMethod('POST')

      const backendUrl = useStore.getState().backendUrl || 'http://127.0.0.1:8008'
      const res = await fetch(`${backendUrl}/api/ai/generate-api-payload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth}`
        },
        body: JSON.stringify({ method: targetMethod, url })
      })
      if (!res.ok) throw new Error('Failed to generate payload')
      const data = await res.json()
      
      try {
        // Format it nicely
        const payloadObj = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload
        setBody(JSON.stringify(payloadObj, null, 2))
      } catch (e) {
        setBody(typeof data.payload === 'object' ? JSON.stringify(data.payload, null, 2) : String(data.payload))
      }
    } catch (err) {
      console.error(err)
      const store = useStore.getState();
      store.appendOutputLog('error', 'Failed to generate AI payload');
      store.setActiveSidebarTab('output');
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'text-emerald-400 bg-emerald-400/10'
    if (code >= 400 && code < 500) return 'text-orange-400 bg-orange-400/10'
    if (code >= 500) return 'text-red-400 bg-red-400/10'
    return 'text-red-400 bg-red-400/10' // Errors
  }

  const getMethodColor = (m) => {
    switch (m) {
      case 'GET': return 'text-blue-400'
      case 'POST': return 'text-emerald-400'
      case 'PUT': return 'text-orange-400'
      case 'DELETE': return 'text-red-400'
      case 'PATCH': return 'text-yellow-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#050508] font-sans animate-in fade-in duration-300 text-slate-300">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0d0e15] shrink-0">
        <div className="flex items-center gap-2">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-aeres-violet"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
           <span className="font-bold text-sm tracking-wide text-white">Aeres API Sandbox</span>
        </div>
        <button 
          onClick={handleGenerateAI}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-aeres-violet/10 text-aeres-violet text-xs font-bold hover:bg-aeres-violet hover:text-white transition-all shadow-sm"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          AI Generate Payload
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Request Builder */}
        <div className="flex flex-col w-1/2 border-r border-slate-800 bg-[#0a0a0f] overflow-y-auto custom-scrollbar p-4 gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Request URL</label>
            <div className="flex rounded-lg border border-slate-700/60 overflow-hidden bg-[#161622] shadow-inner focus-within:border-aeres-violet focus-within:ring-1 focus-within:ring-aeres-violet/30 transition-all">
              <select 
                value={method} 
                onChange={(e) => setMethod(e.target.value)}
                className={`bg-transparent px-3 py-2 text-xs font-bold border-r border-slate-700/60 focus:outline-none cursor-pointer appearance-none ${getMethodColor(method)}`}
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-[#161622]">{m}</option>)}
              </select>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1/users"
                className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono"
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-2 bg-aeres-violet text-white text-xs font-bold hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'SEND'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Headers (JSON)</label>
            <textarea 
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full h-24 bg-[#161622] border border-slate-700/60 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-aeres-violet focus:ring-1 focus:ring-aeres-violet/30 resize-none shadow-inner"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-h-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Body (JSON)</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={method === 'GET' || method === 'HEAD'}
              className="w-full h-full bg-[#161622] border border-slate-700/60 rounded-lg p-3 text-xs font-mono text-yellow-300 focus:outline-none focus:border-aeres-violet focus:ring-1 focus:ring-aeres-violet/30 resize-none shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Side: Response */}
        <div className="flex flex-col w-1/2 bg-[#0d0e15] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#12131c]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Response</span>
            
            <div className="flex items-center gap-4 text-xs font-mono">
              {status && (
                <span className={`px-2 py-0.5 rounded font-bold ${getStatusColor(status.code)}`}>
                  {status.code} {status.text}
                </span>
              )}
              {time && (
                <span className="text-slate-400">
                  <span className="text-slate-300 font-bold">{time}</span> ms
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-[#050508]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : response ? (
              <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap word-break-all">
                {response}
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-600 font-mono text-center px-8">
                Hit Send to execute the request.<br/>Responses will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  )
}
