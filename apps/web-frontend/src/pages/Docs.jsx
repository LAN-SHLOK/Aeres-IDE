import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'

// custom SVG icons representing folders and files without emojis
const Icons = {
  folderClosed: (
    <svg className="w-5 h-5 text-[#ff8ba7] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  folderOpen: (
    <svg className="w-5 h-5 text-[#ff8ba7] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
    </svg>
  ),
  file: (
    <svg className="w-4 h-4 text-[#c084fc] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  alert: (
    <div className="w-6 h-6 rounded-full border-2 border-black bg-[#1b1c2b] text-[#ff8ba7] flex items-center justify-center text-xs font-black shrink-0 font-mono shadow-[1.5px_1.5px_0px_#000000]">
      !
    </div>
  ),
  copy: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const PLAYGROUND_SNIPPETS = {
  json: {
    filename: 'settings.json',
    lang: 'JSON',
    command: 'aeres --config-check',
    code: `{
  "aeres.ai.model": "llama-3-70b-speculative",
  "aeres.ai.localOnly": true,
  "aeres.terminal.shell": "powershell.exe",
  "aeres.mutation.survivalThreshold": 0.85,
  "aeres.radar.circularCheck": true
}`
  },
  python: {
    filename: 'agent_trigger.py',
    lang: 'PYTHON',
    command: 'python agent_trigger.py',
    code: `from aeres.agents import AgentLoop
 
# Initialize high-fidelity agent loop
agent = AgentLoop(
    workspace_path="./src",
    sandbox_mode=True,
    self_healing=True,
    max_iterations=10
)
 
# Start run with custom repair command
result = agent.execute_run(
    task="Verify imports and compile broken modules"
)
 
print(f"Build clean. Exit code: {result.exit_code}")`
  },
  javascript: {
    filename: 'mutation.config.js',
    lang: 'JAVASCRIPT',
    command: 'aeres --run-mutations',
    code: `export default {
  target: './apps/desktop-client/src',
  mutators: [
    'ComparisonOperatorMutator', // Swaps < to <=
    'BooleanLiteralMutator',      // Flips true to false
    'ArithmeticBoundsMutator'    // Alters boundary offsets
  ],
  exclude: ['**/__tests__/**', '**/node_modules/**'],
  threshold: 85
}`
  }
}

const DOCUMENTATION_SECTIONS = [
  {
    category: 'GET STARTED',
    pages: [
      {
        id: 'introduction',
        title: 'Introduction',
        icon: Icons.file,
        header: 'Aeres IDE: Next-Generation Local Multi-Agent Workspace',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Welcome to the Aeres IDE developer manual. Aeres is a high-fidelity development sandbox built for offline-first speed, intelligence, and seamless code orchestration. Combining local abstract syntax tree (AST) evaluations with background terminal runner integration, Aeres delivers the visual styling of premium web hubs with staff-level software engineering autonomy.
            </p>

            <div className="my-8 flex gap-4 p-5 rounded-3xl bg-[#13141f] border-3 border-black shadow-[4px_4px_0px_#000000] relative overflow-hidden group">
              {Icons.alert}
              <div className="relative z-10 font-sans text-left">
                <span className="text-white font-black text-sm block mb-1">Architecture Philosophy</span>
                <span className="text-white/60 text-xs font-bold leading-relaxed block text-left">
                  Aeres operates under a strict offline-first, local-first mandate. All AST parsing, syntax diagnostics, code indexing, and key neural workflows can run completely on the developer's hardware without leaking intellectual property to cloud aggregators.
                </span>
              </div>
            </div>

            <h3 className="text-lg font-black text-white mt-10 mb-4 font-display text-left">Core Principles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-6 text-left">
              <div className="p-5 rounded-3xl bg-[#13141f] border-3 border-black shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">AST-Driven Intelligence</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Intelligence works by parsing syntax trees (ASTs) rather than simple text prediction, eliminating typical text hallucinatory blocks.</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13141f] border-3 border-black shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">Self-Correction Loops</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Integrated pseudoterminals allow the AI to run builds, intercept tracebacks, surgical edit, and verify until the code is 100% green.</p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'quickstart',
        title: 'Quick Start',
        icon: Icons.file,
        header: 'Setup & CLI Onboarding',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Mount the global terminal sidecar utility and command hooks to your system path to seamlessly initialize new workspaces and launch local services.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">1. Environment Provisioning</h3>
            <p className="text-white/60 text-xs font-bold mb-4 leading-relaxed font-sans text-left">
              Provision the CLI package globally using standard package managers. This registers all LSP listeners and bridge protocols:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
              $ npm install -g aeres-cli
            </pre>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">2. Workspace mounting</h3>
            <p className="text-white/60 text-xs font-bold mb-4 leading-relaxed font-sans text-left">
              Mount the target source tree path to prepare the indexing database:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
              $ aeres init --workspace ./my-typescript-app
            </pre>
          </div>
        )
      }
    ]
  },
  {
    category: 'CORE DIAGNOSTICS',
    pages: [
      {
        id: 'dependency-radar',
        title: 'Dependency Radar',
        icon: Icons.file,
        header: 'AST-Level circular import radar and CVE audits',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE introduces the **Dependency Radar** panel, powered by deep AST scanning and interactive visual layouts. Rather than just listing package names in a simple lock file, Dependency Radar maps circular file dependencies and tracks vulnerable ecosystems in real time.
            </p>
            
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">System Integrity Metrics</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>D3 Force-Directed Layout:</strong> Renders a highly interactive radial node network of all workspace imports.</li>
              <li><strong>Circular Link Detection:</strong> Instantly flags problematic circular dependency files before compiling.</li>
              <li><strong>Vulnerability Warnings:</strong> Connects to security registries, identifying specific CVE hashes and listing release updates.</li>
              <li><strong>Breaking Changes Audit:</strong> Auto-fetches release logs from GitHub, notifying developers about boundary disruptions in deprecated dependency tiers.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'causal-blame',
        title: 'Causal Blame Graph',
        icon: Icons.file,
        header: 'Directed regression chains from Git telemetry',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Debugging logical errors is simple with Aeres's **Causal Blame Map** panel. By clicking function declarations inside the Monaco code canvas, developers can generate targeted regression timelines that point back directly through Git commit chains.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Directed Commit Tracebacks</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              The Electron backend builds a directed graph with specialized links tracking bug propagation. For instance, if an OutOfMemory traceback occurs, the engine back-traces line parameters across structural refactors, mapping the error node back to the causal commit automatically:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
[Error Line 142] --caused--&gt; [Commit a8e90f: Swapped bounds] --caused--&gt; [Commit d5b12a]
            </pre>
          </div>
        )
      },
      {
        id: 'mutation-testing',
        title: 'AST Mutation Testing',
        icon: Icons.file,
        header: 'Isolated mutant synthesis and test coverage sweeps',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              To guarantee absolute test suite rigor, Aeres features the **Mutation Panel**. The core runner clones your workspace buffer directories into sandboxed memory folders, systematically injecting minor syntax mutations.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Mutator Synthesis Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-6 font-sans text-left">
              <div className="p-5 rounded-3xl border-3 border-black bg-[#13141f] shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">Binary Bounds Mutation</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Swaps comparison boundaries (e.g. replacing &lt; with &lt;=) to verify boundary-condition assertions.</p>
              </div>
              <div className="p-5 rounded-3xl border-3 border-black bg-[#13141f] shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">Boolean Operator Flips</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Alters logic flows (switching true to false) to double-check that test coverage catches logical changes.</p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'temporal-lens',
        title: 'Temporal Lens Profiling',
        icon: Icons.file,
        header: 'Asynchronous CPU Execution Latency Sweeps',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The **Temporal Lens** is a high-speed runtime execution profiler integrated natively into the Aeres Desktop runner. By leveraging low-level active CPU hooks, it maps latency metrics for function calls, loops, and external queries asynchronously.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How the Telemetry works</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Unlike traditional bulky profilers that freeze thread states, the Temporal Lens polls active latency metrics at standard intervals (4000ms updates) directly from the background runtime sidecar context. It aggregates:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Total Execution Time:</strong> Cumulate duration in milliseconds compiled for all captured blocks.</li>
              <li><strong>Average Latency:</strong> Standard duration computed across total calls.</li>
              <li><strong>P95 Distribution Percentile:</strong> Highlights outliers and heavy database query bounds before compilation leaks into production threads.</li>
              <li><strong>SVG Sparklines:</strong> Visualizes historical trends dynamically right inside the sidebar layout.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'contract-observations',
        title: 'Contract Testing Scanner',
        icon: Icons.file,
        header: 'Automatic boundary captures and test synthesis',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres features a revolutionary **Contract Observations** scanner. While executing tests or running logic in the workspace, background telemetry probes record input parameters, output return scopes, and variable types to map structural invariants.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Automated Snapshot Generation</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              When enough unique call observations are recorded, Aeres maps edge-case thresholds. Developers can click 'Generate Snapshot Tests' to automatically generate virtual test suites (such as test_fn.py or fn.test.ts) that enforce verified boundaries without manual script writing:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
const res = await window.electron.contract.generate(&#123;<br />
&nbsp;&nbsp;file_path: activeTab.path,<br />
&nbsp;&nbsp;function_name: fn,<br />
&nbsp;&nbsp;language: activeTab.language<br />
&#125;);
            </pre>
          </div>
        )
      }
    ]
  },
  {
    category: 'ADVANCED AI OPERATIONS',
    pages: [
      {
        id: 'model-provisioning',
        title: 'Local Model Provisioning',
        icon: Icons.file,
        header: 'Zero data leakage offline neural setups',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres supports complete offline operation, routing LLM completions and multi-agent loops to local executors to secure target intellectual properties completely.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Ollama Runner Configuration</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Install Ollama locally and pull high-performance completion structures (e.g. Qwen-2.5-Coder or Llama-3 8B). Then update the Aeres configuration parameters inside your root settings:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
&#123;<br />
&nbsp;&nbsp;"aeres.ai.provider": "ollama",<br />
&nbsp;&nbsp;"aeres.ai.model": "qwen2.5-coder:7b",<br />
&nbsp;&nbsp;"aeres.ai.endpoint": "http://127.0.0.1:11434",<br />
&nbsp;&nbsp;"aeres.ai.local_fallback": true<br />
&#125;
            </pre>
          </div>
        )
      },
      {
        id: 'terminal-healing',
        title: 'Pseudoterminal Orchestration',
        icon: Icons.file,
        header: 'Shell Interceptions & Autonomous Error Patches',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Aeres **Self-Healing Terminal** framework runs commands within low-overhead pseudoterminal (pty) streams. When a build tool or script exits with non-zero codes, the traceback hooks capture stderr frames directly.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">The Compile-Repair Hook Lifecycle</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Traceback Capture:</strong> The sidecar grabs detailed compiler errors (such as missing declarations or typos).</li>
              <li><strong>AST Mutator Patching:</strong> The LibCST logic core edits source coordinates precisely rather than guessing lines.</li>
              <li><strong>Assertion Sweep:</strong> Refreshes the build command in background sandbox memory to verify that the repair is syntactically correct before merging.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'PRODUCTIVITY SUITE',
    pages: [
      {
        id: 'focus-sessions',
        title: 'Focus Session Snapshots',
        icon: Icons.file,
        header: 'One-Click Workspace Restorations & Layout Syncs',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres features **Focus Sessions** to capture full developer context instantly. Pressing `Ctrl+Shift+S` prompts the environment to freeze current buffer layouts, active terminals, and panel coordinates.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Restoring Workspace Context</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Focus Sessions are stored locally. Restoring a session recreates the exact state, opening Monaco editors at the exact cursor line, restoring shell commands, and re-provisioning the active panel selections:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
// Invokes local session restore stream<br />
await window.electron.sessions.restore(&#123;<br />
&nbsp;&nbsp;sessionId: "target-session-uuid"<br />
&#125;);
            </pre>
          </div>
        )
      },
      {
        id: 'multiverse-variants',
        title: 'Multiverse Variant Synthesis',
        icon: Icons.file,
        header: 'Parallel Code Syntheses Comparison Panel',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              When solving complex design decisions or resolving refactor requests, the **Multiverse AI Variant** generator synthesizes three parallel, syntactically verified variants (Variants A, B, and C) side-by-side.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Comparative Analysis & Merges</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Variant A (Performant):</strong> Optimized for raw memory boundaries and execution speeds.</li>
              <li><strong>Variant B (Resilient):</strong> Includes comprehensive boundary assertions and try-except error fallbacks.</li>
              <li><strong>Variant C (Concise):</strong> Maximizes code cleanliness and functional brevity.</li>
            </ul>
            <p className="text-white/60 text-xs font-bold leading-relaxed font-sans text-left">
              Clicking 'Apply Variant' instructs the AST mutator core to merge structural changes into the code buffer instantly.
            </p>
          </div>
        )
      },
      {
        id: 'macros-keybindings',
        title: 'Macros & Keybindings',
        icon: Icons.file,
        header: 'Custom Vim Motions & AST Macros',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres supports deep vim motion emulation and custom AST macros. Bind complex refactoring logic directly to standard keyboard shortcuts.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Custom Keymap Configuration</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Define your own global macros in the workspace `keymap.json`:
            </p>
            <pre className="bg-[#09090e] border-3 border-black shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
&#123;<br />
&nbsp;&nbsp;"keybindings": [<br />
&nbsp;&nbsp;&nbsp;&nbsp;&#123; "key": "ctrl+shift+r", "command": "aeres.mutator.flipBounds" &#125;,<br />
&nbsp;&nbsp;&nbsp;&nbsp;&#123; "key": "alt+m", "command": "aeres.panels.toggleMutation" &#125;<br />
&nbsp;&nbsp;]<br />
&#125;
            </pre>
          </div>
        )
      }
    ]
  },
  {
    category: 'SYSTEM ARCHITECTURE',
    pages: [
      {
        id: 'tech-stack',
        title: 'System Technology Stack',
        icon: Icons.file,
        header: 'High-Performance Hybrid Architecture',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-8">
              Aeres's unified stack is optimized to deliver 60fps interaction paradigms in the client portal backed by lightning-fast neural reasoning models.
            </p>

            <div className="space-y-6 text-left">
              <div>
                <span className="text-xs font-mono text-[#ff8ba7] font-extrabold uppercase tracking-wider block mb-2">Desktop & Web Client (React / Electron)</span>
                <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans">
                  <li><strong>React 18 & Vite:</strong> Drives fast, dynamic layouts, HMR bindings, and lightning assembly.</li>
                  <li><strong>Zustand:</strong> Minimizes render paths for tab configurations, terminal metrics, and git logs.</li>
                  <li><strong>Framer Motion:</strong> Silk-like, micro-animating card indicators and scrolling physics.</li>
                  <li><strong>Monaco Editor:</strong> Powers smooth text canvas rendering, code syntax styling, and multi-cursors.</li>
                </ul>
              </div>

              <div>
                <span className="text-xs font-mono text-[#ff8ba7] font-extrabold uppercase tracking-wider block mb-2">Core AI Engine Backend (FastAPI / Groq)</span>
                <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans">
                  <li><strong>FastAPI & WebSockets:</strong> Delivers asynchronous JSON hooks and live AI streaming chunks.</li>
                  <li><strong>Groq Gateway:</strong> Connects local systems directly to Llama-3 70B & Vision APIs running at 300+ t/s.</li>
                  <li><strong>LibCST & AST Parsers:</strong> Compiles, modifies, and mutates source files securely without standard text replacements.</li>
                  <li><strong>Ripgrep:</strong> Powers ultra-fast workspace string finders and imports mappings.</li>
                </ul>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'telemetry-structures',
        title: 'Secure Telemetry',
        icon: Icons.file,
        header: 'Zero-Emission Local Metrics',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Unlike cloud IDEs, Aeres keeps all crash telemetry and usage metrics strictly on your local disk inside an encrypted SQLite database.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Data Isolation Policies</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Offline Analytics:</strong> Flamegraphs and causal blames are never sent externally.</li>
              <li><strong>Local Encryption:</strong> Your `settings.json` secrets are encrypted using AES-256 GCM.</li>
            </ul>
          </div>
        )
      }
    ]
  }
]

