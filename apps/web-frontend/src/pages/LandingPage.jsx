import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'
import SmartDownload from '../components/SmartDownload.jsx'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'
import Mermaid from '../components/Mermaid.jsx'

const OS_SCRIPTS = {
  macos: {
    name: 'macOS',
    command: 'git clone https://github.com/LAN-SHLOK/Aeres-IDE.git && cd Aeres-IDE',
    daemon: 'npm install && npm run tauri dev',
    shell: 'bash'
  },
  windows: {
    name: 'Windows',
    command: 'git clone https://github.com/LAN-SHLOK/Aeres-IDE.git && cd Aeres-IDE',
    daemon: 'npm install && npm run tauri dev',
    shell: 'powershell'
  },
  linux: {
    name: 'Linux',
    command: 'git clone https://github.com/LAN-SHLOK/Aeres-IDE.git && cd Aeres-IDE',
    daemon: 'npm install && npm run tauri dev',
    shell: 'bash'
  }
}

// Real-time collaborative user simulation cursors - named after the exact creators!
const COLLABORATORS = [
  { name: 'Shlok Patel', color: '#ff8ba7', x: [50, 180, 240, 90, 50], y: [120, 40, 200, 150, 120] },
  { name: 'Rutvik Gudaliya', color: '#2dd4bf', x: [400, 310, 480, 350, 400], y: [250, 90, 150, 220, 250] },
  { name: 'Vinit Panchal', color: '#c084fc', x: [600, 450, 520, 580, 600], y: [80, 180, 60, 120, 80] }
]

// Removed SIMULATED_DEPS array

