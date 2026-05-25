import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'
import SmartDownload from '../components/SmartDownload.jsx'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

const OS_SCRIPTS = {
  macos: {
    name: 'macOS',
    command: 'curl -fsSL https://aeres.dev/install.sh | sh',
    daemon: 'aeres daemon start --port 8008',
    shell: 'bash'
  },
  windows: {
    name: 'Windows',
    command: 'iwr -useb https://aeres.dev/install.ps1 | iex',
    daemon: 'aeres.exe daemon start --port 8008',
    shell: 'powershell'
  },
  linux: {
    name: 'Linux',
    command: 'wget -qO- https://aeres.dev/install.sh | bash',
    daemon: 'aeres daemon start --port 8008',
    shell: 'sh'
  }
}

// Real-time collaborative user simulation cursors - named after the exact creators!
const COLLABORATORS = [
  { name: 'Shlok Patel', color: '#ff8ba7', x: [50, 180, 240, 90, 50], y: [120, 40, 200, 150, 120] },
  { name: 'Rutvik Gudaliya', color: '#2dd4bf', x: [400, 310, 480, 350, 400], y: [250, 90, 150, 220, 250] },
  { name: 'Vinit Panchal', color: '#c084fc', x: [600, 450, 520, 580, 600], y: [80, 180, 60, 120, 80] }
]

