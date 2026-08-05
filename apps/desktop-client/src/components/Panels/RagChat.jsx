import { useCallback, useRef, useState, useEffect } from 'react'
import { useStore } from '../../store.js'
import { Map, Rocket, Book, Globe, Settings, AlertTriangle, Palette, FlaskConical, Zap, Hammer, MessageSquare, User, Sparkles } from 'lucide-react'
import WorkflowDiagram from './WorkflowDiagram.jsx'

// Simple Markdown Renderer (no external dep)

function renderMarkdown(text) {
  if (!text) return ''
  const html = text
    // Think / Scratchpad (Internal Monologue) - handles unclosed tags during streaming
    .replace(/<(?:think|scratchpad)>([\s\S]*?)(?:<\/(?:think|scratchpad)>|$)/g, '<details open class="my-2 border border-slate-700/50 rounded-lg bg-slate-900/40 overflow-hidden"><summary class="cursor-pointer px-3 py-1.5 text-[10px] font-semibold text-slate-400 bg-slate-800/30 hover:bg-slate-800/50 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>AI is thinking...</summary><div class="p-3 text-[10px] font-mono text-slate-500 whitespace-pre-wrap">$1</div></details>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900/80 border border-slate-700/40 rounded-md p-3 my-2 overflow-x-auto"><code class="text-[11px] leading-relaxed font-mono text-slate-300">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-purple-400 px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-400">$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-xs font-bold text-white mb-1 mt-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[13px] font-bold text-white mb-1.5 mt-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-sm font-bold text-white mb-2 mt-3">$1</h1>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="text-slate-300 ml-3">• $1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="text-slate-300 ml-3">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#7C3AED] font-bold underline transition-all hover:text-white hover:bg-[#7C3AED]/20 hover:no-underline rounded-sm px-0.5" target="_blank">$1</a>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-2">')
    // Line breaks
    .replace(/\n/g, '<br/>')
  return html
}

function MarkdownContent({ content }) {
  return (
    <div 
      className="max-w-none overflow-x-hidden break-words" 
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
    />
  )
}

// Tool Icons (SVG)

const TOOL_ICONS = {
  read_file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  write_file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  edit_file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  search_code: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  list_directory: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  run_command: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  run_in_terminal: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  debug_file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>,
  ask_user: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  create_plan: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  create_walkthrough: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>,
  save_context: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  open_browser: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  read_url: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/></svg>,
  multi_edit_file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/><line x1="16" y1="13" x2="20" y2="13"/><line x1="16" y1="17" x2="20" y2="17"/></svg>,
  semantic_search: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/><path d="M10 7v6m-3-3h6"/></svg>,
  search_web: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20M2 12h20"/></svg>,
  find_symbol: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6h.01M15 10h.01M15 14h.01M15 18h.01M9 6H5a2 2 0 00-2 2v8a2 2 0 002 2h4"/></svg>,
}

const TOOL_LABELS = {
  read_file: 'Reading',
  write_file: 'Writing',
  edit_file: 'Editing',
  search_code: 'Searching',
  list_directory: 'Listing',
  run_command: 'Checking',
  run_in_terminal: 'Running in Terminal',
  debug_file: 'Debugging',
  ask_user: 'Asking',
  create_plan: 'Creating Plan',
  create_walkthrough: 'Writing Walkthrough',
  save_context: 'Saving Context',
  open_browser: 'Opening Browser',
  read_url: 'Reading URL',
  multi_edit_file: 'Multi-Chunk Editing',
  semantic_search: 'Semantic Searching',
  search_web: 'Web Searching',
  find_symbol: 'Finding Symbol',
}

// Agent Step Component

