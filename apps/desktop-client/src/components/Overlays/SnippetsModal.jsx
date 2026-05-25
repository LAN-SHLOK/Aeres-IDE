import { useState } from 'react'

const SNIPPET_TEMPLATES = [
  {
    id: 'rfc',
    name: 'React Functional Component',
    prefix: 'rfc',
    desc: 'Generates a standard React functional component with Tailwind styles and exports.',
    code: `import { useState } from 'react'

export default function MyComponent() {
  const [data, setData] = useState(null)

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
      <h2 className="text-sm font-bold text-white mb-2">My Premium Component</h2>
      <p className="text-xs text-slate-400">Successfully instantiated from Aeres Snippets.</p>
    </div>
  )
}`
  },
  {
    id: 'fastapi',
    name: 'FastAPI Basic Server',
    prefix: 'fastapi',
    desc: 'Spawns a clean FastAPI Uvicorn backend server scaffold with CORS enabled.',
    code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Aeres Powered Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "engine": "Aeres AI Framework"}
`
  },
  {
    id: 'html5',
    name: 'HTML5 Premium Boilerplate',
    prefix: 'html5',
    desc: 'HTML5 premium skeleton template containing Inter fonts and modern Tailwind CDN settings.',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aeres Live Project</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center">
  <div class="text-center space-y-4">
    <h1 class="text-3xl font-extrabold tracking-tight">Live Server Active</h1>
    <p class="text-slate-400 text-sm">Modify this file to see real-time updates.</p>
  </div>
</body>
</html>`
  },
  {
    id: 'csscenter',
    name: 'CSS Grid & Flex Center',
    prefix: 'csscenter',
    desc: 'Ultimate layout utility snippets to perfectly center any absolute element.',
    code: `/* Perfect Flex Center */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Perfect Grid Center */
.grid-center {
  display: grid;
  place-items: center;
}`
  }
]

export default function SnippetsModal({ onClose }) {
  const [activeSnippet, setActiveSnippet] = useState(SNIPPET_TEMPLATES[0])
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-[720px] h-[520px] bg-[#181824] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#12121c]">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Configure Snippets Templates</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Snippets Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Snippets list */}
          <div className="w-64 border-r border-slate-800/80 bg-slate-950/20 p-4 space-y-2 overflow-y-auto">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#7C3AED] mb-3">Custom Snippets</h3>
            {SNIPPET_TEMPLATES.map(snippet => (
              <button
                key={snippet.id}
                onClick={() => { setActiveSnippet(snippet); setCopied(false); }}
                className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-0.5 ${
                  activeSnippet.id === snippet.id
                    ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white shadow-sm'
                    : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
              >
                <span className="text-[11px] font-semibold">{snippet.name}</span>
                <span className="text-[9px] font-mono text-slate-500">Prefix: {snippet.prefix}</span>
              </button>
            ))}
          </div>

          {/* Right panel: Snippet Code display */}
          <div className="flex-1 flex flex-col bg-slate-950/40 p-5 overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xs font-bold text-white">{activeSnippet.name}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{activeSnippet.desc}</p>
              </div>
              <button
                onClick={handleCopy}
                className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {copied ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Code Code Canvas */}
            <div className="flex-1 rounded-lg border border-slate-800/80 overflow-hidden bg-slate-950/80 p-4">
              <pre className="h-full overflow-y-auto font-mono text-[10px] leading-relaxed text-purple-400/90 whitespace-pre scrollbar-thin">
                {activeSnippet.code}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#12121c] border-t border-slate-800/80 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-[#7C3AED] text-white text-[11px] font-bold uppercase tracking-wider rounded-md hover:bg-opacity-90 active:scale-[0.98] transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