const SIMULATED_DEPS = [
  { name: 'react', ecosystem: 'npm', current: '18.2.0', latest: '18.3.1', status: 'healthy', license: 'MIT', size: '6.4 KB' },
  { name: 'libcst', ecosystem: 'pypi', current: '1.1.0', latest: '1.4.0', status: 'healthy', license: 'MIT', size: '1.2 MB' },
  { name: 'framer-motion', ecosystem: 'npm', current: '11.0.8', latest: '11.3.0', status: 'healthy', license: 'MIT', size: '42.1 KB' },
  { name: 'electron', ecosystem: 'npm', current: '29.1.0', latest: '31.0.0', status: 'outdated', license: 'MIT', size: '78.4 MB' },
  { name: 'zustand', ecosystem: 'npm', current: '4.5.2', latest: '4.5.2', status: 'healthy', license: 'MIT', size: '3.1 KB' },
  { name: 'fastapi', ecosystem: 'pypi', current: '0.110.0', latest: '0.111.0', status: 'healthy', license: 'MIT', size: '92.4 KB' },
  { name: 'ripgrep', ecosystem: 'rust', current: '14.1.0', latest: '14.1.0', status: 'healthy', license: 'MIT', size: '4.8 MB' }
]

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
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-center gap-2 bg-[#13141f] border-3 border-black p-2.5 rounded-2xl shadow-[3px_3px_0px_#000000] font-mono">
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
  
  // High-performance Dependency Visualizer State
  const [visualizerView, setVisualizerView] = useState('list') // 'list' | 'map'
  const [selectedDep, setSelectedDep] = useState(SIMULATED_DEPS[0])
  const [updateCopied, setUpdateCopied] = useState(false)

  // Interactive AST Playground States
  const [astLang, setAstLang] = useState('python')
  const [selectedAstNode, setSelectedAstNode] = useState({
    type: 'FunctionDef',
    name: 'run_pipeline',
    range: 'lines 2-5',
    mutations: 'DecoratorSwaps, ComparisonFlips',
    children: '5 child nodes',
    status: 'Stable AST scope verified'
  })
  
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

  const copyUpdateCommand = (dep) => {
    const cmd = dep.ecosystem === 'npm' ? `npm install ${dep.name}@latest` : `pip install ${dep.name} --upgrade`
    navigator.clipboard.writeText(cmd)
    setUpdateCopied(true)
    setTimeout(() => setUpdateCopied(false), 2000)
  }

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
    <div className="min-h-screen bg-[#09090e] font-body text-[#fffdf9] selection:bg-purple-500/20 selection:text-purple-300 overflow-x-hidden relative">
      
      {/* Glassmorphic floating ambient bubbles */}
      <div className="absolute top-[18%] left-[8%] w-32 h-32 rounded-full glassmorphic-layer pointer-events-none sticker-float hidden md:block" style={{ animationDelay: '0.3s' }} />
      <div className="absolute top-[45%] right-[5%] w-44 h-44 rounded-full glassmorphic-layer pointer-events-none sticker-float hidden md:block" style={{ animationDelay: '1.2s' }} />

      {/* Floating Y2K developer stickers */}
      <div className="absolute top-[20%] left-12 w-14 h-14 text-[#ff8ba7] sticker-float hidden md:block" style={{ animationDelay: '0.1s' }}>
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 3L1.5 12 8 21h3l-6.5-9L11 3H8zm8 0l6.5 9-6.5 9h-3l6.5-9-6.5-9h3z" />
        </svg>
      </div>
      <div className="absolute top-[35%] right-14 w-12 h-12 text-[#2dd4bf] sticker-float hidden md:block" style={{ animationDelay: '0.5s' }}>
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
      </div>

      <Navbar />
      <ScrollHUD />

      {/* Hero Banner styled as a massive Y2K Card */}
      <section className="pt-40 pb-20 px-6 max-w-[1200px] mx-auto z-10 relative">
        <div className="kawaii-card bg-[#13141f] p-10 md:p-16 text-center relative overflow-hidden">
          
          {/* Real-time simulated cursor overlay */}
          {COLLABORATORS.map((collab, index) => (
            <motion.div
              key={index}
              className="collab-pointer hidden md:flex"
              animate={{ x: collab.x, y: collab.y }}
              transition={{ repeat: Infinity, duration: 8 + index * 2, ease: "easeInOut" }}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill={collab.color} stroke="#000000" strokeWidth="2">
                <path d="M4.5 3v15.2l3.8-3.8 2.5 5.8 2.3-1-2.5-5.8 4.4-.1z" />
              </svg>
              <div className="collab-label" style={{ borderColor: collab.color }}>{collab.name}</div>
            </motion.div>
          ))}

          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-8 font-mono">
            welcome_to_aeres
          </span>

          {/* Expressive Typography Animation Header */}
          <h1 className="font-display text-[clamp(2.3rem,6.5vw,5rem)] font-extrabold tracking-tight leading-[1] text-white mb-8">
            {renderExpressiveTitle()} <br/>
            <span className="text-black bg-[#ff8ba7] border-4 border-black px-6 py-2 inline-block shadow-[5px_5px_0px_#000000] rounded-[2.5rem] italic font-bold mt-2">
              provisioned locally.
            </span>
          </h1>

          <p className="text-[#fffdf9]/75 text-base max-w-[620px] mx-auto leading-relaxed font-sans font-semibold mt-6 mb-10">
            Aeres is a high-performance offline development environment featuring self-correcting multi-agent loops and AST-level mutation sweeper diagnostics. Optimized to keep coder eyes fresh and workspaces safe.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <SmartDownload className="kawaii-btn-pink text-xs uppercase tracking-wider font-display font-bold" />
            <Link
              to="/docs"
              className="bg-[#1b1c2b] border-3 border-black text-white font-extrabold shadow-[3px_3px_0px_#000000] px-6 py-3.5 rounded-full text-xs uppercase tracking-wider font-display no-underline hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition-all"
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
            <div className="w-6 h-10 rounded-full border-3 border-black bg-[#1b1c2b] flex justify-center p-1.5 shadow-[2px_2px_0px_#000000]">
              <motion.div 
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#ff8ba7]" 
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Zero-Config CLI Terminal Dashboard */}
      <section className="relative px-6 py-12 max-w-[1400px] mx-auto z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            terminal_daemon
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Zero-Config Provisioning
          </h2>
        </div>

        {/* terminal dialogue */}
        <div className="max-w-[760px] mx-auto kawaii-card bg-[#13141f]">
          <div className="bg-[#1b1c2b] px-6 py-3.5 border-b-4 border-black flex items-center justify-between gap-4 font-display">
            <div className="flex gap-2">
              {Object.keys(OS_SCRIPTS).map(os => {
                const isSelected = activeOs === os
                return (
                  <button
                    key={os}
                    onClick={() => setActiveOs(os)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-mono font-black tracking-wide border-2 border-black transition-all ${isSelected ? 'text-black bg-[#ff8ba7] shadow-[2px_2px_0px_#000000]' : 'text-white/60 bg-[#13141f] shadow-[1px_1px_0px_#000000]'}`}
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
{`# 1. Fetch system binaries & scripts
$ ${OS_SCRIPTS[activeOs].command}

# 2. Spin up low-overhead background daemon
$ ${OS_SCRIPTS[activeOs].daemon}`}
            </pre>
          </div>

          <div className="bg-[#1b1c2b] px-6 py-4 border-t-4 border-black flex items-center justify-between gap-4 font-display">
            <span className="text-[10px] font-mono font-black text-white/50">
              Aeres Core Engine v1.0.4
            </span>
            <button
              onClick={() => copyScript(OS_SCRIPTS[activeOs].command)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-3 border-black text-xs font-black uppercase tracking-wider transition-all ${copied ? 'bg-emerald-300 text-black shadow-[1px_1px_0px_#000000] translate-x-0.5 translate-y-0.5' : 'kawaii-btn-mint shadow-none'}`}
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
              Dynamic <br/><span className="text-[#ff8ba7] italic font-bold">Scrollytelling.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-white/60 text-xs font-bold leading-relaxed text-right md:mb-4 font-sans">
            Hover or click through the development lifecycle stages on the left to see the sticky Aeres mock IDE dynamically render D3 Dependency Radars, Causal Blame Maps, and active Mutation sweeps in real time!
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          {/* Left Column: Interactive Scrolling Steps */}
          <div className="w-full lg:w-1/2 space-y-8">
            
            {/* Step 1: AST Dependency Radar */}
            <div 
              onClick={() => setScrollyStep(0)}
              onMouseEnter={() => setScrollyStep(0)}
              className={`p-8 rounded-[2rem] border-3 border-black cursor-pointer transition-all duration-300 ${scrollyStep === 0 ? 'bg-[#ff8ba7]/20 shadow-[5px_5px_0px_#000000] scale-[1.02]' : 'bg-[#13141f] shadow-[2px_2px_0px_#000000] opacity-75 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#ff8ba7]">
                <span className="px-3 py-1 bg-[#ff8ba7] text-black border-2 border-black rounded-full">STAGE 01</span>
                <span>AST SEMANTIC RADAR</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">AST Dependency Radar</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Fully integrates d3-based active import sweepers. Analyzes all circular file references, deprecated license triggers, and CVE vulnerability updates on local systems seamlessly.
              </p>
            </div>

            {/* Step 2: Causal Blame Mapping */}
            <div 
              onClick={() => setScrollyStep(1)}
              onMouseEnter={() => setScrollyStep(1)}
              className={`p-8 rounded-[2rem] border-3 border-black cursor-pointer transition-all duration-300 ${scrollyStep === 1 ? 'bg-[#fef08a]/20 shadow-[5px_5px_0px_#000000] scale-[1.02]' : 'bg-[#13141f] shadow-[2px_2px_0px_#000000] opacity-75 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#eab308]">
                <span className="px-3 py-1 bg-[#fef08a] text-black border-2 border-black rounded-full">STAGE 02</span>
                <span>GIT TELEMETRY TRACKER</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Causal Blame Graph</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Tracing regressional code edits is simple. Right-click any syntax target to spin up a directed force layout mapping bug roots back to individual git commits automatically.
              </p>
            </div>

            {/* Step 3: Sandboxed Mutation sweeps */}
            <div 
              onClick={() => setScrollyStep(2)}
              onMouseEnter={() => setScrollyStep(2)}
              className={`p-8 rounded-[2rem] border-3 border-black cursor-pointer transition-all duration-300 ${scrollyStep === 2 ? 'bg-[#2dd4bf]/20 shadow-[5px_5px_0px_#000000] scale-[1.02]' : 'bg-[#13141f] shadow-[2px_2px_0px_#000000] opacity-75 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#2dd4bf]">
                <span className="px-3 py-1 bg-[#2dd4bf] text-black border-2 border-black rounded-full">STAGE 03</span>
                <span>AST MUTATION SANDBOX</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Offline Mutation Testing</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Clones workspace file buffers into secure memory storage, synthesizing mutants (flipped operators, altered bounds) to ensure local test assertions catch regressions before production.
              </p>
            </div>

          </div>

          {/* Right Column: Sticky Mock IDE visualizer */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-28">
            <div className="kawaii-card overflow-hidden bg-[#13141f]">
              
              {/* Custom Y2K Mock IDE header */}
              <div className="bg-[#1b1c2b] border-b-4 border-black px-5 py-3.5 flex justify-between items-center font-display">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-black bg-[#ff8ba7]" />
                  <span className="text-xs font-black uppercase text-white tracking-wide">
                    {scrollyStep === 0 ? 'dependency_radar_visualizer.js' : scrollyStep === 1 ? 'causal_blame_directed_graph.bin' : 'mutation_tester_daemon.log'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-black text-white/40">aeres-ide // active</span>
              </div>

              {/* IDE Content Canvas */}
              <div className="p-6 bg-[#13141f] min-h-[420px] flex flex-col justify-between font-mono text-xs relative">
                
                {/* Visualizer 0: HIGH-PERFORMANCE REAL DEPENDENCY RADAR */}
                {scrollyStep === 0 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-[#ff8ba7] uppercase">Dependency Analyzer (Ecosystem)</span>
                        <div className="flex bg-[#1b1c2b] rounded border-2 border-black overflow-hidden font-display">
                          <button 
                            onClick={() => setVisualizerView('list')}
                            className={`px-2 py-0.5 text-[9px] font-black transition-all ${visualizerView === 'list' ? 'bg-[#ff8ba7] text-black' : 'text-white/60 hover:text-white'}`}
                          >
                            LIST
                          </button>
                          <button 
                            onClick={() => setVisualizerView('map')}
                            className={`px-2 py-0.5 text-[9px] font-black transition-all ${visualizerView === 'map' ? 'bg-[#ff8ba7] text-black' : 'text-white/60 hover:text-white'}`}
                          >
                            MAP
                          </button>
                        </div>
                      </div>

                      {/* Stats Bar */}
                      <div className="flex justify-between border-2 border-black bg-[#1b1c2b] p-2 rounded-xl text-[9px] mb-3 text-white/70">
                        <span>0 CVE</span>
                        <span>•</span>
                        <span>0 Deprecated</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">1 Outdated</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">6 OK</span>
                      </div>

                      {/* View Modes */}
                      {visualizerView === 'list' ? (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {SIMULATED_DEPS.map(dep => (
                            <button
                              key={dep.name}
                              onClick={() => setSelectedDep(dep)}
                              className={`w-full text-left p-2 rounded-xl border-2 border-black transition-all flex items-center justify-between ${selectedDep.name === dep.name ? 'bg-[#ff8ba7]/20 border-[#ff8ba7]' : 'bg-[#1b1c2b]/50 border-black hover:border-white/20'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dep.status === 'outdated' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                <span className="font-extrabold text-white">{dep.name}</span>
                              </div>
                              <div className="text-[10px] text-white/50">
                                {dep.current} &rarr; {dep.latest} ({dep.ecosystem})
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Treemap View Mock */
                        <div className="grid grid-cols-4 gap-1.5 h-32 bg-[#1b1c2b]/30 p-2.5 rounded-xl border-2 border-black">
                          {SIMULATED_DEPS.map(dep => (
                            <button
                              key={dep.name}
                              onClick={() => setSelectedDep(dep)}
                              className={`rounded-lg border-2 transition-all p-1 flex flex-col justify-between text-left ${dep.status === 'outdated' ? 'bg-amber-400/20 border-amber-400' : 'bg-emerald-400/20 border-emerald-400'} ${selectedDep.name === dep.name ? 'ring-2 ring-[#ff8ba7] scale-95' : 'hover:scale-95'}`}
                            >
                              <span className="text-[9px] font-black text-white truncate w-full">{dep.name}</span>
                              <span className="text-[8px] text-white/50">{dep.size}</span>
                            </button>
                          ))}
                          <div className="rounded-lg border-2 border-dashed border-black/35 bg-[#1b1c2b]/10 flex items-center justify-center text-white/20 text-[8px] font-black">SPARE</div>
                        </div>
                      )}
                    </div>

                    {/* Selected Dependency Detail Card */}
                    {selectedDep && (
                      <div className="bg-[#1b1c2b] border-2 border-black p-3.5 rounded-2xl shadow-[2.5px_2.5px_0px_#000000] text-sans mt-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[#ff8ba7] font-black text-xs block">{selectedDep.name}</span>
                            <span className="text-white/40 text-[9px] uppercase font-mono">Ecosystem: {selectedDep.ecosystem} • Size: {selectedDep.size}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border-2 border-black ${selectedDep.status === 'outdated' ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'}`}>
                            {selectedDep.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-4 text-[10px] text-white/70 mt-1 font-sans">
                          <span>License: <strong className="text-white">{selectedDep.license}</strong></span>
                          <button
                            onClick={() => copyUpdateCommand(selectedDep)}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-[9px] font-black uppercase transition-all shrink-0 ${updateCopied ? 'bg-emerald-300 text-black' : 'kawaii-btn-mint p-0 border-black'}`}
                          >
                            {updateCopied ? 'Copied command!' : `Update to ${selectedDep.latest}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visualizer 1: Causal Blame Graph */}
                {scrollyStep === 1 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#eab308] block mb-4 uppercase">Directed Regression Chain</span>
                    
                    <div className="w-full h-56 flex flex-col justify-center border-3 border-dashed border-black/10 rounded-3xl bg-[#1b1c2b]/40 p-5 font-mono text-[10px]">
                      <div className="space-y-3.5">
                        
                        {/* Initial error Node */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 py-1 text-center bg-red-400 border-2 border-black font-black text-[9px] rounded-lg text-black">ERROR</div>
                          <span className="text-white/40">&rarr;</span>
                          <span className="text-white font-extrabold">Line 142 in CodeCanvas.jsx (OutOfMemory)</span>
                        </div>
                        
                        {/* Middle causal commit node */}
                        <div className="flex items-center gap-3 pl-8">
                          <span className="text-white/40">&darr;</span>
                          <div className="w-16 py-1 text-center bg-purple-300 border-2 border-black font-black text-[9px] rounded-lg shadow-[1.5px_1.5px_0px_#000000] relative text-black">
                            a8e90f
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-black animate-ping" />
                          </div>
                          <span className="text-white/40">&rarr;</span>
                          <span className="text-white/80 font-bold">Rutvik Gudaliya: Swapped buffer bounds in caching loop</span>
                        </div>
                        
                        {/* Origin commit node */}
                        <div className="flex items-center gap-3 pl-16">
                          <span className="text-white/40">&darr;</span>
                          <div className="w-16 py-1 text-center bg-slate-300 border-2 border-black font-black text-[9px] rounded-lg text-black">d5b12a</div>
                          <span className="text-white/40">&rarr;</span>
                          <span className="text-white/80 font-bold">Vinit Panchal: Setup basic buffer canvas allocations</span>
                        </div>

                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      CausalBlame utilizes local git-diff streams and AST parser bridges to map logical causation variables cleanly.
                    </span>
                  </div>
                )}

                {/* Visualizer 2: Self-Healing Mutation Terminal */}
                {scrollyStep === 2 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#2dd4bf] block mb-4 uppercase">Mutation Testing Console</span>
                    
                    <div className="w-full h-56 border-3 border-black rounded-3xl bg-black p-5 font-mono text-[9px] text-[#2dd4bf] overflow-y-auto leading-relaxed select-none">
                      <div className="space-y-1">
                        <div>$ aeres mutate</div>
                        <div className="text-white/40">[Core] Synthesized 14 mutant blocks in memory</div>
                        <div className="text-white/40">[Runner] Executing test sweeps against mutated targets...</div>
                        <div className="text-red-400">CompareBounds: flipped comparison bound &lt; to &lt;= ... KILLED</div>
                        <div className="text-red-400">AuthRedirect: flipped boolean true to false ... KILLED</div>
                        <div className="text-emerald-400">RadarChecker: altered boundary offset +1 to -1 ... SURVIVED</div>
                        <div className="text-white font-extrabold mt-2">Recalibrating agent self-healing repair loop...</div>
                        <div className="text-emerald-500 font-extrabold">All repair checks passed successfully. Build clean! (0.00s)</div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      Mutation testing runs locally, allowing developers to ensure unit assertions are robust enough to stop logical regression leaks.
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
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            architecture_schema.map
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Workspace Operations Flow
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Aeres operates through an asynchronous communication bridge linking Electron browser frame environments, WebSockets, and low-overhead FastAPI Python agents provisioned locally.
          </p>
        </div>

        <div className="kawaii-card bg-[#13141f] p-8 md:p-12 relative overflow-hidden">
          {/* Schematic SVG Flowchart */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 font-mono text-center text-xs">
            
            {/* Component 1: Browser client */}
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="w-full lg:w-1/4 p-6 border-3 border-black rounded-3xl bg-[#1b1c2b] shadow-[3px_3px_0px_#000000] transition duration-200 hover:-translate-y-1">
              <span className="text-[10px] font-black text-[#ff8ba7] block mb-2 font-mono uppercase">User Interface</span>
              <h3 className="font-display text-sm font-bold text-white mb-2">Browser / Electron</h3>
              <p className="text-white/60 text-[10px] leading-relaxed">Renders high-performance Monaco buffers, D3 radars, and real-time logs at 60fps.</p>
            </motion.div>

            {/* Bridge 1 */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-[#ff8ba7] font-black text-sm lg:rotate-0 rotate-90 shrink-0">
              &rarr; aeres:// &rarr;
            </motion.div>

            {/* Component 2: Local Python Sidecar Daemon */}
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 }} className="w-full lg:w-1/4 p-6 border-3 border-black rounded-3xl bg-[#1b1c2b] shadow-[3px_3px_0px_#000000] transition duration-200 hover:-translate-y-1">
              <span className="text-[10px] font-black text-[#2dd4bf] block mb-2 font-mono uppercase">Local Sidecar API</span>
              <h3 className="font-display text-sm font-bold text-white mb-2">FastAPI Sidecar</h3>
              <p className="text-white/60 text-[10px] leading-relaxed">Low-overhead background daemon routing WebSockets queries and Ripgrep scanners.</p>
            </motion.div>

            {/* Bridge 2 */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.7 }} className="text-[#2dd4bf] font-black text-sm lg:rotate-0 rotate-90 shrink-0">
              &rarr; WebSockets &rarr;
            </motion.div>

            {/* Component 3: AST logic loop */}
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.9 }} className="w-full lg:w-1/4 p-6 border-3 border-black rounded-3xl bg-[#1b1c2b] shadow-[3px_3px_0px_#000000] transition duration-200 hover:-translate-y-1">
              <span className="text-[10px] font-black text-[#c084fc] block mb-2 font-mono uppercase">Intelligence Core</span>
              <h3 className="font-display text-sm font-bold text-white mb-2">LibCST AST Engine</h3>
              <p className="text-white/60 text-[10px] leading-relaxed">Autonomous agent synthesizes comparison mutators and parses dependencies local-first.</p>
            </motion.div>

          </div>

          <div className="mt-10 border-t-3 border-black/10 pt-8 text-center font-sans text-white/50 text-[10px] font-bold leading-relaxed max-w-[620px] mx-auto">
            This offline-first model prevents data from being transmitted to third-party endpoints, ensuring your intellectual property remains private.
          </div>
        </div>
      </section>

      {/* Deep Feature Diagnostic Grid Section (New Content) */}
      <section className="relative px-6 py-20 max-w-[1400px] mx-auto z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            feature_diagnostics.sys
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Comprehensive Capabilities
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: AST Parsing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border-2 border-black flex items-center justify-center mb-6 text-[#ff8ba7] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">AST Parsing Engine</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Parses source codes at 240,000 lines/second to render abstract syntax trees locally. Resolves types and scopes under 5ms.
            </p>
          </motion.div>

          {/* Card 2: Offline-First LSP */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#2dd4bf]/20 border-2 border-black flex items-center justify-center mb-6 text-[#2dd4bf] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Local-First LSP Server</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Keeps syntax analysis, code logic, and local context safe on your system. Completely independent of internet requirements.
            </p>
          </motion.div>

          {/* Card 3: Zero-Overhead Tracing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.3 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#c084fc]/20 border-2 border-black flex items-center justify-center mb-6 text-[#c084fc] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Zero-Overhead Tracing</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Measures compiler branches and memory heaps with microsecond granularity. Generates detailed local Flamegraphs inside the buffer.
            </p>
          </motion.div>

          {/* Card 4: Clerk Desktop Sync */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.4 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#fef08a]/20 border-2 border-black flex items-center justify-center mb-6 text-[#fef08a] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Workspace Account Sync</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Syncs profile parameters, keybindings, and extensions across web frameworks and Electron wrappers securely using Clerk.
            </p>
          </motion.div>

          {/* Card 5: Mutation testing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.5 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border-2 border-black flex items-center justify-center mb-6 text-[#ff8ba7] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Mutation Synthesizer</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Programmatically alters comparison bounds and statement variables in sandbox caches to verify that tests fail when they should.
            </p>
          </motion.div>

          {/* Card 6: Pseudoterminal sidecar */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.6 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#2dd4bf]/20 border-2 border-black flex items-center justify-center mb-6 text-[#2dd4bf] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Self-Healing Terminal</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Integrated background runners intercept traceback exceptions, surgically rewriting syntax mistakes in real-time until targets build.
            </p>
          </motion.div>

          {/* Card 7: Temporal Lens */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.7 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#c084fc]/20 border-2 border-black flex items-center justify-center mb-6 text-[#c084fc] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Temporal Lens</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Low-overhead active profiling maps function latency, P95 timing spikes, and trend sparklines dynamically during run session updates.
            </p>
          </motion.div>

          {/* Card 8: Multiverse AI variant */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.8 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border-2 border-black flex items-center justify-center mb-6 text-[#ff8ba7] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z"/><circle cx="8" cy="12" r="6"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Multiverse Variant</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Synthesizes three structurally distinct syntax-correct variants (A, B, and C) parallelly for instant click-and-apply comparison.
            </p>
          </motion.div>

          {/* Card 9: Focus Session State */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.9 }} className="kawaii-card bg-[#13141f] p-8 border-3 border-black">
            <div className="w-10 h-10 rounded-2xl bg-[#fef08a]/20 border-2 border-black flex items-center justify-center mb-6 text-[#fef08a] shadow-[2px_2px_0px_#000000]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Focus Session Restore</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Saves full canvas bounds, panel configurations, and open terminals (Ctrl+Shift+S) to restore precise coding states instantly.
            </p>
          </motion.div>

        </div>
      </section>

      {/* Creators Showcase Section (New Content) */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            engineering_team.log
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Created By Developers, For Developers
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Meet the primary system architects and core software engineers orchestrating Aeres IDE's unique compilation features and real-time visualizers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Creator 1: Shlok Patel */}
          <div className="kawaii-card bg-[#13141f] p-6 text-center border-3 border-black">
            <div className="w-20 h-20 rounded-full border-3 border-black bg-[#ff8ba7] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black shadow-[3px_3px_0px_#000000]">
              SP
            </div>
            <h3 className="text-xl font-black text-white mb-1">Shlok Patel</h3>
            <span className="text-[10px] font-black text-[#ff8ba7] uppercase tracking-wider block mb-4 font-mono">Core AST Mutators Architect</span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Orchestrated the abstract syntax tree mutation sandboxes, circular dependency checkers, and high-performance React component render cycles.
            </p>
          </div>

          {/* Creator 2: Rutvik Gudaliya */}
          <div className="kawaii-card bg-[#13141f] p-6 text-center border-3 border-black">
            <div className="w-20 h-20 rounded-full border-3 border-black bg-[#2dd4bf] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black shadow-[3px_3px_0px_#000000]">
              RG
            </div>
            <h3 className="text-xl font-black text-white mb-1">Rutvik Gudaliya</h3>
            <span className="text-[10px] font-black text-[#2dd4bf] uppercase tracking-wider block mb-4 font-mono">Sidecar Daemon & Git Telemetry</span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Developed the local FastAPI Python background daemon, Websocket event routers, and directed causal blame regression mapping systems.
            </p>
          </div>

          {/* Creator 3: Vinit Panchal */}
          <div className="kawaii-card bg-[#13141f] p-6 text-center border-3 border-black">
            <div className="w-20 h-20 rounded-full border-3 border-black bg-[#c084fc] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black shadow-[3px_3px_0px_#000000]">
              VP
            </div>
            <h3 className="text-xl font-black text-white mb-1">Vinit Panchal</h3>
            <span className="text-[10px] font-black text-[#c084fc] uppercase tracking-wider block mb-4 font-mono">Electron & Systems Integration</span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Integrated Electron application wrappers, OS-level deep-link protocol handlers (`aeres://`), and zero-overhead pseudoterminal daemons.
            </p>
          </div>

        </div>
      </section>

      {/* Interactive AST Playground Section */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            ast_synthesizer.run
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Interactive AST Playground
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Aeres uses a robust syntax mutation synthesizer. Click nodes below to see how our engine parses, tracks scopes, and synthesizes local bug-prevention mutations instantly.
          </p>
        </div>

        <div className="kawaii-card bg-[#13141f] p-6 md:p-10 border-3 border-black flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Left panel: Snippet Select & Code Canvas */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between">
            <div>
              <div className="flex gap-2.5 mb-6">
                <button
                  onClick={() => {
                    setAstLang('python')
                    setSelectedAstNode({
                      type: 'FunctionDef',
                      name: 'run_pipeline',
                      range: 'lines 2-5',
                      mutations: 'DecoratorSwaps, ComparisonFlips',
                      children: '5 child nodes',
                      status: 'Stable AST scope verified'
                    })
                  }}
                  className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-mono font-black transition-all ${astLang === 'python' ? 'bg-[#ff8ba7] text-black shadow-[2px_2px_0px_#000000]' : 'bg-[#1b1c2b] text-white/60 shadow-[1px_1px_0px_#000000]'}`}
                >
                  pipeline_agent.py
                </button>
                <button
                  onClick={() => {
                    setAstLang('javascript')
                    setSelectedAstNode({
                      type: 'FunctionDeclaration',
                      name: 'compileAST',
                      range: 'lines 1-8',
                      mutations: 'BoundaryInversions, OperatorSwaps',
                      children: '6 child nodes',
                      status: 'Dynamic AST scope verified'
                    })
                  }}
                  className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-mono font-black transition-all ${astLang === 'javascript' ? 'bg-[#2dd4bf] text-black shadow-[2px_2px_0px_#000000]' : 'bg-[#1b1c2b] text-white/60 shadow-[1px_1px_0px_#000000]'}`}
                >
                  parser_core.js
                </button>
              </div>

              {/* Code Editor Mock */}
              <div className="bg-black border-3 border-black p-5 rounded-2xl font-mono text-[11px] leading-relaxed text-[#2dd4bf] min-h-[190px]">
                {astLang === 'python' ? (
                  <pre className="select-none text-left">
                    <span className="text-purple-400">@aeres.agent</span>(self_healing=<span className="text-amber-400">True</span>)<br />
                    <span className="text-blue-400">def</span> <span className="text-emerald-400 font-bold hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'FunctionDef', name: 'run_pipeline', range: 'lines 2-5', mutations: 'DecoratorSwaps, ComparisonFlips', children: '5 child nodes', status: 'Stable AST scope verified' })}>run_pipeline</span>(source_path):<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">if not</span> <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'Call', name: 'verify_imports', range: 'line 3', mutations: 'ReturnSwaps', children: '1 argument', status: 'Function invocation scanned' })}>verify_imports</span>(source_path):<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-red-400">raise</span> <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'Raise', name: 'CompileError', range: 'line 4', mutations: 'ExceptionSwaps', children: '1 arg', status: 'Compiler exception branch' })}>CompileError</span>(<span className="text-white">"Target corrupt"</span>)<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">return</span> <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'Return', name: 'compile_ast', range: 'line 5', mutations: 'None', children: '1 arg', status: 'Return pipeline output' })}>compile_ast</span>(source_path)
                  </pre>
                ) : (
                  <pre className="select-none text-left">
                    <span className="text-purple-400">export default</span> <span className="text-blue-400">function</span> <span className="text-emerald-400 font-bold hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'FunctionDeclaration', name: 'compileAST', range: 'lines 1-8', mutations: 'BoundaryInversions', children: '6 child nodes', status: 'Dynamic AST scope verified' })}>compileAST</span>(code) &#123;<br />
                    &nbsp;&nbsp;<span className="text-blue-400">const</span> ast = <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'VariableDeclarator', name: 'parse_call', range: 'line 2', mutations: 'InitAltered', children: '1 argument', status: 'Variable binding' })}>parse</span>(code);<br />
                    &nbsp;&nbsp;<span className="text-blue-400">if</span> (ast.errors.length &gt; <span className="text-amber-400">0</span>) &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-red-400">throw new</span> <span className="text-emerald-400 hover:underline cursor-pointer" onClick={() => setSelectedAstNode({ type: 'ThrowStatement', name: 'SyntaxError', range: 'line 4', mutations: 'None', children: '1 arg', status: 'Syntax exception branch' })}>SyntaxError</span>(<span className="text-white">"Parse fail"</span>);<br />
                    &nbsp;&nbsp;&#125;<br />
                    &nbsp;&nbsp;<span className="text-blue-400">return</span> ast;<br />
                    &#125;
                  </pre>
                )}
              </div>
            </div>
            <span className="text-[10px] text-white/40 block mt-4 font-mono text-left">Tip: Click green underlined tokens in the editor to inspect their live AST nodes!</span>
          </div>

          {/* Right panel: Live AST Tree & Metadata Details */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between border-2 border-black bg-[#1b1c2b] p-5 rounded-2xl shadow-[3px_3px_0px_#000000]">
            <div>
              <span className="text-[10px] font-black text-white/50 block mb-4 uppercase tracking-wider font-mono text-left">Abstract Syntax Tree (LibCST Representation)</span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-[11px] font-mono">
                {astLang === 'python' ? (
                  <>
                    <button onClick={() => setSelectedAstNode({ type: 'FunctionDef', name: 'run_pipeline', range: 'lines 2-5', mutations: 'DecoratorSwaps, ComparisonFlips', children: '5 child nodes', status: 'Stable AST scope verified' })} className={`w-full text-left p-1.5 rounded transition ${selectedAstNode.type === 'FunctionDef' ? 'bg-[#ff8ba7]/20 text-[#ff8ba7]' : 'hover:bg-white/5 text-white/80'}`}>
                      &nbsp;&bull;&nbsp;FunctionDef: <span className="text-white font-bold">run_pipeline()</span>
                    </button>
                    <button onClick={() => setSelectedAstNode({ type: 'Call', name: 'verify_imports', range: 'line 3', mutations: 'ReturnSwaps', children: '1 argument', status: 'Function invocation scanned' })} className={`w-full text-left p-1.5 rounded transition pl-6 ${selectedAstNode.type === 'Call' ? 'bg-[#ff8ba7]/20 text-[#ff8ba7]' : 'hover:bg-white/5 text-white/70'}`}>
                      &bull;&nbsp;CallExpression: <span className="text-white font-semibold">verify_imports()</span>
                    </button>
                    <button onClick={() => setSelectedAstNode({ type: 'Raise', name: 'CompileError', range: 'line 4', mutations: 'ExceptionSwaps', children: '1 arg', status: 'Compiler exception branch' })} className={`w-full text-left p-1.5 rounded transition pl-6 ${selectedAstNode.type === 'Raise' ? 'bg-[#ff8ba7]/20 text-[#ff8ba7]' : 'hover:bg-white/5 text-white/70'}`}>
                      &bull;&nbsp;RaiseStatement: <span className="text-white font-semibold">CompileError</span>
                    </button>
                    <button onClick={() => setSelectedAstNode({ type: 'Return', name: 'compile_ast', range: 'line 5', mutations: 'None', children: '1 arg', status: 'Return pipeline output' })} className={`w-full text-left p-1.5 rounded transition pl-6 ${selectedAstNode.type === 'Return' ? 'bg-[#ff8ba7]/20 text-[#ff8ba7]' : 'hover:bg-white/5 text-white/70'}`}>
                      &bull;&nbsp;ReturnStatement: <span className="text-white font-semibold">compile_ast()</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setSelectedAstNode({ type: 'FunctionDeclaration', name: 'compileAST', range: 'lines 1-8', mutations: 'BoundaryInversions', children: '6 child nodes', status: 'Dynamic AST scope verified' })} className={`w-full text-left p-1.5 rounded transition ${selectedAstNode.type === 'FunctionDeclaration' ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]' : 'hover:bg-white/5 text-white/80'}`}>
                      &nbsp;&bull;&nbsp;FunctionDeclaration: <span className="text-white font-bold">compileAST()</span>
                    </button>
                    <button onClick={() => setSelectedAstNode({ type: 'VariableDeclarator', name: 'parse_call', range: 'line 2', mutations: 'InitAltered', children: '1 argument', status: 'Variable binding' })} className={`w-full text-left p-1.5 rounded transition pl-6 ${selectedAstNode.type === 'VariableDeclarator' ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]' : 'hover:bg-white/5 text-white/70'}`}>
                      &bull;&nbsp;VariableDeclarator: <span className="text-white font-semibold">ast = parse()</span>
                    </button>
                    <button onClick={() => setSelectedAstNode({ type: 'ThrowStatement', name: 'SyntaxError', range: 'line 4', mutations: 'None', children: '1 arg', status: 'Syntax exception branch' })} className={`w-full text-left p-1.5 rounded transition pl-6 ${selectedAstNode.type === 'ThrowStatement' ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]' : 'hover:bg-white/5 text-white/70'}`}>
                      &bull;&nbsp;ThrowStatement: <span className="text-white font-semibold">SyntaxError</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Node Metadata Detail Block */}
            <div className="mt-4 p-3 bg-black/40 border border-black rounded-xl text-[10px] leading-relaxed text-white/70 text-left">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-extrabold text-white text-[11px] font-mono">{selectedAstNode.type}</span>
                <span className="px-2 py-0.5 bg-[#1b1c2b] border border-black rounded-full text-[8px] font-mono uppercase font-black tracking-wide text-white/60">{selectedAstNode.range}</span>
              </div>
              <div>Identifier Target: <strong className="text-white font-mono">{selectedAstNode.name}</strong></div>
              <div>Structural Scope: <span className="text-[#c084fc] font-bold">{selectedAstNode.status}</span></div>
              <div>Available Mutations: <span className="text-amber-400 font-bold">{selectedAstNode.mutations}</span></div>
              <div className="text-[9px] text-white/40 mt-1 font-mono">{selectedAstNode.children} associated in sub-tree.</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agent Autonomy Comparison Grid Section */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
            agent_benchmarks.log
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Autonomy Benchmarks
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            How Aeres's AST-driven autonomous feedback loops stack up against standard cloud-based generative AI assistants on actual logic tasks.
          </p>
        </div>

        <div className="kawaii-card bg-[#13141f] overflow-hidden border-3 border-black shadow-[4px_4px_0px_#000000]">
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
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Compiler Exception Repairs</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Autonomous self-healing via pty capture
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Manual code pasting & query attempts
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Dependency Vulnerabilities</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Real-time AST-import scanning & one-click fixes
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Requires manual list commands & audits
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Local Code Safety Sandbox</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    100% offline-first execution via sidecar binary
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Sends code blocks to third-party endpoints
                  </td>
                </tr>
                <tr className="hover:bg-white/2 transition">
                  <td className="p-4 border-r border-black/10 font-mono text-white text-left">Design-by-Contract Checking</td>
                  <td className="p-4 border-r border-black/10 text-center text-emerald-400 font-extrabold bg-emerald-500/5">
                    Dynamic capture & automated snapshot suite creation
                  </td>
                  <td className="p-4 text-center text-white/50">
                    Hypothetical guesses without runtime telemetry
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
          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-4 font-mono">
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
                className={`kawaii-card border-3 border-black overflow-hidden transition-all duration-300 ${isOpen ? 'bg-[#1b1c2b] shadow-[4px_4px_0px_#000000] scale-[1.01]' : 'bg-[#13141f] shadow-[2.5px_2.5px_0px_#000000] hover:bg-white/5'}`}
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
                      <div className="px-6 pb-6 pt-1 border-t-3 border-black/10 font-sans font-semibold text-xs text-white/70 leading-relaxed bg-[#13141f]/40 text-left">
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
        <div className="kawaii-card bg-[#1b1c2b] p-12 text-center relative overflow-hidden">
            <h2 className="font-display text-[clamp(2rem,6vw,4.5rem)] font-black tracking-tight leading-[0.9] mb-12 text-white">
              The neural layer <br/><span className="italic font-bold text-[#ff8ba7] bg-white border-4 border-black px-6 py-2.5 inline-block shadow-[4px_4px_0px_#000000] rounded-[2.5rem] mt-4 text-black">is Aeres.</span>
            </h2>
            <div className="flex justify-center">
               <SmartDownload large className="kawaii-btn-pink text-xs uppercase tracking-wider font-display font-bold" />
            </div>
        </div>
      </section>

      <div className="relative z-10 mt-12">
        <Footer />
      </div>
    </div>
  )
}