function AgentStep({ step }) {
  const [expanded, setExpanded] = useState(false)
  
  if (step.type === 'thinking') {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-400 py-1.5 px-2 bg-slate-950/20 rounded-xl border border-slate-800/40 my-1 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping" />
        <span className="font-extrabold uppercase tracking-widest text-[8px] text-[#7C3AED]">Thinking</span>
        <span className="italic truncate">{step.content}</span>
      </div>
    )
  }
  
  if (step.type === 'tool_call') {
    const icon = TOOL_ICONS[step.tool] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83 2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    const label = TOOL_LABELS[step.tool] || step.tool
    const fileName = (step.args?.file_path || '').split(/[/\\]/).pop() || ''
    const query = step.args?.query || step.args?.command || ''
    
    return (
      <div className="py-1">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-[10px] w-full text-left hover:bg-slate-900/50 rounded-xl px-2.5 py-1.5 transition border border-slate-800/40 bg-slate-950/20">
          <span className="text-[#7C3AED] shrink-0 p-0.5 bg-black/10 rounded">{icon}</span>
          <span className="text-slate-300 font-extrabold uppercase tracking-tight text-[8px]">{label}</span>
          {fileName && <span className="text-amber-400 font-mono text-[8px] truncate max-w-[100px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">{fileName}</span>}
          {query && <span className="text-slate-500 truncate max-w-[80px] font-mono text-[8px] bg-slate-900/60 px-1.5 py-0.5 rounded">{query}</span>}
          {step.status === 'done' ? (
            <span className="ml-auto text-emerald-400 bg-emerald-950/40 p-0.5 rounded-full border border-emerald-500/30"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><polyline points="20 6 9 17 4 12"/></svg></span>
          ) : (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>
    )
  }
  
  if (step.type === 'tool_result') {
    return (
      <div className="ml-6 mb-1.5">
        <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-[#7C3AED] hover:underline flex items-center gap-1 transition font-bold uppercase tracking-wider">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          {expanded ? 'Hide tool output' : 'Show tool output'}
        </button>
        {expanded && (
          <pre className="text-[9px] text-slate-400 bg-slate-950 border border-black rounded-lg p-2.5 mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono shadow-[2px_2px_0px_#000]">
            {step.result}
          </pre>
        )}
      </div>
    )
  }
  
  if (step.type === 'needs_confirm') return null
  
  // Artifact created (plan/walkthrough)
  if (step.type === 'artifact_created') {
    const isPlan = step.artifact_type === 'plan'
    return (
      <div className={`my-1.5 rounded-xl px-3 py-2.5 text-xs border-2 border-black flex items-center gap-2.5 shadow-[2px_2px_0px_#000] hover:scale-102 transition ${isPlan ? 'bg-indigo-950/20 border-black text-indigo-300' : 'bg-emerald-950/20 border-black text-emerald-300'}`}>
        <span className="shrink-0 p-1.5 bg-black/25 rounded-lg text-white">
          {isPlan ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
          )}
        </span>
        <div className="min-w-0">
          <span className="font-extrabold uppercase tracking-wider text-[8px] flex items-center gap-1.5">{isPlan ? <><Map size={10} /> Plan Generated</> : <><Rocket size={10} /> Walkthrough Saved</>}</span>
          <span className="text-slate-300 text-[10px] truncate block font-medium mt-0.5">{step.title}</span>
        </div>
      </div>
    )
  }

  // Context saved
  if (step.type === 'context_saved') {
    return (
      <div className="my-1.5 rounded-xl px-3 py-2.5 text-xs border-2 border-black bg-violet-950/20 border-black text-violet-300 flex items-center gap-2.5 shadow-[2px_2px_0px_#000]">
        <span className="p-1.5 bg-black/25 rounded-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
        <div>
          <span className="font-extrabold uppercase tracking-wider text-[8px] flex items-center gap-1.5"><Book size={10} /> Memory Context Saved</span>
          <span className="text-slate-300 text-[10px] block mt-0.5 font-medium">{step.topic}</span>
        </div>
      </div>
    )
  }

  // Open browser
  if (step.type === 'open_browser' || (step.type === 'tool_call' && step.tool === 'open_browser')) {
    const url = step.args?.url || step.url || ''
    const reason = step.args?.reason || step.reason || ''
    return (
      <div className="my-1.5 rounded-xl px-3 py-2.5 text-xs border-2 border-black bg-cyan-950/20 border-black text-cyan-300 flex items-center gap-2.5 shadow-[2px_2px_0px_#000]">
        <span className="p-1.5 bg-black/25 rounded-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
        <div className="min-w-0 flex-1">
          <span className="font-extrabold uppercase tracking-wider text-[8px] flex items-center gap-1.5"><Globe size={10} /> Browser Session</span>
          <span className="text-cyan-400 font-mono text-[9px] truncate block mt-0.5">{url}</span>
          {reason && <span className="text-slate-400 text-[9px] block italic mt-0.5">{reason}</span>}
        </div>
      </div>
    )
  }
  
  if (step.type === 'message') {
    return (
      <div className="mt-2.5 rounded-2xl bg-slate-950/50 border-2 border-black px-3.5 py-3 text-xs text-slate-200 leading-relaxed shadow-[2px_2px_0px_#000]">
        <MarkdownContent content={step.content} />
      </div>
    )
  }
  
  if (step.type === 'error') {
    return (
      <div className="mt-1.5 rounded-2xl bg-red-950/40 border-2 border-red-500/40 px-3.5 py-3 text-xs text-red-300 flex items-start gap-2.5 shadow-[3px_3px_0px_rgba(239,68,68,0.15)]">
        <span className="p-1 bg-red-500/20 text-red-400 rounded-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>
        <div className="flex-1 min-w-0">
          <span className="font-extrabold uppercase tracking-wider text-[8px] block text-red-400 mb-0.5">Execution Interrupted</span>
          <p className="text-slate-300 leading-relaxed">{step.content}</p>
        </div>
      </div>
    )
  }
  
  return null
}

// Confirmation Dialog

function ConfirmDialog({ confirm, onAccept, onReject }) {
  const [showDiff, setShowDiff] = useState(true)
  if (!confirm) return null
  
  const icon = TOOL_ICONS[confirm.tool] || <Settings size={14} />
  const fileName = (confirm.args?.file_path || '').split(/[/\\]/).pop() || 'file'
  
  return (
    <div className="mx-1 my-2 rounded-2xl border-2 border-black bg-aeres-surface overflow-hidden shadow-[2px_2px_0px_#000] animate-bounce-subtle">
      <div className="flex items-center justify-between px-3 py-2 bg-amber-500 text-black border-b-2 border-black font-extrabold uppercase tracking-wider text-[10px]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> {icon}</span>
          <span>
            {confirm.tool === 'write_file' ? 'Write File' : confirm.tool === 'multi_edit_file' ? 'Multi-Edit' : 'Edit File'}
          </span>
        </div>
        <span className="font-mono text-[9px]">{fileName}</span>
      </div>
      
      <div className="px-3.5 py-3">
        {confirm.args?.description && (
          <p className="text-[10px] text-white/90 font-medium mb-3 leading-relaxed bg-black/10 p-2 rounded-lg border border-black/20">{confirm.args.description}</p>
        )}
        
        {(confirm.tool === 'edit_file' || confirm.tool === 'multi_edit_file') && (
          <button onClick={() => setShowDiff(!showDiff)} className="text-[9px] text-aeres-violet hover:underline mb-2 font-bold flex items-center gap-1">
            {showDiff ? '▾ Hide diff preview' : '▸ Show diff preview'}
          </button>
        )}
        
        {showDiff && confirm.tool === 'edit_file' && (
          <div className="bg-aeres-bg border-2 border-black rounded-xl p-2.5 mb-3 max-h-48 overflow-y-auto font-mono text-[9px] shadow-[2px_2px_0px_#000]">
            <div className="text-red-400 font-bold bg-red-950/20 px-1 py-0.5 rounded mb-1">
              {(confirm.args?.find || '').split('\n').map((l, i) => <div key={`d${i}`} className="truncate">- {l}</div>)}
            </div>
            <div className="text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded">
              {(confirm.args?.replace || '').split('\n').map((l, i) => <div key={`a${i}`} className="truncate">+ {l}</div>)}
            </div>
          </div>
        )}

        {showDiff && confirm.tool === 'multi_edit_file' && confirm.args?.edits?.map((edit, idx) => (
          <div key={idx} className="bg-aeres-bg border-2 border-black rounded-xl p-2.5 mb-3 max-h-48 overflow-y-auto font-mono text-[9px] shadow-[2px_2px_0px_#000]">
            <div className="text-aeres-muted mb-1.5 text-[8px] uppercase font-black tracking-widest border-b border-black/20 pb-1">Chunk {idx + 1}</div>
            <div className="text-red-400 font-bold bg-red-950/20 px-1 py-0.5 rounded mb-1">
              {(edit.find || '').split('\n').map((l, i) => <div key={`d${i}`} className="truncate">- {l}</div>)}
            </div>
            <div className="text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded">
              {(edit.replace || '').split('\n').map((l, i) => <div key={`a${i}`} className="truncate">+ {l}</div>)}
            </div>
          </div>
        ))}
        
        {showDiff && confirm.tool === 'write_file' && (
          <pre className="bg-aeres-bg border-2 border-black rounded-xl p-2.5 mb-3 max-h-48 overflow-y-auto text-[9px] text-white/80 whitespace-pre-wrap break-words font-mono shadow-[2px_2px_0px_#000]">
            {(confirm.args?.content || '').slice(0, 2000)}
            {(confirm.args?.content || '').length > 2000 ? '\n... (truncated)' : ''}
          </pre>
        )}
      </div>
      
      <div className="flex gap-2.5 px-3.5 pb-3">
        <button onClick={onAccept}
          className="flex-1 py-1.5 bg-emerald-500 text-black text-[10px] font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition flex items-center justify-center gap-1.5 uppercase cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
          Accept
        </button>
        <button onClick={onReject}
          className="flex-1 py-1.5 bg-red-500 text-black text-[10px] font-black rounded-full border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition flex items-center justify-center gap-1.5 uppercase cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reject
        </button>
      </div>
    </div>
  )

}

// Main Chat Component

export default function RagChat() {
  const chatMessages = useStore((s) => s.chatMessages)
  const appendChatMessage = useStore((s) => s.appendChatMessage)
  const clearChat = useStore((s) => s.clearChat)
  
  const mode = 'chat'
  const setMode = useStore((s) => s.setAgentMode)
  const agentRunning = useStore((s) => s.agentRunning)
  const setAgentRunning = useStore((s) => s.setAgentRunning)
  const agentSteps = useStore((s) => s.agentSteps)
  const appendAgentStep = useStore((s) => s.appendAgentStep)
  const clearAgentSteps = useStore((s) => s.clearAgentSteps)
  const agentMessages = useStore((s) => s.agentMessages)
  const appendAgentMessage = useStore((s) => s.appendAgentMessage)
  const pendingConfirm = useStore((s) => s.pendingConfirm)
  const setPendingConfirm = useStore((s) => s.setPendingConfirm)

  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const rootPath = useStore((s) => s.rootPath)
  
  const backendUrl = useStore((s) => s.backendUrl)
  const openTab = useStore((s) => s.openTab)

  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [attachedImages, setAttachedImages] = useState([])
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  // Voice Typing Speech Recognition state & hooks
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  // @Mentions Suggestions state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  // Catalyst Modal state
  const [showCatalystModal, setShowCatalystModal] = useState(false)
  const [catalystUrl, setCatalystUrl] = useState('')
  const [catalystQuery, setCatalystQuery] = useState('')
  const [streamedCatalystAnswer, setStreamedCatalystAnswer] = useState('')

  const WORKFLOWS = [
    {
      name: 'React UI',
      icon: <Palette size={10} />,
      desc: 'Build landing pages & UI',
      prompt: 'Create a modern React Landing Page with gorgeous CSS glassmorphism styling, responsive flex layouts, and custom theme tokens.'
    },
    {
      name: 'Snapshot',
      icon: <FlaskConical size={10} />,
      desc: 'Create mock snapshot tests',
      prompt: 'Analyze my file and generate comprehensive mock snapshot unit tests covering all functions and edge cases.'
    },
    {
      name: 'Optimize',
      icon: <Zap size={10} />,
      desc: 'Modernize & clean code',
      prompt: 'Refactor this file to implement asynchronous code execution, robust error boundary logic, and ES6+ standards.'
    },
    {
      name: 'Build',
      icon: <Hammer size={10} />,
      desc: 'Auto compile & run scripts',
      prompt: 'Inspect active file dependency imports, setup build packages, run compiles and fix syntax compilation errors.'
    },
    {
      name: 'Catalyst',
      icon: <Globe size={10} />,
      desc: 'Open-Source Catalyst Guide',
      prompt: '/catalyst '
    }
  ]

  // Interop event listeners for CodeCanvas right click custom menu
  useEffect(() => {
    const handleAddFile = (e) => {
      const { name } = e.detail
      setInput((prev) => prev + `@${name} `)
      const inp = document.querySelector('input[placeholder*="Tell me"], input[placeholder*="Ask about"]')
      if (inp) inp.focus()
    }

    const handleFocusChat = () => {
      const inp = document.querySelector('input[placeholder*="Tell me"], input[placeholder*="Ask about"]')
      if (inp) inp.focus()
    }

    const handleSendChat = async (e) => {
      setMode('chat')
      const prompt = e.detail
      setInput(prompt)
      setTimeout(async () => {
        const electron = window.electron
        if (!electron?.rag?.query) return
        setChatLoading(true)
        appendChatMessage({ role: 'user', content: prompt })
        try {
          const activeTab = useStore.getState().tabs.find((t) => t.id === useStore.getState().activeTabId)
          const context = activeTab?.content?.slice(0, 3000) || ''
          const data = await electron.rag.query(prompt, context)
          appendChatMessage({ role: 'assistant', content: data.answer || 'No answer.' })
        } finally {
          setChatLoading(false)
        }
      }, 50)
    }

    const handleSendAgent = async (e) => {
      setMode('agent')
      const prompt = e.detail
      setInput(prompt)
      setTimeout(async () => {
        const electron = window.electron
        if (!electron?.rag?.agentStream) return
        appendAgentMessage({ role: 'user', content: prompt })
        clearAgentSteps()
        setAgentRunning(true)
        try {
          const activeTab = useStore.getState().tabs.find((t) => t.id === useStore.getState().activeTabId)
          await electron.rag.agentStream({
            instruction: prompt,
            context: activeTab?.content?.slice(0, 3000) || '',
            filePath: activeTab?.path || '',
            rootPath: useStore.getState().rootPath || '',
            images: []
          })
        } catch (err) {
          appendAgentMessage({ role: 'assistant', content: `Error: ${err.message}` })
          setAgentRunning(false)
        }
      }, 50)
    }

    document.addEventListener('aeres:add-to-chat', handleAddFile)
    document.addEventListener('aeres:focus-chat', handleFocusChat)
    document.addEventListener('aeres:send-chat-prompt', handleSendChat)
    document.addEventListener('aeres:send-agent-prompt', handleSendAgent)

    return () => {
      document.removeEventListener('aeres:add-to-chat', handleAddFile)
      document.removeEventListener('aeres:focus-chat', handleFocusChat)
      document.removeEventListener('aeres:send-chat-prompt', handleSendChat)
      document.removeEventListener('aeres:send-agent-prompt', handleSendAgent)
    }
  }, [appendChatMessage, appendAgentMessage, clearAgentSteps, setAgentRunning, setMode])

  // Listen for agent step events
  useEffect(() => {
    if (!window.electron?.rag?.onAgentStep) return
    const off = window.electron.rag.onAgentStep((step) => {
      appendAgentStep(step)
    })
    return () => off()
  }, [appendAgentStep])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      appendChatMessage({ role: 'assistant', content: 'Speech recognition is not supported in this environment. Please type your message.' })
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onstart = () => {
      setListening(true)
    }
    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev ? prev + ' ' + transcript : transcript)
    }
    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
    }
    recognitionRef.current = rec
    rec.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  const toggleListening = () => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleInputChange = (val) => {
    setInput(val)
    const words = val.split(/\s+/)
    const lastWord = words[words.length - 1]
    if (lastWord.startsWith('@')) {
      setShowMentions(true)
      setMentionQuery(lastWord.slice(1))
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (fileName) => {
    const words = input.split(/\s+/)
    words.pop() // remove the '@...' word
    words.push(`@${fileName}`)
    setInput(words.join(' ') + ' ')
    setShowMentions(false)
  }

  const messages = mode === 'agent' ? agentMessages : (chatMessages || [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, agentSteps, pendingConfirm])

  useEffect(() => {
    const handler = (e) => {
      const { instruction } = e.detail
      if (!instruction) return
      
      setInput('')
      
      const newMsg = { role: 'user', content: instruction }
      appendAgentMessage(newMsg)
      
      clearAgentSteps()
      setAgentRunning(true)
      
      if (window.electron && window.electron.rag && window.electron.rag.agentStream) {
        window.electron.rag.agentStream({
          instruction,
          context: '',
          filePath: e.detail.filePath || '',
          rootPath: rootPath || '',
          conversation: [],
          images: []
        }).catch(err => {
          console.error('[RagChat] Agent Stream failed:', err)
          setAgentRunning(false)
        })
      }
    }
    
    window.addEventListener('aeres:trigger-agent-migration', handler)
    return () => window.removeEventListener('aeres:trigger-agent-migration', handler)
  }, [rootPath, appendAgentMessage, clearAgentSteps, setAgentRunning])

  // Listen for agent step events
  // Agent listener is now global in App.jsx — works from any panel

  const compressImage = (base64, callback) => {
    const img = new Image()
    img.src = base64
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const maxDim = 1024
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
      callback(compressedDataUrl)
    }
  }

  const handleImageAdd = (base64) => {
    compressImage(base64, (compressed) => {
      setAttachedImages((prev) => [...prev, compressed])
    })
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (event) => {
        handleImageAdd(event.target.result)
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    items.forEach((item) => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (event) => {
          handleImageAdd(event.target.result)
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || [])
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (event) => {
        handleImageAdd(event.target.result)
      }
      reader.readAsDataURL(file)
    })
  }

  // Agent mode: stream
  const handleCatalystSubmit = useCallback(async () => {
    if (!catalystUrl.trim() || !catalystQuery.trim()) return
    setShowCatalystModal(false)
    const repoName = catalystUrl.split('/').pop().replace('.git', '')
    
    // Add user message to UI
    const targetMsg = { role: 'user', content: `Run Catalyst on: ${catalystUrl}\nQuery: ${catalystQuery}` }
    if (mode === 'agent') appendAgentMessage(targetMsg)
    else appendChatMessage(targetMsg)

    setChatLoading(true)
    setStreamedCatalystAnswer('**Ingesting repository...**\n*Downloading codebase, parsing Abstract Syntax Trees, and generating vector embeddings. This may take up to a minute for large repositories.*')
    try {
      // 1. Ingest
      const res = await fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/ingest-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: catalystUrl })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to ingest repository')
      }
      
      const statusMsg = { role: 'assistant', content: `**Catalyst**: Successfully ingested ${repoName}. Mapping architecture and querying...` }
      if (mode === 'agent') appendAgentMessage(statusMsg)
      else appendChatMessage(statusMsg)

      // 2. Query Text and Diagram concurrently
      setStreamedCatalystAnswer('*Analyzing architectural patterns... (Waiting for AI)*') 
      
      const dPromise = fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/diagram-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_name: repoName, issue_text: catalystQuery })
      }).then(res => res.json()).catch(err => ({ diagram_data: null }))

      let fullAnswer = ""
      
      // Try streaming first, fall back to non-streaming
      try {
        const qRes = await fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/query-issue-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_name: repoName, issue_text: catalystQuery })
        })

        if (!qRes.ok) throw new Error('Stream endpoint returned ' + qRes.status)

        const reader = qRes.body.getReader()
        const decoder = new TextDecoder("utf-8")
        let firstChunkReceived = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (!firstChunkReceived) {
            fullAnswer = "" // Clear the placeholder
            firstChunkReceived = true
          }
          fullAnswer += chunk
          setStreamedCatalystAnswer(fullAnswer)
        }
      } catch (streamErr) {
        console.warn('[Catalyst] Stream failed, falling back to non-stream:', streamErr.message)
        setStreamedCatalystAnswer('*Stream unavailable — using standard query...*')
        const fallbackRes = await fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/query-issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_name: repoName, issue_text: catalystQuery })
        })
        const fallbackData = await fallbackRes.json()
        fullAnswer = fallbackData.answer || 'No architecture plan generated.'
      }

      const diagramResult = await dPromise
      
      const resultMsg = { 
        role: 'assistant', 
        content: fullAnswer || 'No architecture plan generated.',
        diagramData: diagramResult.diagram_data
      }
      
      if (mode === 'agent') appendAgentMessage(resultMsg)
      else appendChatMessage(resultMsg)
    } catch (err) {
      console.error(err)
      const errMsg = { role: 'assistant', content: `**Catalyst Error**: ${err.message}` }
      if (mode === 'agent') appendAgentMessage(errMsg)
      else appendChatMessage(errMsg)
    } finally {
      setChatLoading(false)
      setStreamedCatalystAnswer('')
      setCatalystUrl('')
      setCatalystQuery('')
    }
  }, [catalystUrl, catalystQuery, backendUrl, mode, appendAgentMessage, appendChatMessage])

  const handleAgentSend = useCallback(async (imagesToSend, customQuery) => {
    const e = window.electron
    if (!e?.rag?.agentStream) return
    
    const activeTab = tabs.find((t) => t.id === activeTabId)
    
    clearAgentSteps()
    setAgentRunning(true)
    
    await e.rag.agentStream({
      instruction: customQuery || input,
      context: activeTab?.content?.slice(0, 3000) || '',
      filePath: activeTab?.path || '',
      rootPath: rootPath || '',
      conversation: agentMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      images: imagesToSend || [],
    })
  }, [input, tabs, activeTabId, rootPath, agentMessages])

  // Regular chat
  const handleChatSend = useCallback(async () => {
    const e = window.electron
    if (!e?.rag?.query) return
    
    setChatLoading(true)
    try {
      const activeTab = tabs.find((t) => t.id === activeTabId)
      const context = activeTab?.content?.slice(0, 3000) || ''
      const data = await e.rag.query(input, context)
      appendChatMessage({ role: 'assistant', content: data.answer || 'No answer.' })
    } finally {
      setChatLoading(false)
    }
  }, [input, tabs, activeTabId, appendChatMessage])

  const handleSend = useCallback(async (customQuery) => {
    const q = (typeof customQuery === 'string' ? customQuery : input).trim()
    const imgs = [...attachedImages]
    if ((!q && imgs.length === 0) || agentRunning) return
    
    if (typeof customQuery !== 'string') {
      setInput('')
    }
    setAttachedImages([])
    
    const newMsg = { 
      role: 'user', 
      content: q + (imgs.length > 0 ? `\n\n[Attached ${imgs.length} image(s)]` : '') 
    }

    if (mode === 'agent') {
      appendAgentMessage(newMsg)
    } else {
      appendChatMessage(newMsg)
    }
    
    try {
      if (q.startsWith('/ingest-repo ')) {
        const url = q.replace('/ingest-repo ', '').trim()
        setChatLoading(true)
        const res = await fetch(`${backendUrl || 'http://localhost:8000'}/api/catalyst/ingest-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ github_url: url })
        })
        const data = await res.json()
        setChatLoading(false)
        if (mode === 'agent') {
          appendAgentMessage({ role: 'assistant', content: data.message || data.detail || 'Ingestion complete.' })
        } else {
          appendChatMessage({ role: 'assistant', content: data.message || data.detail || 'Ingestion complete.' })
        }
        return
      }

      if (q.startsWith('/catalyst ')) {
        const parts = q.replace('/catalyst ', '').trim().split(' ')
        const repoName = parts[0]
        const issueText = parts.slice(1).join(' ')
        setChatLoading(true)
        setStreamedCatalystAnswer('*Analyzing architectural patterns... (Waiting for AI)*') 
        
        try {
          const dPromise = fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/diagram-blueprint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_name: repoName, issue_text: issueText })
          }).then(res => res.json()).catch(err => ({ diagram_data: null }))
          
          const qRes = await fetch(`${backendUrl || 'http://localhost:8008'}/api/catalyst/query-issue-stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_name: repoName, issue_text: issueText })
          })

          if (!qRes.ok) throw new Error('Failed to query architecture')

          const reader = qRes.body.getReader()
          const decoder = new TextDecoder("utf-8")
          let fullAnswer = ""
          let firstChunkReceived = false

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            if (!firstChunkReceived) {
              fullAnswer = ""
              firstChunkReceived = true
            }
            fullAnswer += chunk
            setStreamedCatalystAnswer(fullAnswer)
          }

          const diagramResult = await dPromise
          const resultMsg = { 
            role: 'assistant', 
            content: fullAnswer || 'No architecture plan generated.',
            diagramData: diagramResult.diagram_data
          }

          setChatLoading(false)
          setStreamedCatalystAnswer('')
          
          if (mode === 'agent') {
            appendAgentMessage(resultMsg)
          } else {
            appendChatMessage(resultMsg)
          }
        } catch (err) {
          setChatLoading(false)
          setStreamedCatalystAnswer('')
          if (mode === 'agent') appendAgentMessage({ role: 'assistant', content: err.message })
          else appendChatMessage({ role: 'assistant', content: err.message })
        }
        return
      }

      if (mode === 'agent') {
        await handleAgentSend(imgs, q)
      } else {
        await handleChatSend()
      }
    } catch (err) {
      console.error('[RagChat] error:', err)
      if (mode === 'agent') {
        appendAgentMessage({ role: 'assistant', content: `Error: ${err.message}` })
      } else {
        appendChatMessage({ role: 'assistant', content: `Error: ${err.message}` })
      }
      setAgentRunning(false)
    }
  }, [input, attachedImages, agentRunning, mode, handleAgentSend, handleChatSend, appendChatMessage, appendAgentMessage])

  // Accept file change
  const handleAccept = useCallback(async () => {
    if (!pendingConfirm) return
    const e = window.electron
    const res = await e.rag.applyAgentEdit({ tool: pendingConfirm.tool, args: pendingConfirm.args })
    
    if (res.success) {
      appendAgentStep({ type: 'tool_result', tool: pendingConfirm.tool, result: `Applied to ${pendingConfirm.args.file_path}`, id: pendingConfirm.id, status: 'done' })
      // Refresh the file in editor if open
      const filePath = pendingConfirm.args.file_path
      const tab = tabs.find(t => t.path === filePath)
      if (tab && e?.fs?.readFile) {
        try {
          const newContent = await e.fs.readFile(filePath)
          useStore.getState().setTabContent(tab.id, newContent)
        } catch {}
      }
      
      // Notify backend of approval
      if (backendUrl) {
        await fetch(`${backendUrl}/api/rag/confirm-edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pendingConfirm.id, action: 'approve', result: `File edit successfully applied: ${filePath}` })
        }).catch(err => console.error('Failed to notify backend confirm-edit approve', err))
      }
    } else {
      appendAgentStep({ type: 'tool_result', tool: pendingConfirm.tool, result: `Failed: ${res.error}`, id: pendingConfirm.id, status: 'done' })
      
      // Notify backend of failure (acts as a reject so loop doesn't block)
      if (backendUrl) {
        await fetch(`${backendUrl}/api/rag/confirm-edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pendingConfirm.id, action: 'reject', result: `Failed to apply edit: ${res.error}` })
        }).catch(err => console.error('Failed to notify backend confirm-edit fail', err))
      }
    }
    setPendingConfirm(null)
  }, [pendingConfirm, tabs, backendUrl])

  const handleReject = useCallback(async () => {
    if (!pendingConfirm) return
    appendAgentStep({ type: 'tool_result', tool: pendingConfirm.tool, result: 'Rejected by user', id: pendingConfirm.id, status: 'done' })
    
    // Notify backend of rejection
    if (backendUrl) {
      await fetch(`${backendUrl}/api/rag/confirm-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingConfirm.id, action: 'reject', result: 'User rejected the edit' })
      }).catch(err => console.error('Failed to notify backend confirm-edit reject', err))
    }
    setPendingConfirm(null)
  }, [pendingConfirm, backendUrl])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div 
      className="flex h-full flex-col bg-aeres-bg animate-fade-in relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Mode Header */}
      <div className="flex p-2 gap-1.5 bg-slate-950/40 border-b border-aeres-border shrink-0">
        <div className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 bg-[#7C3AED] text-black shadow-[2px_2px_0px_#000]">
          <MessageSquare size={12} /> Aeres AI Assistant
        </div>
      </div>

      {/* Active file indicator */}
      {activeTab && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 border-b border-aeres-border bg-aeres-surface/20 shrink-0">
          <span className="p-1 bg-aeres-violet/10 text-aeres-violet rounded border border-aeres-violet/20 flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-200 font-extrabold truncate flex items-center gap-1.5">
              {activeTab.name}
              <span className="text-[7.5px] text-aeres-violet uppercase font-black tracking-widest bg-aeres-violet/10 px-1 py-0.5 rounded border border-aeres-violet/20">Active</span>
            </div>
            <div className="text-[8px] text-slate-500 truncate font-mono mt-0.5">{activeTab.path}</div>
          </div>
        </div>
      )}
      
      {/* Scrollable chat body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4"
      >
        {/* Welcome screen for empty state */}
        {messages.length === 0 && agentSteps.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-6 gap-3 select-none">
            <div className="w-full max-w-[290px] border-2 border-black bg-aeres-surface/30 p-4 rounded-3xl shadow-[2px_2px_0px_#000] text-center rotate-[-1deg] hover:rotate-0 transition-transform duration-300">
              <div className="mx-auto w-11 h-11 mb-3 flex items-center justify-center bg-aeres-violet/20 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000] text-lg text-aeres-violet">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white mb-1.5">
                Aeres AI Assistant
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Chat with our context-aware assistant to explain code, design mock data, or refactor layouts.
              </p>
            </div>

              <div className="text-left w-full max-w-[290px] text-[10px] text-aeres-muted mt-2 p-3.5 bg-aeres-surface/30 border-2 border-black rounded-2xl shadow-[2px_2px_0px_#000] space-y-2.5">
                <p className="text-slate-500 font-extrabold uppercase tracking-widest text-[8px] mb-1">Aeres Chat Features:</p>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-aeres-violet shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-semibold">Query global codebase context instantly</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-aeres-violet shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-semibold">Explain codebase architecture & code stubs</span>
                </div>
              </div>
          </div>
        )}
        
        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}>
            <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-1.5 ${msg.role === 'user' ? 'text-aeres-violet/90' : 'text-slate-400'}`}>
              {msg.role === 'user' ? <>You <User size={10} /></> : msg.isAgentResult ? <><Zap size={10} /> Aeres Agent Result</> : <><Sparkles size={10} /> Aeres Assistant</>}
            </span>
            <div className={`max-w-[95%] rounded-2xl border-2 border-black px-3.5 py-2.5 text-xs leading-relaxed overflow-hidden shadow-[2px_2px_0px_#000] hover:scale-[1.01] transition-all ${
              msg.role === 'user'
                ? 'bg-aeres-violet/15 text-white border-aeres-violet/40'
                : msg.isAgentResult
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-[2.5px_2.5px_0px_rgba(16,185,129,0.25)]'
                : 'bg-slate-950/65 text-slate-200 border-black/80'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownContent content={msg.content} />
                  {msg.diagramData && <WorkflowDiagram data={msg.diagramData} />}
                </>
              ) : (
                <span className="font-semibold whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
  
        {/* Chat Loading Skeleton */}
        {chatLoading && (
          <div className="flex flex-col items-start space-y-1 animate-pulse relative group">
            <span className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-slate-400 flex items-center gap-1.5"><Sparkles size={10} /> Aeres Assistant</span>
            <div className="rounded-2xl bg-slate-950/50 border-2 border-black px-4 py-3 shadow-[2px_2px_0px_#000] flex flex-col gap-3 max-w-full">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">
                  {streamedCatalystAnswer ? "Catalyst Thinking..." : "Synthesizing..."}
                </span>
                
                <button
                  onClick={() => {
                    setChatLoading(false)
                    window.electron?.rag?.interrupt();
                  }}
                  className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/40 rounded-full text-[8px] font-black uppercase hover:bg-red-500 hover:text-black transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
                >
                  Interrupt
                </button>
              </div>

              {streamedCatalystAnswer && (
                <div className="text-sm text-slate-300 w-full overflow-hidden markdown-body" style={{ minWidth: 300 }}>
                  <MarkdownContent content={streamedCatalystAnswer} />
                </div>
              )}
            </div>
          </div>
        )}
  
        {/* Agent steps */}
        {agentSteps.length > 0 && (
          <div className="flex flex-col items-start w-full space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-slate-400 flex items-center gap-1.5">
              <Zap size={12} className="animate-pulse text-aeres-violet" /> Agent Execution Console
            </span>
            <div className="w-full rounded-2xl border-2 border-black bg-slate-950/30 px-3.5 py-3 shadow-[2px_2px_0px_#000]">
              <div className="border-l-2 border-[#7C3AED]/30 pl-3 space-y-2">
                {agentSteps.map((step, i) => (
                  <AgentStep key={i} step={step} />
                ))}
              </div>
            </div>
          </div>
        )}
  
        <ConfirmDialog confirm={pendingConfirm} onAccept={handleAccept} onReject={handleReject} />
  
        {agentRunning && !pendingConfirm && (
          <div className="flex items-center gap-3 text-[10px] text-slate-500 pl-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-aeres-violet animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-extrabold uppercase tracking-widest text-[8px] text-aeres-violet animate-pulse">Agent running...</span>
            
            <button
              onClick={() => {
                setAgentRunning(false)
                window.electron?.rag?.interrupt();
              }}
              className="px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/40 rounded-full text-[8px] font-black uppercase hover:bg-red-500 hover:text-black transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              Interrupt
            </button>
          </div>
        )}
      </div>
  
      {/* Attached Images Previews */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 px-3 py-2 bg-slate-950/40 border-t border-aeres-border overflow-x-auto shrink-0 max-h-20">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative group w-12 h-12 rounded-xl border border-slate-700/50 overflow-hidden bg-slate-950 flex-shrink-0">
              <img src={img} className="w-full h-full object-cover" />
              <button
                onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute top-0.5 right-0.5 bg-red-500 text-black rounded-full p-0.5 hover:bg-red-400 transition opacity-0 group-hover:opacity-100 flex items-center justify-center animate-fade-in"
                style={{ width: '12px', height: '12px' }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
  
      {/* Mentions Dropdown Menu */}
      {showMentions && (
        <div className="absolute bottom-16 left-2 right-2 max-h-40 overflow-y-auto bg-slate-950 border-2 border-black rounded-2xl shadow-2xl p-1 z-50 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1.5 border-b border-black/20 mb-1">Reference Open File</div>
          {tabs.filter(t => t.name.toLowerCase().includes(mentionQuery.toLowerCase())).map((tab) => (
            <button
              key={tab.id}
              onClick={() => insertMention(tab.name)}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-200 hover:bg-aeres-violet hover:text-black hover:font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="truncate">{tab.name}</span>
            </button>
          ))}
          {tabs.filter(t => t.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
            <div className="text-slate-500 text-[10px] italic px-2.5 py-1.5">No matching active files.</div>
          )}
        </div>
      )}
  
      {/* Catalyst Modal */}
      {showCatalystModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-black rounded-3xl p-5 w-full max-w-sm shadow-[4px_4px_0px_#000] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                <Globe className="text-[#7C3AED]" size={16} /> Open-Source Catalyst
              </h3>
              <button 
                onClick={() => setShowCatalystModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium">
              Enter a GitHub URL and describe the issue or architectural change you want to make. Catalyst will parse the entire repository layout and generate a Staff Engineer execution plan.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Repository URL</label>
                <input 
                  type="text" 
                  placeholder="https://github.com/user/repo" 
                  value={catalystUrl}
                  onChange={e => setCatalystUrl(e.target.value)}
                  className="w-full bg-black/50 border-2 border-black rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED] shadow-[2px_2px_0px_#000]"
                />
              </div>
              
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Goal / Issue</label>
                <textarea 
                  placeholder="I want to add a dark mode toggle button to the layout. Where should I put the state management?" 
                  value={catalystQuery}
                  onChange={e => setCatalystQuery(e.target.value)}
                  rows={3}
                  className="w-full bg-black/50 border-2 border-black rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#7C3AED] shadow-[2px_2px_0px_#000] resize-none"
                />
              </div>
            </div>
            
            <button 
              onClick={handleCatalystSubmit}
              disabled={!catalystUrl.trim() || !catalystQuery.trim() || chatLoading}
              className="w-full mt-2 bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-50 disabled:hover:bg-[#7C3AED] text-black font-black uppercase tracking-widest text-[10px] py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-[1px_1px_0px_#000] transition-all flex justify-center items-center gap-2"
            >
              {chatLoading ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Rocket size={14} />}
              Launch Catalyst
            </button>
          </div>
        </div>
      )}

      {/* Workflows Pill Ribbon */}
      {!agentRunning && (
        <div className="flex gap-1.5 px-3 py-2 bg-slate-950/20 border-t border-aeres-border overflow-x-auto shrink-0 scrollbar-hide">
          {WORKFLOWS.map((wf, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (wf.name === 'Catalyst') {
                  setShowCatalystModal(true)
                } else {
                  setMode('agent')
                  setInput(wf.prompt)
                  if (!wf.prompt.endsWith(' ')) {
                    // Wait for state to update before sending
                    setTimeout(() => handleSend(wf.prompt), 50)
                  } else {
                    setTimeout(() => {
                      document.querySelector('input[type="text"]')?.focus()
                    }, 50)
                  }
                }
              }}
              className="flex-shrink-0 px-3 py-1 rounded-full border-2 border-black bg-slate-950/40 text-[9px] text-slate-400 hover:text-white hover:bg-aeres-violet hover:text-black font-extrabold uppercase transition flex items-center gap-1 hover:scale-105 active:scale-95 shadow-[2px_2px_0px_#000] cursor-pointer"
              title={wf.desc}
            >
              {wf.icon}
              <span>{wf.name}</span>
            </button>
          ))}
        </div>
      )}
  
      {/* Input Tray */}
      <div className="flex shrink-0 items-center gap-2 border-t border-aeres-border bg-slate-950/40 p-2 relative shrink-0">
        
        {/* Pulsing Active Voice visualizer bubble */}
        {listening && (
          <div className="absolute top-[-36px] left-2 right-2 h-8 rounded-full border-2 border-black bg-red-500 text-black text-[9px] font-black flex items-center justify-between px-4 shadow-[2px_2px_0px_#000] animate-bounce-subtle z-40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-black animate-ping" />
              <span className="uppercase tracking-widest">Listening... speak now</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 bg-black animate-[pulse_0.4s_infinite]" style={{ height: '8px' }} />
              <div className="w-1 bg-black animate-[pulse_0.6s_infinite]" style={{ height: '14px' }} />
              <div className="w-1 bg-black animate-[pulse_0.3s_infinite]" style={{ height: '10px' }} />
              <div className="w-1 bg-black animate-[pulse_0.5s_infinite]" style={{ height: '16px' }} />
              <div className="w-1 bg-black animate-[pulse_0.4s_infinite]" style={{ height: '6px' }} />
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={agentRunning}
          className="p-1.5 rounded-xl border-2 border-black bg-aeres-surface/20 text-aeres-muted hover:text-white hover:bg-aeres-violet hover:text-black transition shadow-[2px_2px_0px_#000] focus:outline-none disabled:opacity-50 flex items-center justify-center cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000]"
          title="Upload image"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
  
        {/* Voice typing microphone button */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={agentRunning}
          className={`p-1.5 rounded-xl border-2 border-black transition focus:outline-none disabled:opacity-50 flex items-center justify-center cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] ${
            listening
              ? 'bg-red-500 text-black animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]'
              : 'bg-slate-950/20 text-slate-400 hover:text-white hover:bg-aeres-violet hover:text-black shadow-[2px_2px_0px_#000]'
          }`}
          title={listening ? 'Listening... click to stop' : 'Voice prompt (speech-to-text)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {listening ? (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </>
            )}
          </svg>
        </button>
  
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={agentRunning}
          placeholder={mode === 'agent' ? 'Tell me what to build...' : 'Ask about your code…'}
          className="flex-1 rounded-xl border-2 border-black bg-aeres-surface/50 px-3 py-1.5 text-xs text-aeres-text placeholder:text-aeres-muted/60 focus:border-[#7C3AED] focus:outline-none disabled:opacity-50 shadow-[2px_2px_0px_#000]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={agentRunning || (!input.trim() && attachedImages.length === 0)}
          className="rounded-xl border-2 border-black bg-aeres-violet px-3 py-1.5 text-xs font-black text-black transition hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] disabled:opacity-40 shadow-[2px_2px_0px_#000] cursor-pointer uppercase tracking-wider"
        >
          {mode === 'agent' ? <span className="flex items-center gap-1"><Zap size={12} /> Run</span> : 'Send'}
        </button>
      </div>
    </div>
  )
}