export default function Docs() {
  const [activePageId, setActivePageId] = useState('introduction')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  
  // Interactive Sandbox Code Playground Language Selector
  const [sandboxLang, setSandboxLang] = useState('json')

  // Left Sidebar Filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return DOCUMENTATION_SECTIONS

    return DOCUMENTATION_SECTIONS.map(cat => {
      const matchedPages = cat.pages.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.header.toLowerCase().includes(q)
      )
      if (matchedPages.length === 0) return null
      return { ...cat, pages: matchedPages }
    }).filter(Boolean)
  }, [searchQuery])

  // Flat page indexing
  const allPages = useMemo(() => {
    return DOCUMENTATION_SECTIONS.flatMap(cat => cat.pages)
  }, [])

  const currentPageIndex = allPages.findIndex(p => p.id === activePageId)
  const activePage = allPages[currentPageIndex] || allPages[0]

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Real-time Outline Scroll-Spy System
  const [activeOutlineId, setActiveOutlineId] = useState('introduction')
  
  useEffect(() => {
    const handleScroll = () => {
      const anchors = allPages.map(p => document.getElementById(p.id)).filter(Boolean)
      let activeId = activePageId

      // Spy on elements near the top viewport threshold
      for (const el of anchors) {
        const rect = el.getBoundingClientRect()
        if (rect.top >= 0 && rect.top <= 200) {
          activeId = el.id
          break
        }
      }
      setActiveOutlineId(activeId)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [allPages, activePageId])

  return (
    <div className="min-h-screen bg-[#09090e] font-body text-[#fffdf9] selection:bg-purple-500/20 selection:text-purple-300 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pt-32 px-4 md:px-8 gap-8 items-start pb-20">
        
        {/* Sleek Sidebar with dynamic search and glowing navigation buttons */}
        <aside className="w-72 shrink-0 hidden md:flex flex-col sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pr-4 scrollbar-none bg-[#13141f] border-4 border-black shadow-[4px_4px_0px_#000000] rounded-[2rem] p-6">
          
          {/* Docs Live Search Filter */}
          <div className="mb-6 font-sans">
            <div className="flex items-center gap-2.5 bg-[#09090e] border-3 border-black shadow-[2.5px_2.5px_0px_#000000] rounded-xl px-4 py-2.5 transition-all">
              <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specs index..."
                className="bg-transparent w-full border-none focus:outline-none text-xs text-white font-bold placeholder:text-white/30 font-sans"
              />
            </div>
          </div>

          {/* Navigation Category Hierarchy */}
          <nav className="space-y-6">
            {filteredCategories.map(cat => (
              <div key={cat.category} className="border-b-2 border-black/10 pb-4 last:border-b-0">
                <span className="text-[10px] font-black text-[#ff8ba7] tracking-wider block mb-3.5 uppercase font-mono flex items-center gap-1.5">
                  {Icons.folderOpen}
                  {cat.category}
                </span>
                <ul className="space-y-2.5 pl-1 font-display">
                  {cat.pages.map(p => {
                    const isActive = activePageId === p.id
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => {
                            setActivePageId(p.id)
                            setActiveOutlineId(p.id)
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left rounded-full border-3 border-black transition-all duration-300 ${isActive ? 'bg-[#c084fc] text-black font-black shadow-[2px_2px_0px_#000000]' : 'bg-[#1b1c2b] text-white/75 hover:bg-[#ff8ba7]/20 shadow-[1.5px_1.5px_0px_#000000]'}`}
                        >
                          <span className="shrink-0">{p.icon}</span>
                          <span>{p.title}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="text-xs text-white/30 italic pl-3 font-semibold">No matches found.</div>
            )}
          </nav>
        </aside>

        {/* Spacious, Reading Canvas */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.article
              key={activePage.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="max-w-[720px] w-full kawaii-card bg-[#13141f] border-3 border-black"
            >
              {/* Cozy Titlebar header with retro controls removed */}
              <div className="kawaii-titlebar font-display justify-start">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-black tracking-wide">{activePage.title}.log</span>
                </div>
              </div>

              {/* Main Document Content */}
              <div className="p-8 bg-[#13141f]">
                {/* Category Breadcrumb */}
                <span className="text-[10px] font-black text-black bg-[#fae3d9] border-2 border-black shadow-[1.5px_1.5px_0px_#000000] px-3 py-1 rounded-full tracking-widest uppercase font-mono inline-block mb-5">
                  {DOCUMENTATION_SECTIONS.find(cat => cat.pages.some(p => p.id === activePage.id))?.category || 'DOCS'}
                </span>

                {/* Page Main Header */}
                <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white mb-8 leading-tight">
                  {activePage.header}
                </h1>

                {/* Dynamic detailed content block */}
                <div className="font-sans leading-[1.8] text-white/70 text-sm font-semibold">
                  {activePage.content}
                </div>

                {/* Interactive Code Sandbox (Platform/Language Tabs) */}
                <div className="mt-12">
                  <span className="text-[10px] font-black text-white/40 tracking-wider block mb-4 uppercase font-mono">
                    interactive_playground.log
                  </span>

                  <div className="kawaii-card bg-[#13141f] border-3 border-black">
                    {/* Title selector bar */}
                    <div className="bg-[#1b1c2b] px-5 py-3 border-b-4 border-black flex items-center justify-between gap-4 font-display">
                      <div className="flex gap-2">
                        {Object.keys(PLAYGROUND_SNIPPETS).map((lang) => {
                          const isSelected = sandboxLang === lang
                          return (
                            <button
                              key={lang}
                              onClick={() => setSandboxLang(lang)}
                              className={`relative px-4 py-1.5 rounded-full text-[10px] font-mono border-2 border-black font-black uppercase tracking-wider transition-all duration-300 ${isSelected ? 'text-black bg-[#ff8ba7] shadow-[1.5px_1.5px_0px_#000000]' : 'text-white/60 bg-[#13141f] shadow-[1px_1px_0px_#000000]'}`}
                            >
                              {lang}
                            </button>
                          )
                        })}
                      </div>
                      <span className="text-[10px] font-mono font-black text-white">
                        {PLAYGROUND_SNIPPETS[sandboxLang].filename}
                      </span>
                    </div>

                    {/* Code playground text frame */}
                    <div className="p-5 font-mono text-xs overflow-x-auto bg-[#09090e]">
                      <pre className="text-white font-extrabold leading-relaxed select-all">
                        <code>{PLAYGROUND_SNIPPETS[sandboxLang].code}</code>
                      </pre>
                    </div>

                    {/* Copy command bar inside the playground card */}
                    <div className="bg-[#13141f] px-5 py-4 border-t-4 border-black flex items-center justify-between gap-4">
                      <span className="text-[10px] font-mono font-extrabold text-white/55">
                        $ {PLAYGROUND_SNIPPETS[sandboxLang].command}
                      </span>
                      <button
                        onClick={() => handleCopy(PLAYGROUND_SNIPPETS[sandboxLang].code, sandboxLang)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border-3 border-black text-xs font-black uppercase tracking-wider transition-all shrink-0 ${copiedId === sandboxLang ? 'bg-emerald-300 text-black shadow-[1px_1px_0px_#000000] translate-x-0.5 translate-y-0.5' : 'kawaii-btn-mint shadow-none'}`}
                      >
                        {copiedId === sandboxLang ? (
                          <>
                            {Icons.check}
                            Copied!
                          </>
                        ) : (
                          <>
                            {Icons.copy}
                            Copy Script
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Previous / Next Navigation Page Paging */}
                <div className="mt-16 pt-8 border-t-3 border-black flex justify-between items-center gap-4">
                  {currentPageIndex > 0 ? (
                    <button
                      onClick={() => {
                        setActivePageId(allPages[currentPageIndex - 1].id)
                        setActiveOutlineId(allPages[currentPageIndex - 1].id)
                      }}
                      className="flex flex-col items-start gap-1.5 p-4 rounded-3xl border-3 border-black bg-[#1b1c2b] shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition duration-200 text-left min-w-0"
                    >
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Previous</span>
                      <span className="text-xs text-white font-extrabold truncate max-w-[120px]">{allPages[currentPageIndex - 1].title}</span>
                    </button>
                  ) : <div />}

                  {currentPageIndex < allPages.length - 1 ? (
                    <button
                      onClick={() => {
                        setActivePageId(allPages[currentPageIndex + 1].id)
                        setActiveOutlineId(allPages[currentPageIndex + 1].id)
                      }}
                      className="flex flex-col items-end gap-1.5 p-4 rounded-3xl border-3 border-black bg-[#1b1c2b] shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition duration-200 text-right min-w-0 ml-auto"
                    >
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Next</span>
                      <span className="text-xs text-white font-extrabold truncate max-w-[120px]">{allPages[currentPageIndex + 1].title}</span>
                    </button>
                  ) : <div />}
                </div>
              </div>

            </motion.article>
          </AnimatePresence>
        </main>

        {/* Scroll-Spy "On This Page" Outline Sidebar */}
        <aside className="hidden xl:flex w-56 shrink-0 flex-col sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pl-4 border-l-3 border-black scrollbar-none font-display">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-5 font-mono flex items-center gap-1.5">
            document_index.sys
          </div>
          <nav className="space-y-3">
            {allPages.map(p => {
              const isSpyActive = activeOutlineId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePageId(p.id)
                    setActiveOutlineId(p.id)
                  }}
                  className={`w-full block text-left text-[11px] font-extrabold transition-all duration-300 pl-3 border-l-3 ${isSpyActive ? 'text-[#ff8ba7] border-[#ff8ba7] font-black pl-4' : 'text-white/40 border-black/10 hover:text-white hover:border-white'}`}
                >
                  {p.title}
                </button>
              )
            })}
          </nav>
        </aside>

      </div>

      {/* developer footer */}
      <footer className="mt-auto py-8 border-t-4 border-black bg-[#13141f] shadow-[0_-4px_0px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-white/60 font-mono">
          <span>© 2026 Aeres IDE. Engineered for high-speed multi-agent workflows.</span>
          <div className="flex gap-4">
            <span className="hover:text-[#ff8ba7] cursor-pointer transition">API Specs</span>
            <span className="hover:text-[#ff8ba7] cursor-pointer transition">Status Radar</span>
            <span className="hover:text-[#ff8ba7] cursor-pointer transition">Security System</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
