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
    <div className="w-6 h-6 rounded-full border border-white/10 bg-[#1b1c2b] text-[#ff8ba7] flex items-center justify-center text-xs font-black shrink-0 font-mono shadow-[1.5px_1.5px_0px_#000000]">
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
    command: 'cat .aeres/settings.json',
    code: `{
  "aeres.ai.model": "groq-llama-3-70b-speculative",
  "aeres.ai.localOnly": true,
  "aeres.terminal.shell": "powershell.exe",
  "aeres.catalyst.batchSize": 5,
  "aeres.radar.circularCheck": true
}`
  },
  python: {
    filename: 'health_trigger.py',
    lang: 'PYTHON',
    command: 'python -m app.agents.health_agent',
    code: `from app.agents.health_agent import ProjectHealthAgent
import asyncio
 
async def main():
    agent = ProjectHealthAgent(workspace_path="./src")
    
    # Scan for exceptions and traceback loops
    findings = await agent.scan_and_heal()
    
    if findings.is_healthy:
        print("Project is healthy. Build clean.")
    else:
        print(f"Applied {len(findings.patches)} autonomous patches.")
 
if __name__ == "__main__":
    asyncio.run(main())`
  },
  javascript: {
    filename: 'catalyst.config.js',
    lang: 'JAVASCRIPT',
    command: 'npm run catalyst:modernize',
    code: `export default {
  target: './apps/web-frontend/src',
  catalyst: {
    engine: 'groq-ast-vector',
    batchRefactor: true,
    modernizeApis: ['legacy-react-hooks', 'moment->date-fns']
  },
  exclude: ['**/__tests__/**', '**/node_modules/**'],
  safetyThreshold: 0.95
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
        header: 'Aeres IDE: The Agentic Developer Workspace',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE is a fully-local, high-performance development environment built on Tauri (Rust) and React. It deeply integrates autonomous AI agents powered by Groq's LLM inference into every layer of the development workflow — from code editing and debugging to dependency scanning and architecture visualization.
            </p>

            <div className="my-8 flex gap-4 p-5 rounded-3xl bg-[#13141f] border border-white/10 shadow-[4px_4px_0px_#000000] relative overflow-hidden group">
              {Icons.alert}
              <div className="relative z-10 font-sans text-left">
                <span className="text-white font-black text-sm block mb-1">Local-First Architecture</span>
                <span className="text-white/60 text-xs font-bold leading-relaxed block text-left">
                  Your source code never leaves your machine. All AI inference calls go through your own API keys (Groq BYOK). All file operations, git commands, and terminal sessions run locally via Tauri's native Rust backend. No telemetry is sent externally.
                </span>
              </div>
            </div>

            <h3 className="text-lg font-black text-white mt-10 mb-4 font-display text-left">Three-Layer Architecture</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 my-6 text-left">
              <div className="p-5 rounded-3xl bg-[#13141f] border border-white/10 shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">Tauri Desktop Shell</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Rust-powered native layer handling PTY terminals, file system access, syntax diagnostics, and OS-level window management.</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13141f] border border-white/10 shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">React Frontend</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">Monaco Editor, xterm.js terminals, D3 visualizations, Zustand state management, and Framer Motion animations.</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13141f] border border-white/10 shadow-[3px_3px_0px_#000000]">
                <span className="font-extrabold text-white block mb-2 font-display">Python AI Backend</span>
                <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans">FastAPI server with 22 endpoint modules, AI agent loop, RAG engine (ChromaDB), LSP bridge, and Groq LLM gateway.</p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'quickstart',
        title: 'Quick Start',
        icon: Icons.file,
        header: 'Installation and Setup',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE requires three components: Node.js (v18+), Python 3.10+, and Rust with the Tauri CLI. Follow these steps to get the full IDE running locally.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">1. Clone the Repository</h3>
            <pre className="bg-[#09090e] border border-white/10 shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
              git clone https://github.com/LAN-SHLOK/Aeres-IDE.git<br />
              cd Aeres-IDE
            </pre>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">2. Start the AI Backend</h3>
            <p className="text-white/60 text-xs font-bold mb-4 leading-relaxed font-sans text-left">
              The backend is a Python FastAPI server that powers all AI features, LSP bridging, and code analysis:
            </p>
            <pre className="bg-[#09090e] border border-white/10 shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
              cd apps/python-backend<br />
              python -m venv venv<br />
              venv\Scripts\activate     # Windows<br />
              pip install -r requirements.txt<br />
              <br />
              # Add your API key<br />
              echo GROQ_API_KEY=your_key_here &gt; .env<br />
              <br />
              # Start the server<br />
              uvicorn app.server:app --reload --port 8008
            </pre>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">3. Start the Tauri Frontend</h3>
            <pre className="bg-[#09090e] border border-white/10 shadow-[3px_3px_0px_#000000] rounded-3xl p-4 font-mono text-xs text-white font-extrabold select-all mb-8 leading-relaxed text-left">
              cd apps/desktop-client<br />
              npm install<br />
              npm run dev
            </pre>

            <div className="my-8 flex gap-4 p-5 rounded-3xl bg-[#13141f] border border-white/10 shadow-[4px_4px_0px_#000000]">
              {Icons.alert}
              <div className="font-sans text-left">
                <span className="text-white font-black text-sm block mb-1">API Key Setup</span>
                <span className="text-white/60 text-xs font-bold leading-relaxed block text-left">
                  Get a free Groq API key at console.groq.com. You can also configure it later inside the IDE via Settings &gt; Chat &gt; Groq API Key, or through the Onboarding modal that appears on first launch.
                </span>
              </div>
            </div>
          </div>
        )
      }
    ]
  },
  {
    category: 'EDITOR',
    pages: [
      {
        id: 'monaco-editor',
        title: 'Code Editor',
        icon: Icons.file,
        header: 'Monaco Editor with Full IDE Capabilities',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The code editor is powered by Monaco (the same engine behind VS Code). It provides syntax highlighting for 50+ languages, multi-cursor editing, code folding, bracket matching, find & replace, and inline diff views.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Editor Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>HTML Auto-Close Tags:</strong> When you type a closing &gt; in HTML or JSX files, the editor automatically inserts the corresponding closing tag and positions your cursor between them.</li>
              <li><strong>Minimap:</strong> A code overview minimap on the right side of the editor. Toggleable in Settings.</li>
              <li><strong>Word Wrap:</strong> Toggle with Alt+Z or configure in Settings.</li>
              <li><strong>Code Folding:</strong> Collapse code blocks with Ctrl+Shift+[.</li>
              <li><strong>Multi-Cursor:</strong> Alt+Click to add cursors. Ctrl+D to select next match.</li>
              <li><strong>Breadcrumb Bar:</strong> Shows the file path hierarchy above the editor for quick navigation.</li>
              <li><strong>Tab Management:</strong> Drag tabs to reorder. Right-click for options. Ctrl+W to close. Ctrl+Shift+T to reopen.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        icon: Icons.file,
        header: 'Complete Keyboard Shortcut Reference',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE supports VS Code-compatible keyboard shortcuts. You can also customize them via File &gt; Preferences &gt; Keyboard Shortcuts (Ctrl+K Ctrl+S).
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">General</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">Ctrl+Shift+P</span><span className="text-white font-extrabold">Command Palette</span>
              <span className="text-white/60 font-bold">Ctrl+P</span><span className="text-white font-extrabold">Quick Open File</span>
              <span className="text-white/60 font-bold">Ctrl+,</span><span className="text-white font-extrabold">Open Settings</span>
              <span className="text-white/60 font-bold">Ctrl+`</span><span className="text-white font-extrabold">Toggle Terminal</span>
              <span className="text-white/60 font-bold">Ctrl+N</span><span className="text-white font-extrabold">New File</span>
              <span className="text-white/60 font-bold">Ctrl+O</span><span className="text-white font-extrabold">Open Folder</span>
              <span className="text-white/60 font-bold">Ctrl+S</span><span className="text-white font-extrabold">Save</span>
              <span className="text-white/60 font-bold">F11</span><span className="text-white font-extrabold">Toggle Full Screen</span>
            </div>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Navigation</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">F12</span><span className="text-white font-extrabold">Go to Definition</span>
              <span className="text-white/60 font-bold">Shift+F12</span><span className="text-white font-extrabold">Find References</span>
              <span className="text-white/60 font-bold">Ctrl+G</span><span className="text-white font-extrabold">Go to Line</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+O</span><span className="text-white font-extrabold">Go to Symbol</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+\</span><span className="text-white font-extrabold">Go to Bracket</span>
              <span className="text-white/60 font-bold">F8</span><span className="text-white font-extrabold">Next Problem</span>
              <span className="text-white/60 font-bold">Shift+F8</span><span className="text-white font-extrabold">Previous Problem</span>
            </div>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Sidebar & Panels</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">Ctrl+Shift+E</span><span className="text-white font-extrabold">File Explorer</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+F</span><span className="text-white font-extrabold">Search</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+G</span><span className="text-white font-extrabold">Source Control</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+D</span><span className="text-white font-extrabold">Debug Panel</span>
              <span className="text-white/60 font-bold">Ctrl+Shift+X</span><span className="text-white font-extrabold">Extensions</span>
              <span className="text-white/60 font-bold">Ctrl+Alt+C</span><span className="text-white font-extrabold">AI Chat Panel</span>
              <span className="text-white/60 font-bold">Ctrl+Alt+A</span><span className="text-white font-extrabold">AI Agent Panel</span>
            </div>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Debugging</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">F5</span><span className="text-white font-extrabold">Start Debugging</span>
              <span className="text-white/60 font-bold">Shift+F5</span><span className="text-white font-extrabold">Stop Debugging</span>
              <span className="text-white/60 font-bold">F10</span><span className="text-white font-extrabold">Step Over</span>
              <span className="text-white/60 font-bold">F11</span><span className="text-white font-extrabold">Step Into</span>
              <span className="text-white/60 font-bold">Shift+F11</span><span className="text-white font-extrabold">Step Out</span>
            </div>
          </div>
        )
      },
      {
        id: 'database-viewer',
        title: 'Database Viewer',
        icon: Icons.file,
        header: 'Browse SQLite Databases Inside the IDE',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              When you click on a .db, .sqlite, or .sqlite3 file in the file explorer, Aeres automatically opens the built-in Database Viewer instead of trying to display raw binary content. The viewer lets you browse tables, view data, and inspect schemas directly inside the IDE.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How It Works</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Auto-Detection:</strong> Files with .db, .sqlite, or .sqlite3 extensions are automatically routed to the Database Viewer.</li>
              <li><strong>Table Browser:</strong> Lists all tables in the database. Click a table to view its rows in a formatted data grid.</li>
              <li><strong>Backend API:</strong> The viewer communicates with the /api/db endpoint on the Python backend, which uses Python's sqlite3 module.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'AI FEATURES',
    pages: [
      {
        id: 'rag-chat',
        title: 'AI Chat & Agentic Loop',
        icon: Icons.file,
        header: 'Autonomous AI Agent with Full Codebase Access',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The AI Chat panel (Ctrl+Alt+C) is the primary interface for interacting with the Aeres AI agent. You can ask questions about your codebase, request refactors, or let the agent autonomously plan and execute multi-step code changes.
            </p>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Agent Tool-Use Loop</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              The AI agent operates in a tool-use loop powered by Groq (GPT OSS 120 B). It can invoke the following tools autonomously:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>read_file:</strong> Read any file in your workspace to understand context.</li>
              <li><strong>edit_file:</strong> Apply surgical line-range edits using unified diffs.</li>
              <li><strong>create_file:</strong> Create new files in your project.</li>
              <li><strong>run_command:</strong> Execute shell commands and observe output.</li>
              <li><strong>search_codebase:</strong> Search across all workspace files using ripgrep-style matching.</li>
              <li><strong>list_directory:</strong> Browse the file tree to discover project structure.</li>
            </ul>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">RAG Engine</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              The chat is augmented with a Retrieval-Augmented Generation engine backed by ChromaDB. When you ingest documentation or your codebase, the RAG engine creates vector embeddings (using the all-MiniLM-L6-v2 model) that are searched during every query to provide relevant context to the LLM.
            </p>
          </div>
        )
      },
      {
        id: 'health-scanner',
        title: 'Health Scanner',
        icon: Icons.file,
        header: 'AI-Powered Project Health Analysis',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Health Scanner (accessible from the bottom panel) analyzes your entire project for deprecated APIs, code smells, security issues, and outdated patterns. It uses an AI agent backed by a curated deprecation database to produce actionable findings.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Workflow</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Scan:</strong> Click "Run Health Scan" to analyze the open project. The backend scans all source files and checks them against the deprecation database.</li>
              <li><strong>Review:</strong> Findings are displayed as cards showing the issue, severity, affected file, and recommended fix.</li>
              <li><strong>Fix Automatically:</strong> Click the "Fix Automatically" button on any finding. The AI agent reads the affected file, generates a targeted code fix, and applies the diff directly.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'dependency-radar',
        title: 'Dependency Radar',
        icon: Icons.file,
        header: 'Interactive Dependency Visualization and CVE Scanning',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Dependency Radar panel scans your project's package manifest files (package.json, requirements.txt, etc.) and builds an interactive D3 force-directed graph of all dependencies.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Capabilities</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>D3 Force Graph:</strong> Visualizes dependencies as an interactive node network. Click nodes to see version info, maintainers, and health metrics.</li>
              <li><strong>Vulnerability Detection:</strong> Checks dependencies against known CVE databases and flags insecure versions.</li>
              <li><strong>Outdated Detection:</strong> Highlights packages with available updates and shows latest stable versions.</li>
              <li><strong>AI Notes:</strong> Right-click any dependency to generate AI-powered analysis of what it does and whether safer alternatives exist.</li>
            </ul>
          </div>
        )
      },      {
        id: 'catalyst-batch',
        title: 'Catalyst Batch Modernize',
        icon: Icons.file,
        header: 'Automated Large-Scale Refactoring via AST & Embeddings',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Catalyst Batch Modernize allows you to refactor thousands of lines of legacy API usages in one click. By combining precise Abstract Syntax Tree (AST) parsing with vector embeddings, the agent can understand the context of your codebase and confidently apply sweeping changes without breaking functionality.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How It Works</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>AST Parsing:</strong> Aeres builds a deep structural map of your files, identifying exact API calls, variable scopes, and dependencies.</li>
              <li><strong>Vector Embeddings:</strong> We utilize local vector search to find similar legacy patterns scattered across your project, ensuring no obsolete code is missed.</li>
              <li><strong>Batch Execution:</strong> The Groq LLM agent securely orchestrates the rewrites locally via the Python FastAPI sidecar, producing a massive unified diff for you to review and apply.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'temporal-lens',
        title: 'Temporal Lens',
        icon: Icons.file,
        header: 'Per-Function Runtime Performance Profiling',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Temporal Lens automatically profiles your code every time you run it through the IDE's Run button. It tracks execution time per function and builds a rolling 20-run history to help you identify performance regressions.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Supported Languages</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Python:</strong> Uses cProfile to capture function-level timing. A temporal runner script is auto-generated in .aeres/temporal_runner.py.</li>
              <li><strong>JavaScript/TypeScript:</strong> Uses Node.js --cpu-prof to generate CPU profiles. A temporal runner is auto-generated in .aeres/temporal_runner.js.</li>
            </ul>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How to Use</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Simply click the Run button (or press the Run shortcut) on any Python or JS/TS file. The profiling data is automatically saved to .aeres/temporal_lens.json and displayed as inline decorations in the editor — showing millisecond latency next to each function definition.
            </p>
          </div>
        )
      },
      {
        id: 'contract-snapshots',
        title: 'Contract Snapshots',
        icon: Icons.file,
        header: 'Runtime Behavior Observation and Test Generation',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Contract Snapshot system observes function inputs and outputs during runtime to build behavioral contracts. From these observations, it can automatically generate unit tests that enforce the observed behavior.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Workflow</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Record:</strong> During code execution, the contract observer records function call signatures, argument types, and return values.</li>
              <li><strong>View Observations:</strong> Open the Contract Snapshots panel to see all recorded observations per function.</li>
              <li><strong>Generate Tests:</strong> Click "Generate Snapshot Tests" to have the AI produce unit test code (e.g., test_fn.py or fn.test.ts) based on the observed runtime behavior.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'CODE INTELLIGENCE',
    pages: [
      {
        id: 'lsp-integration',
        title: 'LSP Integration',
        icon: Icons.file,
        header: 'Language Server Protocol for Multi-Language Support',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE connects to language servers via a WebSocket bridge hosted on the Python backend. When you open a file, the editor establishes a connection to the LSP endpoint and registers providers for autocomplete, hover documentation, and signature help.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Supported Languages</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>JavaScript/TypeScript:</strong> typescript-language-server</li>
              <li><strong>Python:</strong> jedi-language-server or pylsp</li>
              <li><strong>Rust:</strong> rust-analyzer</li>
              <li><strong>Go:</strong> gopls</li>
              <li><strong>C/C++:</strong> clangd</li>
            </ul>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Features Provided</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Autocomplete:</strong> Context-aware code completions as you type.</li>
              <li><strong>Hover Info:</strong> Hover over any symbol to see its type, documentation, and source.</li>
              <li><strong>Signature Help:</strong> Function parameter hints appear as you type arguments.</li>
              <li><strong>Go to Definition:</strong> F12 to jump to a symbol's definition.</li>
              <li><strong>Find References:</strong> Shift+F12 to find all usages of a symbol across the workspace.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'syntax-diagnostics',
        title: 'Syntax Diagnostics',
        icon: Icons.file,
        header: 'Real-Time Error Detection in the Editor',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres runs syntax checks on every file save. For Python files, the Rust backend runs py_compile and ruff to detect syntax errors and linting issues. Errors appear as red squiggly underlines directly in the editor, and warnings appear as yellow underlines.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How Diagnostics Work</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Python:</strong> The Tauri Rust backend invokes py_compile to catch SyntaxError, IndentationError, and TabError. Results are returned as Monaco markers with line numbers and severity levels.</li>
              <li><strong>JavaScript/TypeScript:</strong> Diagnostics come from the LSP language server in real-time.</li>
              <li><strong>Problems Panel:</strong> All diagnostics across open files are aggregated in the Problems panel (Ctrl+Shift+M).</li>
              <li><strong>Navigation:</strong> Press F8 to jump to the next error, Shift+F8 for the previous error.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'causal-blame',
        title: 'Causal Blame Maps',
        icon: Icons.file,
        header: 'Trace Git Blame Chains to Find Root Causes',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Causal Blame Map panel lets you select a function in the editor and trace its git blame chain. It uses the AI to analyze which commits introduced changes, why they were made, and how they relate to the current state of the code.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Usage</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Select a function</strong> in the editor, then open the Causal Blame panel from the bottom panel tabs.</li>
              <li><strong>The panel displays</strong> a directed graph showing commit chains, with AI-generated summaries of what each commit changed and its potential impact on the current bug or behavior.</li>
              <li><strong>Requires:</strong> The project must be a git repository with commit history.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'architecture-visualizer',
        title: 'Architecture Visualizer',
        icon: Icons.file,
        header: 'Full Project Architecture Blueprint',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Architecture Visualizer generates a full interactive blueprint of your project's structure. It scans all source files, detects import relationships, and renders an interactive D3 node-link diagram showing how modules connect.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Automatic Scanning:</strong> Detects project structure by parsing imports and module references.</li>
              <li><strong>Interactive Graph:</strong> Pan, zoom, and click nodes to see file details and connections.</li>
              <li><strong>Circular Detection:</strong> Highlights circular imports that could cause runtime issues.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'workspace-sunburst',
        title: 'Workspace Sunburst',
        icon: Icons.file,
        header: 'Visualize File Size and Complexity',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Workspace Sunburst provides a D3-powered circular visualization of your entire file system. It helps you instantly identify massive directories, dense files, and the overall complexity footprint of your project.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How to Read It</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Rings:</strong> The inner rings represent top-level directories, branching out to subdirectories and finally files on the outer edge.</li>
              <li><strong>Arc Size:</strong> The sweep angle of each arc is proportional to the file size (or Lines of Code). Larger files take up a larger slice of the pie.</li>
              <li><strong>Interaction:</strong> Hover over an arc to see the exact path and size. Click an arc to zoom in on that specific directory.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'GIT & VERSION CONTROL',
    pages: [
      {
        id: 'git-panel',
        title: 'Git Integration',
        icon: Icons.file,
        header: 'Full Git Workflow Inside the IDE',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE includes a complete Git panel accessible via Ctrl+Shift+G in the sidebar. All git operations are handled by the Python backend's /api/git endpoints which execute git commands locally.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Supported Operations</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Status & Diff:</strong> View changed files with color-coded indicators. Click a file to see the inline diff.</li>
              <li><strong>Stage & Unstage:</strong> Stage individual files or all changes with one click.</li>
              <li><strong>Commit:</strong> Write commit messages. Use the "AI Generate" button to auto-generate a commit message from the staged diff using Groq.</li>
              <li><strong>Branch Management:</strong> Create, switch, and delete branches from the dropdown.</li>
              <li><strong>Push, Pull, Fetch:</strong> Sync with remote repositories. Supports credential entry for private repos.</li>
              <li><strong>Stash & Pop:</strong> Save and restore work-in-progress changes.</li>
              <li><strong>Init:</strong> Initialize a new git repository in the current workspace.</li>
              <li><strong>Add Remote:</strong> Configure remote repository URLs for push/pull.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'DEBUGGING & RUNNING',
    pages: [
      {
        id: 'debugger',
        title: 'Integrated Debugger',
        icon: Icons.file,
        header: 'Debug Adapter Protocol (DAP) Based Debugging',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres includes a full graphical debugger powered by the Debug Adapter Protocol (DAP). It supports Node.js and Python debugging with breakpoints, step controls, variable inspection, call stack navigation, and a debug console.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How to Debug</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Set Breakpoints:</strong> Click in the gutter next to a line number to set a breakpoint (red dot).</li>
              <li><strong>Start Debugging:</strong> Press F5 or click Run &gt; Start Debugging. The debugger launches your file and pauses at breakpoints.</li>
              <li><strong>Step Controls:</strong> F10 (Step Over), F11 (Step Into), Shift+F11 (Step Out).</li>
              <li><strong>Variable Inspector:</strong> View local and global variables in the Debug sidebar panel.</li>
              <li><strong>Call Stack:</strong> Navigate through the function call stack to understand execution flow.</li>
              <li><strong>Debug Console:</strong> Evaluate expressions in the context of the paused execution.</li>
              <li><strong>Stop:</strong> Press Shift+F5 to terminate the debug session.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'project-runner',
        title: 'Project Runner',
        icon: Icons.file,
        header: 'Smart File and Project Execution',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Run button in the editor toolbar automatically detects the correct command to execute your file based on its language and project context. It supports 30+ languages and all major frameworks.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Supported Languages</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">.py</span><span className="text-white font-extrabold">python "file.py"</span>
              <span className="text-white/60 font-bold">.js / .ts</span><span className="text-white font-extrabold">node / npx tsx</span>
              <span className="text-white/60 font-bold">.html</span><span className="text-white font-extrabold">Live Server or Django runserver</span>
              <span className="text-white/60 font-bold">.java</span><span className="text-white font-extrabold">javac + java</span>
              <span className="text-white/60 font-bold">.rs</span><span className="text-white font-extrabold">cargo run</span>
              <span className="text-white/60 font-bold">.go</span><span className="text-white font-extrabold">go run</span>
              <span className="text-white/60 font-bold">.cpp / .c</span><span className="text-white font-extrabold">g++ + execute</span>
              <span className="text-white/60 font-bold">.jsx / .tsx</span><span className="text-white font-extrabold">Detects npm run dev</span>
            </div>

            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Smart Project Detection</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              When you hit Run on an HTML file inside a Django project (one with manage.py), the runner intelligently starts the Django dev server instead of Live Server. For React/Next.js projects, it detects package.json and runs the dev script.
            </p>
          </div>
        )
      },
      {
        id: 'live-server',
        title: 'Live Server',
        icon: Icons.file,
        header: 'One-Click HTML Preview Server',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              For standalone HTML files, Aeres provides a built-in Live Server that auto-installs via npx and serves your HTML file with hot-reload at a local port.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">How to Use</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>From Editor:</strong> Open any HTML file, then click the "Open with Live Server" button in the editor toolbar (or use Alt+L).</li>
              <li><strong>From File Tree:</strong> Right-click any .html file in the sidebar and select "Open with Live Server".</li>
              <li><strong>From Command Palette:</strong> Ctrl+Shift+P and type "Live Server".</li>
              <li><strong>Auto-Install:</strong> If live-server is not installed globally, it is automatically installed via npx on first use.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'api-sandbox',
        title: 'API Sandbox',
        icon: Icons.file,
        header: 'Integrated REST API Client',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The API Sandbox is a built-in Postman alternative that lets you test HTTP endpoints directly within Aeres. It elegantly handles cross-origin resource sharing (CORS) by proxying requests through the local Python FastAPI backend.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Full HTTP Support:</strong> Craft GET, POST, PUT, DELETE, and HEAD requests with custom JSON bodies and headers.</li>
              <li><strong>CORS Bypass:</strong> Requests are sent to `/api/proxy/`, allowing you to hit strict external APIs without browser security errors.</li>
              <li><strong>Performance Metrics:</strong> Accurately tracks round-trip latency in milliseconds.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'web-preview-sandbox',
        title: 'Web Preview Sandbox',
        icon: Icons.file,
        header: 'Live Side-by-Side Application Preview',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              The Web Preview Sandbox injects a live iframe directly into the IDE, allowing you to run and interact with your React, Vue, or vanilla HTML applications without constantly tabbing out to an external browser.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>Hot Module Replacement:</strong> Seamlessly reflects your code changes in real-time.</li>
              <li><strong>URL Navigation:</strong> Includes an address bar to navigate local routes (e.g., `http://localhost:5173/dashboard`).</li>
              <li><strong>Responsive Testing:</strong> Easily resize the panel to test mobile and tablet breakpoints.</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    category: 'CONFIGURATION',
    pages: [
      {
        id: 'api-keys',
        title: 'API Keys & BYOK',
        icon: Icons.file,
        header: 'Bring Your Own Key Configuration',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Aeres IDE uses a Bring-Your-Own-Key (BYOK) model. All API keys are stored locally on your machine in a platform-specific config directory (managed by platformdirs). Keys are never transmitted externally except to the LLM provider you configure.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Available Keys</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>GROQ_API_KEY:</strong> Required for all AI features (chat, agent, health scan, modernize, auto-commit). Get a free key at console.groq.com.</li>
              <li><strong>GOOGLE_API_KEY:</strong> Optional. Used for the diagram engine if configured.</li>
              <li><strong>GITHUB_TOKEN:</strong> Optional. Enables private repository access for git operations.</li>
            </ul>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Where Keys Are Stored</h3>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6 text-left">
              Keys are saved to a config.env file inside your platform's user config directory (e.g., C:\Users\you\AppData\Local\Aeres\AeresIDE\config.env on Windows). You can also set them via the .env file in the python-backend folder, or through the Onboarding modal / Settings panel in the IDE.
            </p>
          </div>
        )
      },
      {
        id: 'security-model',
        title: 'Security Model',
        icon: Icons.file,
        header: 'How Aeres Protects Your Code and Credentials',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Security is built into every layer of Aeres IDE. Here is a summary of all security measures in place:
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Security Architecture</h3>
            <ul className="list-disc pl-6 space-y-2 text-white/60 text-xs font-bold leading-relaxed font-sans mb-8 text-left">
              <li><strong>CORS Policy:</strong> The backend uses a strict allow_origin_regex that only permits requests from localhost, 127.0.0.1, and tauri://localhost. External websites cannot access your local backend.</li>
              <li><strong>JWT Authentication:</strong> Production deployments use Clerk JWT (RS256) with JWKS auto-rotation. In local development, authentication gracefully degrades to a stub user.</li>
              <li><strong>API Key Isolation:</strong> Keys are stored in user-specific directories via platformdirs, never in the project repository. The /api/keys endpoint masks key values in responses.</li>
              <li><strong>File Access:</strong> All file operations go through Tauri's IPC bridge with OS-native permission controls.</li>
              <li><strong>Terminal Safety:</strong> Terminals use native PTY via the portable-pty Rust crate. No shell injection is possible through the UI.</li>
              <li><strong>WebSocket Scope:</strong> LSP and DAP WebSocket connections are scoped to 127.0.0.1 only.</li>
            </ul>
          </div>
        )
      },
      {
        id: 'settings-reference',
        title: 'Settings Reference',
        icon: Icons.file,
        header: 'All Available IDE Settings',
        content: (
          <div>
            <p className="text-white/70 leading-relaxed text-sm font-semibold mb-6">
              Open Settings with Ctrl+, or via File &gt; Preferences &gt; Settings. Settings are organized into categories in the sidebar. You can also open the raw JSON by clicking the JSON icon in the Settings header.
            </p>
            <h3 className="text-lg font-black text-white mt-8 mb-4 font-display text-left">Available Settings</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-8 text-left">
              <span className="text-white/60 font-bold">Font Size</span><span className="text-white font-extrabold">Editor font size in pixels (default: 14)</span>
              <span className="text-white/60 font-bold">Font Family</span><span className="text-white font-extrabold">JetBrains Mono, Fira Code, Source Code Pro</span>
              <span className="text-white/60 font-bold">Tab Size</span><span className="text-white font-extrabold">2, 4, or 8 spaces</span>
              <span className="text-white/60 font-bold">Word Wrap</span><span className="text-white font-extrabold">off, on, wordWrapColumn, bounded</span>
              <span className="text-white/60 font-bold">Minimap</span><span className="text-white font-extrabold">Show/hide the code minimap</span>
              <span className="text-white/60 font-bold">Auto Save</span><span className="text-white font-extrabold">off, afterDelay, onFocusChange</span>
              <span className="text-white/60 font-bold">Format On Save</span><span className="text-white font-extrabold">Auto-format on save</span>
              <span className="text-white/60 font-bold">Color Theme</span><span className="text-white font-extrabold">9 themes: Cozy Y2K Dark, Nordic Frost, etc.</span>
              <span className="text-white/60 font-bold">Groq API Key</span><span className="text-white font-extrabold">Configure under Chat category</span>
              <span className="text-white/60 font-bold">Workspace Trust</span><span className="text-white font-extrabold">Prompt before opening untrusted folders</span>
            </div>
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
        <aside className="w-72 shrink-0 hidden md:block sticky top-32 h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain pr-4 bg-[#13141f] border-[3px] border-black shadow-[4px_4px_0px_#000000] rounded-[2rem] p-6">
          
          {/* Docs Live Search Filter */}
          <div className="mb-6 font-sans">
            <div className="flex items-center gap-2.5 bg-[#09090e] border-[3px] border-black shadow-[4px_4px_0px_#000000] rounded-xl px-4 py-2.5 transition-all">
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
              <div key={cat.category} className="pb-6">
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
                          className={`w-full flex items-center gap-2.5 px-5 py-3.5 text-xs text-left rounded-full transition-all duration-300 ${isActive ? 'bg-[#c084fc] text-black font-black border-[3px] border-black shadow-[4px_4px_0px_#000000]' : 'bg-transparent text-white/75 hover:text-white border-[3px] border-transparent hover:border-[#ff8ba7] hover:shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 hover:bg-[#1b1c2b]'}`}
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
              className="max-w-[720px] w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl bg-[#13141f] overflow-hidden"
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
                <span className="text-[10px] font-black text-black bg-[#fae3d9] border border-white/10 shadow-[1.5px_1.5px_0px_#000000] px-3 py-1 rounded-full tracking-widest uppercase font-mono inline-block mb-5">
                  {DOCUMENTATION_SECTIONS.find(cat => cat.pages.some(p => p.id === activePage.id))?.category || 'DOCS'}
                </span>

                {/* Page Main Header */}
                <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white mb-8 leading-tight">
                  {activePage.header}
                </h1>

                {/* Dynamic detailed content block */}
                <div className="font-sans leading-[1.8] text-white/70 text-sm font-semibold">
                  {filteredCategories.length === 0 && searchQuery ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1b1c2b] border border-white/10 text-[#ff8ba7] flex items-center justify-center mb-6 shadow-[4px_4px_0px_#000000]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <h2 className="text-white font-display text-2xl font-black mb-2">No documentation found</h2>
                      <p className="text-white/60 font-sans text-sm">We couldn't find any articles matching "{searchQuery}".</p>
                      <button onClick={() => setSearchQuery('')} className="mt-6 px-6 py-2.5 bg-[#c084fc] text-black font-black font-display text-xs rounded-full border border-white/10 shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#000000] transition-all">Clear Search</button>
                    </div>
                  ) : (
                    activePage.content
                  )}
                </div>

                {/* Interactive Code Sandbox (Platform/Language Tabs) */}
                <div className="mt-12">
                  <span className="text-[10px] font-black text-white/40 tracking-wider block mb-4 uppercase font-mono">
                    interactive_playground.log
                  </span>

                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl bg-[#13141f]">
                    {/* Title selector bar */}
                    <div className="bg-[#1b1c2b] px-5 py-3 flex items-center justify-between gap-4 font-display">
                      <div className="flex gap-2">
                        {Object.keys(PLAYGROUND_SNIPPETS).map((lang) => {
                          const isSelected = sandboxLang === lang
                          return (
                            <button
                              key={lang}
                              onClick={() => setSandboxLang(lang)}
                              className={`relative px-4 py-1.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider transition-all duration-300 ${isSelected ? 'text-black bg-[#ff8ba7]' : 'text-white/60 bg-transparent hover:text-white'}`}
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
                    <div className="bg-[#13141f] px-5 py-4 flex items-center justify-between gap-4">
                      <span className="text-[10px] font-mono font-extrabold text-white/55">
                        $ {PLAYGROUND_SNIPPETS[sandboxLang].command}
                      </span>
                      <button
                        onClick={() => handleCopy(PLAYGROUND_SNIPPETS[sandboxLang].code, sandboxLang)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-display font-black uppercase tracking-wider transition-all border-[3px] border-black shrink-0 ${copiedId === sandboxLang ? 'bg-emerald-300 text-black shadow-[2px_2px_0px_#000000] translate-y-0.5' : 'bg-emerald-300 text-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000000]'}`}
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
                <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center gap-4">
                  {currentPageIndex > 0 ? (
                    <button
                      onClick={() => {
                        setActivePageId(allPages[currentPageIndex - 1].id)
                        setActiveOutlineId(allPages[currentPageIndex - 1].id)
                      }}
                      className="flex flex-col items-start gap-1.5 p-4 rounded-3xl border border-white/10 bg-[#1b1c2b] shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition duration-200 text-left min-w-0"
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
                      className="flex flex-col items-end gap-1.5 p-4 rounded-3xl border border-white/10 bg-[#1b1c2b] shadow-[2px_2px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] transition duration-200 text-right min-w-0 ml-auto"
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
        <aside className="hidden xl:flex w-56 shrink-0 flex-col sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pl-4 border-l border-white/10 scrollbar-none font-display">
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
          <span>Â© 2026 Aeres IDE. Engineered for high-speed multi-agent workflows.</span>
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