function ScrollHUD() {
  const { scrollYProgress } = useScroll()
  const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 90 })
  const [percent, setPercent] = useState(0)
  
  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
        setPercent(Math.round(v * 100))
    })
    return unsub
  }, [scrollYProgress])
  
  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-center gap-2 bg-[#13141f] border border-white/10 p-2.5 rounded-2xl shadow-2xl font-mono">
      <div className="relative h-10 w-10 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full rotate-[-90deg]">
          <circle cx="50" cy="50" r="45" stroke="#1c1d2e" strokeWidth="6" fill="transparent" />
          <motion.circle cx="50" cy="50" r="45" stroke="#ff8ba7" strokeWidth="6" fill="transparent" style={{ pathLength }} strokeDasharray="0 1" />
        </svg>
        <span className="text-[9px] font-black text-white">{percent}%</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [searchParams] = useSearchParams()
  const { isSignedIn, isLoaded } = useUser()
  const downloadRedirected = useRef(false)
  const [activeOs, setActiveOs] = useState('macos')
  const [copied, setCopied] = useState(false)

  // Scrollytelling Step tracking state
  const [scrollyStep, setScrollyStep] = useState(0)
  
  // Visualizer states removed for actual feature rewrite

  // Interactive AST Playground States (Removed for RAG Chat Replacement)
  
  // FAQ accordion state
  const [activeFaq, setActiveFaq] = useState(null)

  const downloadQuery = searchParams.get('download') === 'true'

  useEffect(() => {
    if (!downloadQuery) {
      downloadRedirected.current = false
      return
    }
    if (!isLoaded || isSignedIn) return
    if (downloadRedirected.current) return
    downloadRedirected.current = true
    redirectToAuthForDownload()
  }, [downloadQuery, isLoaded, isSignedIn])

  const copyScript = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // copyUpdateCommand removed

  // Expressive split character words without emojis
  const renderExpressiveTitle = () => {
    const text = "Code at the speed of thought."
    return text.split(" ").map((word, i) => (
      <span
        key={i}
        className="char-reveal inline-block text-white"
        style={{ animationDelay: `${i * 0.1}s` }}
      >
        {word}&nbsp;
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-[#09090e] font-body text-white selection:bg-purple-500/20 selection:text-purple-300 overflow-x-hidden relative">
      
      {/* Ambient glass bubbles removed as requested */}



      <Navbar />
      <ScrollHUD />

      {/* Hero Banner styled as a massive Y2K Card */}
      <section className="pt-40 pb-20 px-6 max-w-[1200px] mx-auto z-10 relative">
        <div className="bg-[#13141f] border-[3px] border-[#ff8ba7] rounded-[2rem] p-10 md:p-16 text-center relative overflow-hidden">
          
          {/* Cursors Removed */}

          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-8 font-mono">
            welcome_to_aeres
          </span>

          {/* Expressive Typography Animation Header */}
          <h1 className="font-display text-[clamp(2.3rem,6.5vw,5rem)] font-extrabold tracking-tight leading-[1] text-white mb-8">
            {renderExpressiveTitle()} <br/>
            <span className="text-black bg-[#ff8ba7] px-6 py-2 inline-block rounded-full italic font-bold mt-2">
              provisioned locally.
            </span>
          </h1>

          <p className="text-white/75 text-base max-w-[620px] mx-auto leading-relaxed font-sans font-semibold mt-6 mb-10">
            Aeres is a high-performance offline development environment featuring self-correcting multi-agent loops and AST-level mutation sweeper diagnostics. Optimized to keep coder eyes fresh and workspaces safe.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <SmartDownload className="bg-[#2dd4bf] border-[3px] border-black text-black rounded-full px-6 py-3.5 text-xs uppercase tracking-wider font-display font-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000000] transition-all" />
            <Link
              to="/docs"
              className="bg-[#1b1c2b] border-[3px] border-black text-white font-black px-6 py-3.5 rounded-full text-xs uppercase tracking-wider font-display no-underline shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000000] transition-all"
            >
              read_manual.log
            </Link>
          </div>

          {/* Scroll Down Hint Icon */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="mt-14 flex flex-col items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
            onClick={() => {
              const nextSection = document.getElementById('scrolly-features');
              if (nextSection) nextSection.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-white/50">Scroll to Explore</span>
            <div className="w-6 h-10 rounded-full border border-white/10 bg-[#1b1c2b] flex justify-center p-1.5 shadow-2xl">
              <motion.div 
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#ff8ba7]" 
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Local-First CLI Terminal Dashboard */}
      <section className="relative px-6 py-12 max-w-[1400px] mx-auto z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            terminal_daemon
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Local-First Architecture
          </h2>
        </div>

        {/* terminal dialogue */}
        <div className="max-w-[760px] mx-auto border-[3px] border-[#ff8ba7] rounded-[2rem] bg-[#13141f] overflow-hidden">
          <div className="bg-[#1b1c2b] px-6 py-3.5 border-b-[3px] border-[#ff8ba7] flex items-center justify-between gap-4 font-display">
            <div className="flex gap-2">
              {Object.keys(OS_SCRIPTS).map(os => {
                const isSelected = activeOs === os
                const activeStyles = {
                  macos: 'bg-[#ff8ba7] text-black border-[3px] border-black shadow-[3px_3px_0px_#000000]',
                  windows: 'bg-[#ff8ba7] text-black border-[3px] border-black shadow-[3px_3px_0px_#000000]',
                  linux: 'bg-[#ff8ba7] text-black border-[3px] border-black shadow-[3px_3px_0px_#000000]'
                }
                return (
                  <button
                    key={os}
                    onClick={() => setActiveOs(os)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-mono font-black tracking-wide transition-all ${isSelected ? activeStyles[os] : 'text-white/60 bg-[#1b1c2b] border-[3px] border-black shadow-[3px_3px_0px_#000000]'}`}
                  >
                    {OS_SCRIPTS[os].name}
                  </button>
                )
              })}
            </div>
            <span className="text-[10px] font-mono font-black text-white">
              System: {OS_SCRIPTS[activeOs].shell}
            </span>
          </div>

          <div className="p-6 font-mono text-xs overflow-x-auto bg-[#13141f]">
            <pre className="text-white font-extrabold leading-relaxed select-all">
{`# 1. Clone the open-source repository locally
$ ${OS_SCRIPTS[activeOs].command}

# 2. Launch Tauri desktop app & Python FastAPI sidecar
$ ${OS_SCRIPTS[activeOs].daemon}`}
            </pre>
          </div>

          <div className="bg-[#1b1c2b] px-6 py-4 border-t-[3px] border-[#ff8ba7] flex items-center justify-between gap-4 font-display">
            <span className="text-[10px] font-mono font-black text-white/50">
              Aeres Core Engine v1.0.4
            </span>
            <button
              onClick={() => copyScript(OS_SCRIPTS[activeOs].command)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-display font-black uppercase tracking-wider transition-all border-[3px] border-black ${copied ? 'bg-emerald-300 text-black shadow-[2px_2px_0px_#000000] translate-y-0.5' : 'bg-emerald-300 text-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000000]'}`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy Script
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Split-Screen Interactive Scrollytelling Showcase */}
      <section id="scrolly-features" className="relative px-6 py-24 max-w-[1400px] mx-auto z-10 font-display">
        
        <div className="mb-20 flex flex-col md:flex-row justify-between items-end gap-10 border-b-4 border-black pb-12">
          <div>
            <div className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.5em] text-[#ff8ba7]">Interactive Diagnostics Showcase // v1.0.4</div>
            <h2 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-black tracking-tight leading-[0.85] text-white">
              Core <br/><span className="text-[#ff8ba7] italic font-bold">Diagnostics.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-white/60 text-xs font-bold leading-relaxed text-right md:mb-4 font-sans">
            Explore the core diagnostic panels of Aeres IDE. Understand your codebase structure, track error causality, and ensure software resilience.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          {/* Left Column: Interactive Scrolling Steps */}
          <div className="w-full lg:w-1/2 space-y-8">
            
            {/* Step 1: Project Health AI */}
            <div 
              onClick={() => setScrollyStep(0)}
              onMouseEnter={() => setScrollyStep(0)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 0 ? 'bg-[#18181b] border-[3px] border-[#ff8ba7]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#ff8ba7]">
                <span className="px-3 py-1 bg-[#ff8ba7] text-black border border-white/10 rounded-full">STAGE 01</span>
                <span>AI SELF-HEALING</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Project Health Agent</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Aeres constantly monitors your workspace health. When an anomaly is detected, our integrated Groq LLM agent can automatically trace the issue and apply self-healing patches directly to your local files.
              </p>
            </div>

            {/* Step 2: Dependency Radar */}
            <div 
              onClick={() => setScrollyStep(1)}
              onMouseEnter={() => setScrollyStep(1)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 1 ? 'bg-[#18181b] border-[3px] border-[#fef08a]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#eab308]">
                <span className="px-3 py-1 bg-[#fef08a] text-black border border-white/10 rounded-full">STAGE 02</span>
                <span>DEPENDENCY RADAR</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Catalyst Batch Modernize</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Identify deprecated or abandoned packages instantly. Our Catalyst orchestrator uses AST parsing and vector-based rule generation to batch modernize all usages of a legacy dependency across your entire codebase in seconds.
              </p>
            </div>

            {/* Step 3: Causal Blame Maps */}
            <div 
              onClick={() => setScrollyStep(2)}
              onMouseEnter={() => setScrollyStep(2)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 2 ? 'bg-[#18181b] border-[3px] border-[#2dd4bf]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#2dd4bf]">
                <span className="px-3 py-1 bg-[#2dd4bf] text-black border border-white/10 rounded-full">STAGE 03</span>
                <span>GIT TELEMETRY</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Causal Blame Maps</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Move beyond standard git blame. Aeres visualizes regressions by mapping the causal chain of file modifications across your repository history, allowing you to trace exactly when and where a bug was introduced.
              </p>
            </div>

          </div>

          {/* Right Column: Sticky Mock IDE visualizer */}
          <div className="lg:w-[55%] relative group">
            <div className="relative bg-[#18181b] border-[3px] border-[#ff8ba7] rounded-[2rem] h-full min-h-[450px] overflow-hidden flex flex-col">
              
              {/* Window Controls */}
              <div className="bg-[#18181b] px-4 py-3 border-b-[3px] border-[#ff8ba7] flex items-center justify-between font-display">
                <div className="flex gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ff8ba7]"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#fef08a]"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-[#2dd4bf]"></div>
                </div>
                <span className="text-[10px] font-mono font-black text-white/40">aeres-ide // active</span>
              </div>

              {/* IDE Content Canvas */}
              <div className="p-6 bg-[#13141f] min-h-[420px] flex flex-col justify-between font-mono text-xs relative">
                
                {/* Visualizer 0: Project Health AI */}
                {scrollyStep === 0 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#ff8ba7] block mb-4 uppercase">Groq AI Self-Healing Loop</span>
                    
                    <div className="w-full h-56 border border-white/10 rounded-3xl bg-[#09090e] p-5 font-mono text-[10px] text-white/80 overflow-y-auto leading-relaxed relative">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-white/10 text-white/50">
                        <span>1</span>
                        <span className="text-[#c084fc]">const</span> <span className="text-[#2dd4bf]">handleFixIssue</span> = <span className="text-[#ff8ba7]">async</span> () {'=>'} {'{'}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">2</span>
                        <span className="pl-4"><span className="text-[#fef08a]">setResolving</span>(<span className="text-[#ff8ba7]">true</span>);</span>
                      </div>
                      <div className="flex gap-2 text-white/30 italic">
                        <span className="text-white/50">3</span>
                        <span className="pl-4">// Requesting AST edit from local Groq Python Sidecar</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">4</span>
                        <span className="pl-4"><span className="text-[#c084fc]">const</span> res = <span className="text-[#ff8ba7]">await</span> <span className="text-[#2dd4bf]">rag.agentEdit</span>(issue.file, issue.code);</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">5</span>
                        <span className="pl-4"><span className="text-[#ff8ba7]">if</span> (res.action === <span className="text-[#fef08a]">'edit'</span>) {'{'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">6</span>
                        <span className="pl-8"><span className="text-[#2dd4bf]">applyPatch</span>(res.new_content);</span>
                      </div>
                      <div className="flex gap-2 text-white/50">
                        <span>7</span>
                        <span className="pl-4">{'}'}</span>
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t-2 border-white/10 text-white/50">
                        <span>8</span>
                        <span>{'}'}</span>
                      </div>

                      {/* Live Diagnostic Visualizer */}
                      <div className="absolute top-16 left-12 bg-[#1b1c2b] border border-[#ff8ba7]/30 rounded-xl p-3 shadow-[0_0_20px_rgba(255,139,167,0.2)] w-[70%] animate-pulse">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[9px] text-white font-black uppercase tracking-wider">Issue Fixed</span>
                        </div>
                        <div className="text-emerald-400/80 text-[10px] font-semibold">"Resolved memory leak in loop block"</div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      Our Python sidecar streams secure JSON-RPC requests to Groq models, utilizing regex to isolate JSON actions for precise local file replacement.
                    </span>
                  </div>
                )}

                {/* Visualizer 1: Dependency Radar */}
                {scrollyStep === 1 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#eab308] block mb-4 uppercase">Batch Modernize Orchestrator</span>
                    
                    <div className="w-full h-56 flex flex-col border border-white/10 rounded-3xl bg-black p-5 font-mono text-[10px] overflow-y-auto leading-relaxed text-[#2dd4bf]">
                      <div className="space-y-1 mt-auto">
                        <div className="text-white/50">❯ scanning node_modules/...</div>
                        <div className="text-white/70">[Radar] Found abandoned dependency: 'request'</div>
                        <div className="text-[#fef08a] mt-2">Triggering Catalyst Engine...</div>
                        <div className="text-white/70">Scraping migration docs to native 'fetch'...</div>
                        <div className="text-white/70">Building vector database embeddings...</div>
                        <div className="text-white">Generating AST rules via LLM...</div>
                        <div className="text-white/50 italic pl-4">→ App.jsx: Replaced request() with fetch()</div>
                        <div className="text-white/50 italic pl-4">→ utils/api.js: Replaced request() with fetch()</div>
                        <div className="text-emerald-400 font-extrabold mt-2 text-[11px]">â 2 files modernized successfully.</div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      Aeres automates tech-debt removal by downloading migration docs, constructing local vector databases, and streaming multi-file refactors via Server-Sent Events.
                    </span>
                  </div>
                )}

                {/* Visualizer 2: Causal Blame Maps */}
                {scrollyStep === 2 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#2dd4bf] block mb-4 uppercase">Git Regression Visualizer</span>
                    
                    <div className="w-full h-56 border border-white/10 rounded-3xl bg-[#1b1c2b] p-5 font-mono text-[9px] overflow-y-auto leading-relaxed relative flex flex-col gap-3">
                      
                      {/* Flow Step 1 */}
                      <div className="flex items-center gap-3 bg-[#13141f] p-3 rounded-lg border-2 border-red-400/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                        <div className="flex flex-col">
                          <div className="text-white font-bold font-sans text-[11px] mb-0.5">Crash on render (Bug)</div>
                          <div className="text-white/40">App.jsx • f7a3b12</div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="w-0.5 h-3 bg-white/20 mx-auto" />

                      {/* Flow Step 2 */}
                      <div className="flex items-center gap-3 bg-[#13141f] p-3 rounded-lg border border-white/10 relative overflow-hidden ring-1 ring-[#2dd4bf] shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#2dd4bf]"></div>
                        <div className="flex flex-col">
                          <div className="text-white font-bold font-sans text-[11px] mb-0.5">Updated data schema</div>
                          <div className="text-[#2dd4bf]/70">types.ts • c4e9f8a</div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="w-0.5 h-3 bg-white/20 mx-auto" />

                      {/* Flow Step 3 */}
                      <div className="flex items-center gap-3 bg-[#13141f] p-3 rounded-lg border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
                        <div className="flex flex-col">
                          <div className="text-white font-bold font-sans text-[11px] mb-0.5">Initial commit</div>
                          <div className="text-white/40">multiple files • a1b2c3d</div>
                        </div>
                      </div>

                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      Our custom React Flow integration traverses Git histories to build visual trees, instantly revealing how a change in a deeply nested utility breaks your UI.
                    </span>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Workspace Architectural Schema Flow Section (New Content) */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            architecture_schema.map
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Workspace Operations Flow
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Aeres operates through an asynchronous communication bridge linking Electron browser frame environments, WebSockets, and low-overhead FastAPI Python agents provisioned locally.
          </p>
        </div>

        <div className="border-[3px] border-[#ff8ba7] rounded-[2rem] bg-[#13141f] p-8 md:p-12 relative overflow-hidden">
          {/* Schematic SVG Flowchart */}
          <div className="flex flex-col items-center justify-center gap-8 font-mono text-center text-xs">
            <div className="w-full h-auto overflow-hidden rounded-xl border border-white/10 bg-[#09090e] p-6 shadow-2xl">
              <Mermaid chart={`
graph TD
    classDef tauri fill:#fef08a,stroke:#000000,stroke-width:3px,color:#000,font-weight:900
    classDef react fill:#2dd4bf,stroke:#000000,stroke-width:3px,color:#000,font-weight:900
    classDef python fill:#c084fc,stroke:#000000,stroke-width:3px,color:#000,font-weight:900
    classDef web fill:#ff8ba7,stroke:#000000,stroke-width:3px,color:#000,font-weight:900
    classDef ext fill:#fae3d9,stroke:#000000,stroke-width:3px,color:#000,font-weight:900
    classDef bridge fill:#ec4899,stroke:#000000,stroke-width:3px,color:#000,font-weight:900

    subgraph Desktop ["Aeres Desktop Environment"]
        direction TB
        
        subgraph Frontend ["React 18 Vite"]
            direction TB
            Store["Zustand Local State"]
            Editor["Monaco Editor LanguageClient"]
            Terminal["xterm.js Canvas"]
            D3["D3.js Force Graphs"]
            Components["CodeCanvas API Sandbox BlameGraph"]
            
            Components --> Store
            Editor --> Components
            Terminal --> Components
            D3 --> Components
        end
        
        subgraph Tauri ["Tauri Rust Core"]
            direction TB
            IPC["Tauri IPC Command Router"]
            ProcessMgr["Sidecar Daemon Manager"]
            FS["Native FS Git Hooks"]
            AuthHandler["aeres:// Protocol Handler"]
        end
        
        Frontend -->|"Tauri invoke Events"| IPC
        IPC --> FS
        IPC --> AuthHandler
        ProcessMgr -->|"Monitors"| IPC
    end

    subgraph Backend ["Local Python Sidecar"]
        direction TB
        
        FastAPI["FastAPI Server via Uvicorn"]
        
        subgraph LSPManager ["Language Server Protocol"]
            LSPRouter["LSP JSON-RPC Router"]
            LSPClients["Language-Specific Wrappers"]
        end
        
        subgraph DAPManager ["Debug Adapter Protocol"]
            DAPRouter["DAP Stream Interceptor"]
            DAPClients["Debug Target Spawners"]
        end
        
        subgraph ASTCore ["Static Analysis Core"]
            AstParser["Python ast Parsers"]
            Mutator["Mutation Synthesizer"]
        end
        
        FastAPI --> LSPRouter
        FastAPI --> DAPRouter
        FastAPI --> AstParser
        AstParser --> Mutator
        LSPRouter --> LSPClients
        DAPRouter --> DAPClients
    end

    subgraph Binaries ["External Daemons"]
        Gopls["gopls (Go)"]
        Clangd["clangd (C/C++)"]
        RustAnalyzer["rust-analyzer (Rust)"]
        Jedi["jedi-language-server (Python)"]
        Ripgrep["ripgrep (Search)"]
    end

    subgraph Web ["Aeres Cloud Platform"]
        Marketing["Vite Landing Page"]
        Clerk["Clerk Auth Provider"]
    end

    ProcessMgr -->|"Spawns executable sidecar"| FastAPI
    Editor -->|"WebSockets JSON-RPC"| FastAPI
    Terminal -->|"PTY Streams"| FastAPI
    
    LSPClients -->|"stdio socket"| Gopls
    LSPClients -->|"stdio socket"| Clangd
    LSPClients -->|"stdio socket"| RustAnalyzer
    LSPClients -->|"stdio socket"| Jedi
    
    FastAPI -->|"Subprocess"| Ripgrep
    
    Clerk -->|"OAuth Redirect Token"| AuthHandler
    AuthHandler -->|"Verifies JWT"| Store

    class Desktop,Tauri,IPC,ProcessMgr,FS,AuthHandler tauri
    class Frontend,Store,Editor,Terminal,D3,Components react
    class Backend,FastAPI,LSPManager,LSPRouter,LSPClients,DAPManager,DAPRouter,DAPClients,ASTCore,AstParser,Mutator python
    class Web,Marketing,Clerk web
    class Binaries,Gopls,Clangd,RustAnalyzer,Jedi,Ripgrep ext
              `} className="w-full mx-auto" />
            </div>
          </div>

          <div className="mt-10 border-t-3 border-black/10 pt-8 text-center font-sans text-white/50 text-[10px] font-bold leading-relaxed max-w-[620px] mx-auto">
            This offline-first model prevents data from being transmitted to third-party endpoints, ensuring your intellectual property remains private.
          </div>
        </div>
      </section>

      {/* Deep Feature Diagnostic Grid Section (New Content) */}
      <section className="relative px-6 py-20 max-w-[1400px] mx-auto z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            feature_diagnostics.sys
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Comprehensive Capabilities
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:auto-rows-[280px]">
          
          {/* Card 1: Project Health AI (Large - 2x2) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="md:col-span-2 md:row-span-2 bg-[#18181b] border border-[#ff8ba7] rounded-[2rem] p-8 md:p-12 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(255,139,167,0.4)] transition-all duration-300 hover:scale-[1.01]">
            <div className="w-14 h-14 rounded-2xl bg-[#ff8ba7] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-8 text-black transition-transform group-hover:-translate-y-1 relative z-10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <h3 className="font-display text-3xl md:text-4xl font-black text-white mb-4 group-hover:text-[#ff8ba7] transition-colors relative z-10">Project Health AI</h3>
            <p className="text-white/60 text-sm md:text-base font-semibold leading-relaxed font-sans max-w-md relative z-10">
              Continuous monitoring and self-healing. When syntax exceptions or logical anomalies occur, our integrated Groq LLM agent traces the traceback stack and applies patches directly into your local sandbox until the build passes.
            </p>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#ff8ba7] rounded-full blur-[100px] opacity-30 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

          {/* Card 2: Dependency Radar (Wide - 2x1) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="md:col-span-2 md:row-span-1 bg-[#18181b] border border-[#fef08a] rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(254,240,138,0.3)] transition-all duration-300 hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-2xl bg-[#fef08a] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6 text-black transition-transform group-hover:-translate-y-1 relative z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <h3 className="font-display text-2xl font-black text-white mb-2 group-hover:text-[#fef08a] transition-colors relative z-10">Dependency Radar</h3>
            <p className="text-white/60 text-sm font-semibold leading-relaxed font-sans max-w-lg relative z-10">
              Scans your package.json instantly to identify deprecated or abandoned npm dependencies that pose technical debt risks.
            </p>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-[#fef08a] rounded-full blur-[80px] opacity-10 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

          {/* Card 3: Web Preview Sandbox (Small - 1x1) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.3 }} className="md:col-span-1 md:row-span-1 bg-[#18181b] border border-[#2dd4bf] rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.3)] transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#2dd4bf] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-4 text-black transition-transform group-hover:-translate-y-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </div>
              <h3 className="font-display text-xl font-black text-white mb-2 group-hover:text-[#2dd4bf] transition-colors">Web Sandbox</h3>
              <p className="text-white/60 text-[11px] lg:text-xs font-semibold leading-relaxed font-sans">
                Live iframe injection to render React/Vue instantly.
              </p>
            </div>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#2dd4bf] rounded-full blur-[60px] opacity-10 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

          {/* Card 4: Python Sidecar (Small - 1x1) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.4 }} className="md:col-span-1 md:row-span-1 bg-[#18181b] border border-[#c084fc] rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(192,132,252,0.3)] transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#c084fc] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-4 text-black transition-transform group-hover:-translate-y-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              </div>
              <h3 className="font-display text-xl font-black text-white mb-2 group-hover:text-[#c084fc] transition-colors">FastAPI Sidecar</h3>
              <p className="text-white/60 text-[11px] lg:text-xs font-semibold leading-relaxed font-sans">
                Robust local Python daemon powering LLM context routing.
              </p>
            </div>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#c084fc] rounded-full blur-[60px] opacity-10 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

          {/* Card 5: Causal Blame Maps (Wide - 2x1) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.5 }} className="md:col-span-2 md:row-span-1 bg-[#18181b] border border-white/80 rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6 text-black transition-transform group-hover:-translate-y-1 relative z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
            </div>
            <h3 className="font-display text-2xl font-black text-white mb-2 group-hover:text-white transition-colors relative z-10">Causal Blame Maps</h3>
            <p className="text-white/60 text-sm font-semibold leading-relaxed font-sans max-w-lg relative z-10">
              Visualize Git telemetry via React Flow. Trace regression chains back to the exact commit that introduced the bug across multiple files.
            </p>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-white rounded-full blur-[80px] opacity-5 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

          {/* Card 6: Catalyst Batch Modernize (Wide - 2x1) */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.6 }} className="md:col-span-2 md:row-span-1 bg-[#18181b] border border-[#eab308] rounded-[2rem] p-8 relative overflow-hidden group hover:shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)] transition-all duration-300 hover:scale-[1.01]">
            <div className="w-12 h-12 rounded-2xl bg-[#eab308] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center mb-6 text-black transition-transform group-hover:-translate-y-1 relative z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3 className="font-display text-2xl font-black text-white mb-2 group-hover:text-[#eab308] transition-colors relative z-10">Catalyst Batch Modernize</h3>
            <p className="text-white/60 text-sm font-semibold leading-relaxed font-sans max-w-lg relative z-10">
              Uses AST parsing and vector embeddings to batch refactor and modernize thousands of lines of legacy API usages in one click.
            </p>
            {/* Decorative Ambient Bubble */}
            <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-[#eab308] rounded-full blur-[80px] opacity-10 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
          </motion.div>

        </div>
      </section>

    
      {/* Team / Creators Section */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] mb-4 font-mono">
            ENGINEERING_TEAM.LOG
          </span>
          <h2 className="font-display text-4xl md:text-[3.5rem] font-black text-white leading-tight">
            Created By Developers, For Developers
          </h2>
          <p className="max-w-[700px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Meet the primary system architects and core software engineers orchestrating Aeres IDE's unique compilation features and real-time visualizers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Shlok Patel */}
          <div className="bg-[#18181b] border border-[#ff8ba7]/20 hover:border-[#ff8ba7]/60 rounded-[2rem] p-10 text-center transform relative overflow-hidden group hover:shadow-[0_0_40px_-5px_rgba(255,139,167,0.2)] transition-all duration-300 hover:scale-[1.02]">
             <div className="w-24 h-24 mx-auto rounded-full bg-[#ff8ba7] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center text-black font-black text-2xl mb-6 relative z-10 transition-transform group-hover:-translate-y-1">
               SP
             </div>
             <h3 className="text-2xl font-black text-white mb-2 relative z-10 group-hover:text-[#ff8ba7] transition-colors">Shlok Patel</h3>
             <div className="text-[10px] font-mono font-black text-[#ff8ba7] uppercase tracking-wider mb-6 relative z-10">CORE AST MUTATORS ARCHITECT</div>
             <p className="text-white/60 text-[11px] font-sans font-semibold leading-relaxed relative z-10">
               Orchestrated the abstract syntax tree mutation sandboxes, circular dependency checkers, and high-performance React component render cycles.
             </p>
             {/* Decorative Ambient Bubble */}
             <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#ff8ba7] rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />
          </div>

          {/* Rutvik Gudaliya */}
          <div className="bg-[#18181b] border border-[#2dd4bf]/20 hover:border-[#2dd4bf]/60 rounded-[2rem] p-10 text-center transform relative overflow-hidden group hover:shadow-[0_0_40px_-5px_rgba(45,212,191,0.2)] transition-all duration-300 hover:scale-[1.02]">
             <div className="w-24 h-24 mx-auto rounded-full bg-[#2dd4bf] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center text-black font-black text-2xl mb-6 relative z-10 transition-transform group-hover:-translate-y-1">
               RG
             </div>
             <h3 className="text-2xl font-black text-white mb-2 relative z-10 group-hover:text-[#2dd4bf] transition-colors">Rutvik Gudaliya</h3>
             <div className="text-[10px] font-mono font-black text-[#2dd4bf] uppercase tracking-wider mb-6 relative z-10">SIDECAR DAEMON & GIT TELEMETRY</div>
             <p className="text-white/60 text-[11px] font-sans font-semibold leading-relaxed relative z-10">
               Developed the local FastAPI Python background daemon, Websocket event routers, and directed causal blame regression mapping systems.
             </p>
             {/* Decorative Ambient Bubble */}
             <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#2dd4bf] rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />
          </div>

          {/* Vinit Panchal */}
          <div className="bg-[#18181b] border border-[#c084fc]/20 hover:border-[#c084fc]/60 rounded-[2rem] p-10 text-center transform relative overflow-hidden group hover:shadow-[0_0_40px_-5px_rgba(192,132,252,0.2)] transition-all duration-300 hover:scale-[1.02]">
             <div className="w-24 h-24 mx-auto rounded-full bg-[#c084fc] shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center text-black font-black text-2xl mb-6 relative z-10 transition-transform group-hover:-translate-y-1">
               VP
             </div>
             <h3 className="text-2xl font-black text-white mb-2 relative z-10 group-hover:text-[#c084fc] transition-colors">Vinit Panchal</h3>
             <div className="text-[10px] font-mono font-black text-[#c084fc] uppercase tracking-wider mb-6 relative z-10">ELECTRON & SYSTEMS INTEGRATION</div>
             <p className="text-white/60 text-[11px] font-sans font-semibold leading-relaxed relative z-10">
               Integrated Electron application wrappers, OS-level deep-link protocol handlers (`aeres://`), and zero-overhead pseudoterminal daemons.
             </p>
             {/* Decorative Ambient Bubble */}
             <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#c084fc] rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />
          </div>
        </div>
      </section>


      {/* RAG Codebase Chat Engine Section */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            rag_chat.sys
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            RAG Codebase Chat Engine
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Aeres uses a robust vector database and Groq LLMs. Ask questions about your entire codebase and get instant, context-aware answers with precise file references routed through our local Python sidecar.
          </p>
        </div>

        <div className="bg-[#18181b] border-[3px] border-[#2dd4bf]/30 hover:border-[#2dd4bf]/80 transition-colors duration-500 rounded-[2rem] p-6 md:p-10 max-w-4xl mx-auto shadow-[0_0_40px_-10px_rgba(45,212,191,0.15)] flex flex-col items-center">
          
          <div className="w-full bg-[#13141f] border-[3px] border-[#2dd4bf] rounded-2xl overflow-hidden flex flex-col font-sans shadow-[8px_8px_0px_#000000]">
            <div className="bg-[#1b1c2b] border-b-[3px] border-[#2dd4bf] px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="w-3 h-3 rounded-full bg-[#ff8ba7] border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-[#fef08a] border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-[#2dd4bf] border-2 border-black"></div>
                <span className="ml-3 text-[10px] font-mono text-white/50 font-black tracking-widest uppercase">Groq Chat Agent</span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Message */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#ff8ba7] flex-shrink-0 flex items-center justify-center font-bold text-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000]">U</div>
                <div className="bg-[#1b1c2b] border-[2px] border-white/10 rounded-2xl rounded-tl-none px-5 py-4 text-sm text-white/90">
                  Where is the authentication logic handled in our app?
                </div>
              </div>

              {/* Agent Message */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#2dd4bf] flex-shrink-0 flex items-center justify-center font-bold text-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000]">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="bg-[#1b1c2b] border-[2px] border-[#2dd4bf]/40 rounded-2xl rounded-tl-none px-5 py-4 text-sm text-white/90 flex flex-col gap-3 w-full">
                  <p>Authentication is primarily handled via Clerk in your frontend and verified in the FastAPI sidecar. Here are the core files:</p>
                  
                  {/* File Ref 1 */}
                  <div className="bg-[#09090e] border-[2px] border-white/10 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-[#2dd4bf] transition-colors">
                    <svg className="w-5 h-5 text-[#fef08a]" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z"/></svg>
                    <div>
                      <div className="text-xs font-bold text-[#2dd4bf] hover:underline">authRedirect.js</div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">apps/web-frontend/src/utils/</div>
                    </div>
                  </div>

                  {/* File Ref 2 */}
                  <div className="bg-[#09090e] border-[2px] border-white/10 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-[#c084fc] transition-colors">
                    <svg className="w-5 h-5 text-[#c084fc]" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    <div>
                      <div className="text-xs font-bold text-[#c084fc] hover:underline">dependencies.py</div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">apps/python-backend/app/api/</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/50 mt-1 italic font-mono tracking-tight">Found 2 references in 142ms via local vector search.</p>
                </div>
              </div>
            </div>
            
            {/* Input Mock */}
            <div className="bg-[#09090e] p-4 border-t-[3px] border-[#2dd4bf]">
               <div className="bg-[#1b1c2b] border-[2px] border-white/10 rounded-full px-5 py-3 flex justify-between items-center text-xs text-white/40 font-mono">
                 <span>Ask a follow-up question...</span>
                 <svg className="w-4 h-4 text-[#2dd4bf]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* AI Agent Autonomy Comparison Grid Section */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            agent_benchmarks.log
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Autonomy Benchmarks
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            How Aeres's AST-driven autonomous feedback loops stack up against standard cloud-based generative AI assistants on actual logic tasks.
          </p>
        </div>

        <div className="bg-[#18181b] border border-white/10 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1b1c2b] border-b-3 border-black text-white/80 font-black tracking-wider uppercase text-[10px] font-mono">
                  <th className="p-4 border-r border-black/10">Capabilities</th>
                  <th className="p-4 border-r border-black/10 text-center text-[#ff8ba7]">Aeres Agent loop</th>
                  <th className="p-4 text-center">Standard Generative Assistant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 font-sans font-semibold text-white/85">
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Project Health Self-Healing</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Autonomous syntax repair via Groq LLM & pty tracebacks
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Manual traceback pasting & query attempts
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Technical Debt Management</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Catalyst batch modernization using AST & Embeddings
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Tedious manual file-by-file refactoring
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Git Regression Tracking</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Visual Causal Blame Maps rendered via React Flow
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Endless scrolling through terminal git log output
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Execution & Privacy</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    100% offline-first logic via local FastAPI sidecar
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Proprietary code sent to third-party endpoints
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Deep Technical Systems FAQ Accordion Section */}
      <section className="relative px-6 py-20 max-w-[900px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            technical_faq.log
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Architectural Operations
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            In-depth structural breakdown of how the Aeres developer environment executes local logic loops and secures workspaces.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does Aeres ensure zero data leakage for my proprietary source code?",
              a: "Aeres runs entirely local-first. All AST evaluations, local LSP parsing, syntax traversals, and workspace indexing occur locally within the local sidecar FastAPI binary context. LLM reasoning can be routed completely offline to local Ollama executors (like llama3 or qwen2.5-coder), meaning no code snippets or variables are ever sent to third-party endpoints.",
              icon: (
                <svg className="w-5 h-5 text-[#ff8ba7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              )
            },
            {
              q: "What is the self-healing pseudoterminal daemon, and how does it repair errors?",
              a: "When you run or compile code, the Aeres background pseudoterminal sidecar grabs active compiler logs (stdout/stderr tracebacks). If a build failure occurs, the terminal hooks route the stack trace to the autonomous agent. The agent uses LibCST to surgically repair syntax errors and verifies the patch against sandbox buffers until the build is green.",
              icon: (
                <svg className="w-5 h-5 text-[#2dd4bf] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              )
            },
            {
              q: "How does the Temporal Lens capture runtime function profiling without lagging?",
              a: "The Temporal Lens operates via lightweight low-level CPU runtime probes that record exact function execution lifetimes (Avg, P95, Max) during runs. Latency timings are dumped asynchronously to a local database without blocking the active monoco code canvas, guaranteeing a silky smooth 60fps UX.",
              icon: (
                <svg className="w-5 h-5 text-[#fef08a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.3 16.2L12 12V6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            },
            {
              q: "How do Contract Observations generate automated snapshot tests?",
              a: "As your code runs, the Contract Scanner monitors input-output values and boundary constraints. If a function is called multiple times, it records unique type shapes and edge-case behaviors. Clicking 'Generate Snapshot Tests' instructs the core logic engine to synthesize virtual test files (test_fn.py/fn.test.ts) that lock in observed constraints.",
              icon: (
                <svg className="w-5 h-5 text-[#ff8ba7] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )
            },
            {
              q: "How does the Multiverse alternative generator resolve complex logic variants?",
              a: "When facing ambiguous code designs, the Multiverse AI synthesizes three distinct parallel variants (A, B, and C) matching structural design patterns. Each variant highlights code differences and lets developers comparative-analyze, select, and merge changes instantly with a single merge action.",
              icon: (
                <svg className="w-5 h-5 text-[#2dd4bf] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75a3 3 0 100-6 3 3 0 000 6zM6 11.25a3 3 0 100-6 3 3 0 000 6zM6 18.75a3 3 0 100-6 3 3 0 000 6zM12 9.75v4.5m0-4.5a3 3 0 00-3-3H6.75m5.25 3h1.5a3 3 0 013 3v2.25" />
                </svg>
              )
            }
          ].map((faq, i) => {
            const isOpen = activeFaq === i
            return (
                <div
                  key={i}
                  className={`border-[3px] border-black shadow-[4px_4px_0px_#000000] rounded-[2rem] overflow-hidden transition-all duration-300 ${isOpen ? 'bg-[#13141f]' : 'bg-[#13141f] hover:bg-[#1a1b26]'}`}
                >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-display font-black text-white text-sm transition"
                >
                  <div className="flex items-center gap-3.5">
                    {faq.icon}
                    <span className="text-left font-black tracking-tight">{faq.q}</span>
                  </div>
                  <span className={`text-[#ff8ba7] font-black transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`}>
                    &darr;
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-6 pb-6 pt-1 font-sans font-semibold text-xs text-white/70 leading-relaxed text-left">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>

      {/* Cozy Y2K CTA */}
      <section className="relative py-28 bg-transparent max-w-[1200px] mx-auto px-6 z-10 font-display">
        <div className="bg-[#13141f] border-[3px] border-black shadow-[4px_4px_0px_#000000] rounded-[2rem] p-12 text-center relative overflow-hidden">
            <h2 className="font-display text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tight leading-[0.9] mb-12 text-white">
              The neural layer <br/><span className="italic font-bold bg-white border-[3px] border-black shadow-[4px_4px_0px_#000000] px-6 py-2.5 inline-block rounded-full mt-4 text-black">is Aeres.</span>
            </h2>
            <div className="flex justify-center">
               <SmartDownload large className="bg-[#ff8ba7] border-[3px] border-black shadow-[4px_4px_0px_#000000] text-black rounded-full px-8 py-4 text-sm font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000000]" />
            </div>
        </div>
      </section>

      <div className="relative z-10 mt-12">
        <Footer />
      </div>
    </div>
  )
}

