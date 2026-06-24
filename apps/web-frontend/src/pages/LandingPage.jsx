import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'
import SmartDownload from '../components/SmartDownload.jsx'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'
import Mermaid from '../components/Mermaid.jsx'

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

      {/* Zero-Config CLI Terminal Dashboard */}
      <section className="relative px-6 py-12 max-w-[1400px] mx-auto z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            terminal_daemon
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Zero-Config Provisioning
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
{`# 1. Fetch system binaries & scripts
$ ${OS_SCRIPTS[activeOs].command}

# 2. Spin up low-overhead background daemon
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
            
            {/* Step 1: Universal LSP */}
            <div 
              onClick={() => setScrollyStep(0)}
              onMouseEnter={() => setScrollyStep(0)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 0 ? 'bg-[#18181b] border-[3px] border-[#ff8ba7]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#ff8ba7]">
                <span className="px-3 py-1 bg-[#ff8ba7] text-black border border-white/10 rounded-full">STAGE 01</span>
                <span>UNIVERSAL LSP INTEGRATION</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Language Server Bridge</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Aeres bridges the Monaco Editor directly to local background daemons (gopls, clangd, rust-analyzer) via our FastAPI Python sidecar using raw JSON-RPC streams for zero-latency IntelliSense.
              </p>
            </div>

            {/* Step 2: Self-Healing Terminal */}
            <div 
              onClick={() => setScrollyStep(1)}
              onMouseEnter={() => setScrollyStep(1)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 1 ? 'bg-[#18181b] border-[3px] border-[#fef08a]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#eab308]">
                <span className="px-3 py-1 bg-[#fef08a] text-black border border-white/10 rounded-full">STAGE 02</span>
                <span>PTY STREAM PIPELINES</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Self-Healing Terminal</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                Our embedded xterm.js canvas streams raw PTY outputs from the background manager, allowing you to compile, debug, and trace execution stacks directly within a secure sandboxed memory space.
              </p>
            </div>

            {/* Step 3: Deep-Linked Auth */}
            <div 
              onClick={() => setScrollyStep(2)}
              onMouseEnter={() => setScrollyStep(2)}
              className={`w-full text-left p-6 rounded-[2rem] transition-all duration-500 border-solid ${scrollyStep === 2 ? 'bg-[#18181b] border-[3px] border-[#2dd4bf]' : 'bg-[#18181b] border-[3px] border-transparent hover:border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4 font-mono text-[10px] font-black text-[#2dd4bf]">
                <span className="px-3 py-1 bg-[#2dd4bf] text-black border border-white/10 rounded-full">STAGE 03</span>
                <span>TAURI AUTHENTICATION HANDLERS</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Deep-Linked Authentication</h3>
              <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
                We handle OAuth securely by funneling Clerk tokens back through native aeres:// deep links. This bridges web identity tightly into local Zustand state for persistent workspace configurations.
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
                
                {/* Visualizer 0: Universal LSP */}
                {scrollyStep === 0 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#ff8ba7] block mb-4 uppercase">Monaco JSON-RPC Sync</span>
                    
                    <div className="w-full h-56 border border-white/10 rounded-3xl bg-[#09090e] p-5 font-mono text-[10px] text-white/80 overflow-y-auto leading-relaxed relative">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-white/10 text-white/50">
                        <span>1</span>
                        <span className="text-[#c084fc]">function</span> <span className="text-[#2dd4bf]">initializeLSP</span>() {'{'}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">2</span>
                        <span className="pl-4">const connection = <span className="text-[#ff8ba7]">await</span> <span className="text-[#2dd4bf]">connectToFastAPI</span>();</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">3</span>
                        <span className="pl-4">connection.<span className="text-[#fef08a]">sendRequest</span>('initialize', payload);</span>
                      </div>
                      <div className="flex gap-2 text-white/30 italic">
                        <span className="text-white/50">4</span>
                        <span className="pl-4">// Receiving real-time AST diagnostics</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-white/50">5</span>
                        <span className="pl-4 text-[#ff8ba7]">return</span> <span className="text-[#2dd4bf]">MonacoLanguageClient</span>.create(connection);
                      </div>
                      <div className="flex gap-2 mt-2 pt-2 border-t-2 border-white/10 text-white/50">
                        <span>6</span>
                        <span>{'}'}</span>
                      </div>

                      {/* Mock Diagnostic Popup */}
                      <div className="absolute top-16 left-12 bg-[#1b1c2b] border border-white/10 rounded-xl p-3 shadow-2xl w-[70%] animate-pulse">
                        <div className="text-[9px] text-[#ff8ba7] font-black uppercase mb-1">TypeScript Diagnostics</div>
                        <div className="text-white/80 text-[10px]">Property 'sendRequest' implicitly has an 'any' type.</div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      LSP responses are streamed flawlessly over WebSockets directly to the Monaco editor, keeping typing latency under 5ms.
                    </span>
                  </div>
                )}

                {/* Visualizer 1: Self-Healing Terminal */}
                {scrollyStep === 1 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#eab308] block mb-4 uppercase">Background Daemon PTY</span>
                    
                    <div className="w-full h-56 flex flex-col justify-end border border-white/10 rounded-3xl bg-black p-5 font-mono text-[10px] overflow-y-auto leading-relaxed text-[#2dd4bf]">
                      <div className="space-y-1">
                        <div className="text-white/50">âžœ  workspace git:(main) aeres build</div>
                        <div className="text-white/70">[Core] Initializing Rust Tauri bundler...</div>
                        <div className="text-white/70">[Deps] Fetching crates.io registry...</div>
                        <div className="text-white">Compiling aeres-core v1.0.4</div>
                        <div className="text-red-400">error[E0425]: cannot find value `config` in this scope</div>
                        <div className="text-white/50"> &nbsp;--&gt; src/main.rs:42:15</div>
                        <div className="text-[#eab308] italic animate-pulse">Waiting for diagnostic repair payload...</div>
                        <div className="text-emerald-400 font-extrabold mt-2">Build finished in 4.2s. Output: target/release/aeres</div>
                        <div className="text-white/50 flex">âžœ  workspace git:(main) <span className="w-2 h-4 bg-[#2dd4bf] ml-1 animate-ping inline-block" /></div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      xterm.js embeds natively into the React tree, streaming subprocess buffers straight from the underlying Rust architecture.
                    </span>
                  </div>
                )}

                {/* Visualizer 2: Deep-Linked Auth */}
                {scrollyStep === 2 && (
                  <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black text-[#2dd4bf] block mb-4 uppercase">OAuth Protocol Handler</span>
                    
                    <div className="w-full h-56 border border-white/10 rounded-3xl bg-[#1b1c2b] p-5 font-mono text-[9px] overflow-y-auto leading-relaxed relative flex flex-col justify-center gap-3">
                      
                      {/* Flow Step 1 */}
                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-black/50">
                        <div className="w-6 h-6 rounded-full bg-[#ff8ba7] border border-white/10 flex items-center justify-center shrink-0">1</div>
                        <div>
                          <div className="text-white font-bold">Clerk Identity Provider</div>
                          <div className="text-white/50">Browser resolves OAuth handshake securely.</div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="w-1 h-4 bg-white/20 mx-auto" />

                      {/* Flow Step 2 */}
                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-black/50 ring-2 ring-[#2dd4bf]">
                        <div className="w-6 h-6 rounded-full bg-[#2dd4bf] border border-white/10 flex items-center justify-center shrink-0 text-black">2</div>
                        <div>
                          <div className="text-[#2dd4bf] font-bold">aeres:// Deep Link Execution</div>
                          <div className="text-white/50 truncate w-40">aeres://auth?token=eyJhbG...</div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="w-1 h-4 bg-white/20 mx-auto" />

                      {/* Flow Step 3 */}
                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-black/50">
                        <div className="w-6 h-6 rounded-full bg-[#c084fc] border border-white/10 flex items-center justify-center shrink-0 text-black">3</div>
                        <div>
                          <div className="text-white font-bold">Tauri IPC Hydration</div>
                          <div className="text-white/50">Zustand global store receives JWT payload.</div>
                        </div>
                      </div>

                    </div>

                    <span className="text-[9px] font-bold text-white/50 block mt-4 font-sans leading-relaxed">
                      We bypass traditional electron auth hurdles by mapping custom OS protocol handlers directly into the local React state via Tauri hooks.
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: AST Parsing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border border-white/10 flex items-center justify-center mb-6 text-[#ff8ba7] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">AST Parsing Engine</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Parses source codes at 240,000 lines/second to render abstract syntax trees locally. Resolves types and scopes under 5ms.
            </p>
          </motion.div>

          {/* Card 2: Offline-First LSP */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#2dd4bf]/20 border border-white/10 flex items-center justify-center mb-6 text-[#2dd4bf] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Local-First LSP Server</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Keeps syntax analysis, code logic, and local context safe on your system. Completely independent of internet requirements.
            </p>
          </motion.div>

          {/* Card 3: Zero-Overhead Tracing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#c084fc]/20 border border-white/10 flex items-center justify-center mb-6 text-[#c084fc] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Zero-Overhead Tracing</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Measures compiler branches and memory heaps with microsecond granularity. Generates detailed local Flamegraphs inside the buffer.
            </p>
          </motion.div>

          {/* Card 4: Clerk Desktop Sync */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#fef08a]/20 border border-white/10 flex items-center justify-center mb-6 text-[#fef08a] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Workspace Account Sync</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Syncs profile parameters, keybindings, and extensions across web frameworks and Electron wrappers securely using Clerk.
            </p>
          </motion.div>

          {/* Card 5: Mutation testing */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.5 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border border-white/10 flex items-center justify-center mb-6 text-[#ff8ba7] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Mutation Synthesizer</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Programmatically alters comparison bounds and statement variables in sandbox caches to verify that tests fail when they should.
            </p>
          </motion.div>

          {/* Card 6: Pseudoterminal sidecar */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.6 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#2dd4bf]/20 border border-white/10 flex items-center justify-center mb-6 text-[#2dd4bf] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Self-Healing Terminal</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Integrated background runners intercept traceback exceptions, surgically rewriting syntax mistakes in real-time until targets build.
            </p>
          </motion.div>

          {/* Card 7: Temporal Lens */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.7 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#c084fc]/20 border border-white/10 flex items-center justify-center mb-6 text-[#c084fc] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Temporal Lens</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Low-overhead active profiling maps function latency, P95 timing spikes, and trend sparklines dynamically during run session updates.
            </p>
          </motion.div>

          {/* Card 8: Universal LSP */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.8 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8ba7]/20 border border-white/10 flex items-center justify-center mb-6 text-[#ff8ba7] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Universal LSP Engine</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Auto-detects and spawns dedicated Language Servers (gopls, clangd, rust-analyzer, jedi) based on file extensions out of the box.
            </p>
          </motion.div>

          {/* Card 9: Universal DAP Debugging */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.9 }} className="bg-[#18181b] border-[3px] border-transparent hover:border-white/10 transition-all rounded-[2rem] p-8">
            <div className="w-10 h-10 rounded-2xl bg-[#fef08a]/20 border border-white/10 flex items-center justify-center mb-6 text-[#fef08a] shadow-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 20c-3.31 0-6-2.69-6-6v-1h4v1c0 1.1.9 2 2 2s2-.9 2-2v-1h4v1c0 3.31-2.69 6-6 6Z"/><path d="M12 15V8"/></svg>
            </div>
            <h3 className="font-display text-lg font-black text-white mb-3">Universal Debugging (DAP)</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Natively parses `.aeres/launch.json` or `.vscode/launch.json` to attach high-speed breakpoints across Go, Node, Python, and Rust.
            </p>
          </motion.div>

        </div>
      </section>

      {/* Creators Showcase Section (New Content) */}
      <section className="relative px-6 py-20 max-w-[1200px] mx-auto z-10 font-display">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
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
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#ff8ba7] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black">
              SP
            </div>
            <h3 className="text-xl font-black text-white mb-1">Shlok Patel</h3>
            <span className="text-[10px] font-black text-[#ff8ba7] uppercase tracking-wider block mb-4 font-mono">Core AST Mutators Architect</span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Orchestrated the abstract syntax tree mutation sandboxes, circular dependency checkers, and high-performance React component render cycles.
            </p>
          </div>

          {/* Creator 2: Rutvik Gudaliya */}
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#2dd4bf] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black">
              RG
            </div>
            <h3 className="text-xl font-black text-white mb-1">Rutvik Gudaliya</h3>
            <span className="text-[10px] font-black text-[#2dd4bf] uppercase tracking-wider block mb-4 font-mono">Sidecar Daemon & Git Telemetry</span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">
              Developed the local FastAPI Python background daemon, Websocket event routers, and directed causal blame regression mapping systems.
            </p>
          </div>

          {/* Creator 3: Vinit Panchal */}
          <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#c084fc] mx-auto mb-6 flex items-center justify-center font-display text-2xl font-black text-black">
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
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-4 font-mono">
            ast_synthesizer.run
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">
            Interactive AST Playground
          </h2>
          <p className="max-w-[580px] mx-auto text-white/60 text-xs font-semibold leading-relaxed mt-4 font-sans">
            Aeres uses a robust syntax mutation synthesizer. Click nodes below to see how our engine parses, tracks scopes, and synthesizes local bug-prevention mutations instantly.
          </p>
        </div>

        <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-6 md:p-10 flex flex-col lg:flex-row gap-8 items-stretch">
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
                  className={`px-4 py-2 border border-white/10 rounded-xl text-xs font-mono font-black transition-all ${astLang === 'python' ? 'bg-[#ff8ba7] text-black shadow-2xl' : 'bg-[#1b1c2b] text-white/60 shadow-2xl'}`}
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
                  className={`px-4 py-2 border border-white/10 rounded-xl text-xs font-mono font-black transition-all ${astLang === 'javascript' ? 'bg-[#2dd4bf] text-black shadow-2xl' : 'bg-[#1b1c2b] text-white/60 shadow-2xl'}`}
                >
                  parser_core.js
                </button>
              </div>

              {/* Code Editor Mock */}
              <div className="bg-black border border-white/10 p-5 rounded-2xl font-mono text-[11px] leading-relaxed text-[#2dd4bf] min-h-[190px]">
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
          <div className="w-full lg:w-1/2 flex flex-col justify-between border border-white/10 bg-[#1b1c2b] p-5 rounded-2xl shadow-2xl">
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

