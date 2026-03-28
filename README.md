# AETHER IDE — WINDSURF TASK PACK (All 12 Tasks)
# Instructions only. No pre-written code.
# Windsurf reads the spec and writes all code itself.
# Feed ONE task at a time. Run the acceptance test before the next task.

---

════════════════════════════════════════════════════════
TASK 01 — Project Scaffold & Environment Setup
════════════════════════════════════════════════════════

WHAT TO BUILD:
Create the complete AETHER-IDE monorepo folder structure
with all config files, package.json files, and environment
templates. Do NOT write any application logic yet.

MONOREPO LAYOUT:
AETHER-IDE/
  apps/
    web-frontend/      ← React 18 + Vite + Tailwind + Clerk
    desktop-client/    ← Electron 28 + React 18 + Vite
    python-backend/    ← FastAPI + Python 3.11
  .github/workflows/
  package.json         ← root npm workspace

ROOT package.json:
- npm workspaces pointing to web-frontend and desktop-client
- scripts: dev:web, dev:desktop, dev:backend, dev:all (concurrently), setup
- devDependency: concurrently

WEB FRONTEND package.json dependencies:
- react, react-dom, react-router-dom v6
- @clerk/clerk-react
- axios
- vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer

WEB FRONTEND config files to create:
- vite.config.js (React plugin, port 5173)
- tailwind.config.js (content: src/**/*.{js,jsx}, extend colors
  for aether brand: bg #0a0a0f, surface #12121a, border #1e1e2e,
  violet #7C3AED, blue #4F8EF7)
- postcss.config.js
- index.html (import Syne, DM Sans, JetBrains Mono from Google Fonts)
- .env.local template with these vars:
    VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
    VITE_API_URL=http://127.0.0.1:8008
    VITE_DOWNLOAD_BASE_URL=https://github.com/YOUR_USERNAME/aether-ide/releases/latest/download

WEB FRONTEND src/ empty files to create:
  assets/global.css (Tailwind directives + CSS variables)
  main.jsx, App.jsx, App.css, index.css
  components/Navbar.jsx
  components/HeroSection.jsx
  components/Footer.jsx
  components/SmartDownload.jsx
  hooks/useOSDetection.js
  pages/LandingPage.jsx
  pages/AuthPortal.jsx
  pages/Dashboard.jsx
  utils/apiClient.js
  utils/authRedirect.js

DESKTOP CLIENT package.json dependencies:
- electron 28, electron-builder, electron-updater, electron-vite
- react, react-dom
- @monaco-editor/react
- @xterm/xterm, @xterm/addon-fit, @xterm/addon-web-links, @xterm/addon-search
- node-pty
- @dnd-kit/core, @dnd-kit/sortable
- zustand
- react-markdown
- vscode-jsonrpc, vscode-languageserver-protocol
- tailwindcss, postcss, autoprefixer, vite, @vitejs/plugin-react
- concurrently, wait-on

DESKTOP CLIENT electron-builder config inside package.json:
- appId: com.antigravity.aether-ide
- productName: Aether IDE
- extraResources: copy python-backend/dist/backend binary
- protocols: register aether:// scheme
- npmRebuild: true
- asarUnpack: node_modules/node-pty
- targets: nsis (Windows), dmg (macOS x64+arm64), AppImage (Linux)

DESKTOP CLIENT config files:
- vite.config.js (React plugin, base './', outDir dist, port 5174)
- tailwind.config.js (same brand colors as web)
- index.html
- .env template (CLERK_JWT_ISSUER, GROQ_API_KEY)

DESKTOP CLIENT empty files to create:
  electron/main.cjs
  electron/preload.cjs
  electron/sidecar.cjs
  electron/ipcHandlers/authHandler.cjs
  electron/ipcHandlers/ragBridge.cjs
  electron/ipcHandlers/staticAnalyzer.cjs
  electron/ipcHandlers/terminalHandler.cjs
  electron/ipcHandlers/lspHandler.cjs
  electron/ipcHandlers/debugHandler.cjs
  electron/ipcHandlers/gitHandler.cjs
  electron/ipcHandlers/formatterHandler.cjs
  electron/ipcHandlers/temporalHandler.cjs
  electron/ipcHandlers/sessionHandler.cjs
  src/main.jsx, src/App.jsx, src/index.css
  src/store.js, src/keybindings.js
  src/AuthModal.jsx, src/UpdateBanner.jsx, src/ErrorBoundary.jsx
  src/components/Editor/CodeCanvas.jsx
  src/components/Editor/EditorTabs.jsx
  src/components/Editor/BreadcrumbBar.jsx
  src/components/Editor/ComplexityTag.jsx
  src/components/Editor/InlineDiff.jsx
  src/components/Editor/EditorSettings.jsx
  src/components/Editor/TemporalLens.jsx
  src/components/Terminal/TerminalPanel.jsx
  src/components/Terminal/TerminalTabs.jsx
  src/components/Terminal/TerminalToolbar.jsx
  src/components/Debugger/DebugPanel.jsx
  src/components/Debugger/BreakpointGutter.jsx
  src/components/Debugger/VariableInspector.jsx
  src/components/Debugger/CallStack.jsx
  src/components/Debugger/DebugConsole.jsx
  src/components/Git/GitPanel.jsx
  src/components/Git/StagingArea.jsx
  src/components/Git/CommitPanel.jsx
  src/components/Git/BranchManager.jsx
  src/components/Git/CommitHistory.jsx
  src/components/Git/BlameViewer.jsx
  src/components/Git/MergeConflict.jsx
  src/components/Panels/RagChat.jsx
  src/components/Panels/ArchVisualizer.jsx
  src/components/Panels/MultiverseViewer.jsx
  src/components/Panels/ProblemsPanel.jsx
  src/components/Panels/OutputPanel.jsx
  src/components/Panels/CausalBlameMap.jsx
  src/components/Panels/ContractSnapshot.jsx
  src/components/Panels/DependencyRadar.jsx
  src/components/Panels/MutationPanel.jsx
  src/components/Sidebar/FileTree.jsx
  src/components/Sidebar/SearchPanel.jsx
  src/components/Sidebar/GitStatusSidebar.jsx
  src/components/Sidebar/ExtensionsPanel.jsx
  src/components/Overlays/CommandPalette.jsx
  src/components/Overlays/QuickOpen.jsx
  src/components/Overlays/GlobalSearch.jsx
  src/components/Overlays/KeybindingModal.jsx
  src/components/Overlays/FocusSessionManager.jsx
  src/components/StatusBar.jsx
  src/hooks/useAiStream.js
  src/hooks/useElectron.js
  src/hooks/useBackendUrl.js
  src/hooks/useLSP.js
  src/hooks/useDebugger.js
  src/hooks/useGit.js
  src/hooks/useKeybindings.js

PYTHON BACKEND files to create:
- requirements.txt with: fastapi, uvicorn[standard], pydantic,
  pydantic-settings, python-jose[cryptography], httpx, beautifulsoup4,
  chromadb, sentence-transformers, groq, radon, python-multipart,
  platformdirs, aiofiles, astor, debugpy, pytest, pyinstaller
- .env template (GROQ_API_KEY, CLERK_JWT_ISSUER, CHROMA_DB_PATH,
  EMBEDDING_MODEL, GROQ_MODEL)
- .gitignore
- main.py (empty)
- build_sidecar.py (empty)
- app/__init__.py
- app/server.py (empty)
- app/agents/__init__.py + anomaly_detector.py + orchestrator.py
  + causal_tracer.py + contract_observer.py + dep_scanner.py
  + mutation_engine.py + deprecation_db.json (empty object for now)
- app/api/__init__.py
- app/api/endpoints/__init__.py + analyze.py + rag.py + git.py
  + git_extra.py + perf.py + contracts.py + deps.py + mutations.py + ai.py
- app/core/__init__.py + config.py + database.py + models.py + security.py
- app/rag_engine/__init__.py + embedder.py + groq_gateway.py + vector_db.py
- app/scrapers/__init__.py + doc_crawler.py + text_processor.py
- data/chroma_db/.gitkeep
- scripts/__init__.py + init_db.py
- tests/__init__.py + conftest.py + test_code_ops.py + test_main.py + test_rag.py

CI/CD files:
- .github/workflows/build-desktop.yml (matrix: ubuntu/windows/macos,
  builds PyInstaller sidecar, then electron-builder, uploads to GitHub Releases)
- .github/workflows/deploy-web.yml (Vercel deploy on push to main)

ACCEPTANCE TEST:
- npm install runs without errors from monorepo root
- cd apps/web-frontend && npm run dev starts on port 5173 without errors
- cd apps/python-backend && python -m venv venv && pip install -r requirements.txt
  completes without errors
- All folders and placeholder files exist

---

════════════════════════════════════════════════════════
TASK 02 — Python Backend Core
════════════════════════════════════════════════════════

WHAT TO BUILD:
Implement the FastAPI foundation. No AI features yet.
Just config, models, security, database connections,
and the app factory that wires everything together.

FILES TO IMPLEMENT:

app/core/config.py:
  Use pydantic-settings BaseSettings. Fields:
  GROQ_API_KEY, CLERK_JWT_ISSUER, CHROMA_DB_PATH (default ./data/chroma_db),
  EMBEDDING_MODEL (default all-MiniLM-L6-v2),
  GROQ_MODEL (default llama-3.1-70b-versatile),
  CHUNK_SIZE (default 500), CHUNK_OVERLAP (default 50).
  Read from .env file.

app/core/models.py:
  Define all Pydantic models the endpoints will need:
  - DeprecationFlag: line_number, function_name, replacement,
    docs_query, code_snippet, severity, since_version
  - ModernizeRequest: content (str, max 500k), path (str)
  - ProjectScanRequest: file_paths (List[str], max 500)
  - RagQueryRequest: question, context
  - CompletionRequest: prefix, suffix, language, file_path
  - ExplainRequest: selection, language
  - GenerateRequest: comment, context, language
  - TimingIngestRequest: file_path, timings (List[dict])
  - ObservationRequest: file_path, function_name, inputs, output, error
  - GenerateTestsRequest: file_path, function_name, language
  - DepScanRequest: root_path
  - MutationRunRequest: file_path, source, test_command, repo_path, max_mutations
  - CausalChainRequest: repo_path, file_path, function_name, error_message
  - Language enum: javascript, typescript, python, unknown
  - Severity enum: high, medium, low

app/core/security.py:
  Implement Clerk JWT validation.
  - Fetch JWKS from {CLERK_JWT_ISSUER}/.well-known/jwks.json
  - Cache the result for 1 hour
  - Decode and verify JWT using python-jose
  - If CLERK_JWT_ISSUER is not set, allow all requests (dev mode)
  - Raise HTTPException 401 on invalid/expired JWT
  - Export get_current_user as a FastAPI Depends dependency

app/rag_engine/embedder.py:
  - Load sentence-transformers all-MiniLM-L6-v2 as a singleton
  - generate_embeddings(texts) runs on CPU, returns list of vectors
  - load_embedding_model() called at startup to pre-warm

app/rag_engine/vector_db.py:
  - init_local_chroma() creates PersistentClient at CHROMA_DB_PATH
  - get_or_create collection named "migration_docs"
  - store_migration_context(chunks, source_url, function_name)
    embeds and upserts with metadata
  - query_relevant_fix(function_name, n=5) returns top matches
    with document + source_url

app/rag_engine/groq_gateway.py:
  - stream_modernized_code(prompt) async generator yields
    Groq stream chunks using AsyncGroq client
  - Temperature 0.1 for deterministic code output
  - groq_complete(system, user, max_tokens, temperature, stop)
    for non-streaming calls
  - assemble_strict_prompt(ast_block, scraped_docs, function_name)
    builds a prompt that forbids hallucination and requires
    output to be raw code only based on the scraped docs
  - enforce_syntax_only(raw) strips prose, markdown fences,
    "Here is", "Sure!" etc from LLM output

app/server.py:
  - create_app() factory that:
    - Creates FastAPI instance
    - Adds CORS middleware allowing localhost:5173, localhost:5174, aether://
    - Registers startup event that calls init_local_chroma and
      load_embedding_model
    - Includes all routers from app/api/endpoints/
    - Adds GET /api/health returning {"status":"ok","version":"1.0.0"}
  - app = create_app() at module level

main.py:
  - Detect if frozen by PyInstaller (sys.frozen)
  - If frozen: use platformdirs.user_data_dir("AetherIDE","Antigravity")
    for CHROMA_DB_PATH and model cache
  - Read BACKEND_PORT from env (default 8008)
  - Run uvicorn on 127.0.0.1:PORT, import app from app.server

ACCEPTANCE TEST:
- python main.py starts without errors
- GET http://127.0.0.1:8008/api/health returns {"status":"ok"}
- GET http://127.0.0.1:8008/api/docs shows Swagger UI
- No import errors in any module

---

════════════════════════════════════════════════════════
TASK 03 — Web Frontend: Auth + Routing
════════════════════════════════════════════════════════

WHAT TO BUILD:
The complete authentication and routing layer for the
web frontend. This task contains the most critical
connectivity piece: authRedirect.js must generate
an aether:// deep link that Electron will catch.

BRAND CONTEXT:
- Background: #0a0a0f  Surface: #12121a  Border: #1e1e2e
- Primary: #7C3AED (violet)  Accent: #4F8EF7 (blue)
- Fonts: Syne (headings), DM Sans (body), JetBrains Mono (code)

FILES TO IMPLEMENT:

main.jsx:
  Wrap the app in ClerkProvider using VITE_CLERK_PUBLISHABLE_KEY.
  If the key is missing, log a warning but don't crash.
  Wrap in BrowserRouter. Mount App into #root.

App.jsx:
  Define routes:
  - / → LandingPage
  - /auth → AuthPortal
  - /dashboard → Dashboard (protected, redirect to /auth if not signed in)
  - * → redirect to /
  ProtectedRoute component checks useAuth().isSignedIn.
  Show a dark loading screen while Clerk initialises.

utils/authRedirect.js:
  redirectToAuth(redirectPath): store intended destination
    in sessionStorage key 'aether_post_auth_redirect',
    then navigate to /auth
  getPostAuthRedirect(): read from sessionStorage, default '/dashboard'
  clearPostAuthRedirect(): remove the sessionStorage key
  redirectToIDE(token, email): construct
    aether://auth?token={token}&email={email}
    and set window.location.href to it.
    THIS IS THE BRIDGE BETWEEN WEB AND ELECTRON.

utils/apiClient.js:
  Axios instance with baseURL from VITE_API_URL env var.
  Module-level _currentToken variable.
  setAuthToken(token) updates it.
  Request interceptor attaches Authorization: Bearer {token}.
  Response interceptor logs 401 warnings.

hooks/useOSDetection.js:
  Return 'mac' | 'windows' | 'linux' | 'unknown'.
  Check navigator.userAgentData.platform first (modern),
  fall back to navigator.platform and navigator.userAgent.

pages/AuthPortal.jsx:
  Full page dark background matching brand.
  Show Aether IDE logo at top.
  Render Clerk <SignIn> with dark appearance variables
  matching the brand colors.
  After sign-in, read search params:
  - If source=ide: call getToken(), get user email,
    then call redirectToIDE(token, email)
  - If redirect=download: navigate to /?download=true
  - Otherwise: navigate to getPostAuthRedirect()

pages/Dashboard.jsx:
  Protected page. Shows welcome message, user email,
  account status (Active), and SmartDownload component.
  Sign out button using Clerk SignOutButton.
  On mount, get Clerk token and call setAuthToken().

ACCEPTANCE TEST:
- npm run dev
- / loads without errors
- /auth shows Clerk SignIn with dark theme
- /dashboard redirects to /auth when not signed in
- Sign in with Clerk → lands on /dashboard
- /dashboard shows email and download section
- No console errors about missing env vars (warnings OK)

---

════════════════════════════════════════════════════════
TASK 04 — Web Frontend: Landing Page + SmartDownload
════════════════════════════════════════════════════════

WHAT TO BUILD:
The public-facing landing page and the OS-smart
download component. This is what users see before
they sign in.

FILES TO IMPLEMENT:

hooks/useOSDetection.js: (already done in Task 03)

components/SmartDownload.jsx:
  Use useOSDetection to detect OS.
  Use useUser() from Clerk to check if signed in.
  Download URLs (construct from VITE_DOWNLOAD_BASE_URL env var):
    mac:     {BASE}/Aether-IDE-mac-universal.dmg
    windows: {BASE}/Aether-IDE-Setup-win-x64.exe
    linux:   {BASE}/Aether-IDE-linux-x86_64.AppImage
  Button label: "Download for macOS" / "Download for Windows" etc.
  If NOT signed in: clicking calls redirectToAuth with
    redirect=download stored in sessionStorage, then navigates to /auth.
  If signed in: trigger browser download, show success message
    "After installing, click Login via Browser inside Aether IDE."
  If OS unknown: show three platform links below the button.
  Accepts a 'large' prop for bigger button variant.

components/Navbar.jsx:
  Fixed at top, transparent background initially.
  On scroll past 20px: semi-transparent dark background with blur.
  Left: Aether IDE logo (Syne font, violet accent on IDE).
  Center: Features, Docs, Pricing links.
  Right: if signed in show Dashboard link + Sign Out.
         if not signed in show Login + Download CTA button.

components/Footer.jsx:
  Simple footer with copyright and tagline.

pages/LandingPage.jsx:
  Full dark page. Sections:

  HERO SECTION:
  - Small badge: "v1.0 — Now available"
  - H1: "Code at the speed of thought." with gradient text
    from white to violet
  - Subtitle: "The first IDE that reads live docs, modernizes
    your legacy code, measures what's actually slow, and tells
    you where your tests are lying."
  - SmartDownload component (large variant)
  - Animated terminal mockup below the CTA showing the
    modernization flow. Use a ref and setTimeout to make
    lines appear one by one with delays:
    "$ aether scan --project ./legacy-app"
    "Scanning 847 files..."
    "⚠  componentWillMount found in UserDashboard.jsx:42"
    "⚠  ReactDOM.render found in index.js:8"
    "Scraping react.dev migration guide..."
    "✓  Fix ready — split diff view opened"

  FEATURES SECTION:
  Show 7 cards for the unique features:
  1. Antigravity AI Engine
  2. Temporal Code Lens
  3. Causal Blame Map
  4. Contract Snapshot Tests
  5. Dependency Drift Radar
  6. Focus Sessions
  7. Silent Mutation Tester
  Cards: dark surface, border, hover border changes to violet.
  Each has an icon, title, and 1-2 sentence description.

  CTA SECTION:
  "Ready to ship faster?" heading, SmartDownload again.

  If ?download=true is in the URL query params, the page
  should auto-trigger the SmartDownload flow.

ACCEPTANCE TEST:
- Landing page loads at localhost:5173
- Dark background, Syne font headings visible
- Terminal animation plays with timed line reveals
- All 7 feature cards render
- Download button shows correct OS label
- Click download without login → redirects to /auth
- Sign in → redirects to /dashboard
- /dashboard shows working download button

---

════════════════════════════════════════════════════════
TASK 05 — Electron Shell: Main + Preload + Sidecar + Auth
════════════════════════════════════════════════════════

WHAT TO BUILD:
The Electron main process, preload security bridge,
Python sidecar manager, and auth handler.
This is the most critical task — it wires all three
apps together through the aether:// protocol.

FILES TO IMPLEMENT:

electron/sidecar.cjs:
  findFreePort(): bind a server to port 0 and read the
    assigned port, then close. Returns a Promise<number>.
  getSidecarPath(): if app.isPackaged, return path to
    frozen backend binary in process.resourcesPath.
    If dev mode, return path to venv Python executable.
  startSidecar(): find free port, set BACKEND_PORT env var,
    spawn the process, pipe stdout/stderr to a log file
    in app.getPath('userData'), poll GET /api/health every
    500ms up to 30 attempts before throwing an error.
    Returns the port number.
  stopSidecar(): kill the process with SIGTERM.
  getBackendPort(): returns current port.

electron/ipcHandlers/authHandler.cjs:
  Store JWT and email in global.__aetherJWT and
  global.__aetherEmail (main process memory only,
  never sent to renderer directly).
  register(ipcMain, app, getMainWindow):
    auth:getStatus → return {authenticated, email}
      check if JWT exists and is not expired
    auth:getToken → return global.__aetherJWT
    auth:logout → clear globals, cancel refresh timer
    auth:openBrowser(source) → shell.openExternal to
      web portal /auth?source={source}
      URL base from WEB_PORTAL_URL env or localhost:5173
  handleDeepLink(url, mainWindow):
    Parse aether:// URL. Extract token and email params.
    Store in globals. Schedule JWT refresh timer
    (fire 60s before expiry to signal renderer).
    Send auth:success IPC event to mainWindow.
    Focus mainWindow.

electron/main.cjs:
  Request single instance lock, quit if second instance
    (except pass deep link URL to first instance).
  Register aether:// protocol with setAsDefaultProtocolClient.
  createWindow(): BrowserWindow 1440x900, min 1024x600,
    backgroundColor #0a0a0f, hiddenInset titleBar on mac,
    show:false, contextIsolation:true, nodeIntegration:false,
    preload: path to preload.cjs.
  On ready: register all IPC handlers, start sidecar,
    load URL (localhost:5174 in dev, dist/index.html in prod),
    on ready-to-show: show window, send sidecar:ready or
    sidecar:error, send auth:startup with current status,
    check for updates if packaged.
  open-url event (macOS deep link): call handleDeepLink.
  second-instance event (Windows/Linux deep link):
    find aether:// arg, call handleDeepLink, focus window.
  window-all-closed: stop sidecar, quit (except macOS).
  before-quit: stop sidecar.
  autoUpdater events: forward update:available and
    update:downloaded to renderer. Handle update:install.

electron/preload.cjs:
  Use contextBridge.exposeInMainWorld('electron', {...}).
  Never expose ipcRenderer directly.
  Expose these namespaces, each mapping to ipcRenderer
  invoke/on/send calls:

  auth: getStatus, getToken, logout, openBrowser,
    onSuccess(cb), onStartup(cb), onRefreshNeeded(cb)

  sidecar: onReady(cb), onError(cb)

  fs: openFolder, readFile(path), writeFile(path, content),
    getTree(rootPath), searchInProject({rootPath, query, caseSensitive})

  analyze: modernize(content, path), scanProject(filePaths),
    onStream(cb), offStream()

  rag: query(question, context)

  terminal: create(opts), write(id, data), resize(id, rows, cols),
    kill(id), setcwd(id, cwd), onData(id, cb), onExit(id, cb),
    offAll(id)

  lsp: start(language, rootPath), request(lang, method, params),
    notify(lang, method, params), onDiagnostics(cb), stopAll()

  debug: start(opts), stop(sessionId), setBreakpoints, continue,
    stepOver, stepIn, stepOut, stackTrace, variables, evaluate,
    onStopped(cb), onContinued(cb), onOutput(cb), onTerminated(cb)

  git: status, diff, stage, unstage, discard, commit, push,
    pull, fetch, branches, createBranch, switchBranch,
    deleteBranch, log, blame, stash, stashPop

  format: document(content, filePath, language), lint(filePath, rootPath)

  temporal: getFile(fp), ingest(fp, timings), clear(fp), onUpdate(fp, cb)

  sessions: save(name, state), list(), load(id), delete(id), rename(id, name)

  updater: onAvailable(cb), onDownloaded(cb), install(),
    removeListeners()

  platform: process.platform string
  isMac: boolean

electron/ipcHandlers/ragBridge.cjs:
  register(ipcMain, app, getMainWindow, getBackendPort):
  fs:openFolder → dialog.showOpenDialog({properties:['openDirectory']})
  fs:readFile → fs.promises.readFile(path, 'utf-8')
  fs:writeFile → fs.promises.writeFile(path, content, 'utf-8')
  fs:getTree → recursive directory walk, max depth 6,
    skip: node_modules, .git, venv, __pycache__, dist, release
    return tree of {name, path, type:'file'|'dir', ext, children}
    sorted: dirs first, then files, alphabetically
  rag:query → POST to backend /api/rag/query with JWT
  search:inProject → run grep (Linux/Mac) or findstr (Windows),
    return {results:[{file, line, text}], count}

ACCEPTANCE TEST:
- cd apps/desktop-client && npm run dev
- Electron window opens (dark, 1440x900)
- backend.log in userData folder shows sidecar started on a port
- AuthModal is visible (no JWT yet)
- Click "Login via Browser" → default browser opens localhost:5173/auth?source=ide
- Sign in with Clerk → web page redirects to aether://auth?token=...&email=...
- Electron catches the URL → AuthModal disappears → IDE shell placeholder visible
- No unhandled errors in Electron console

---

════════════════════════════════════════════════════════
TASK 06 — Desktop Client: React Shell + Store + AuthModal
════════════════════════════════════════════════════════

WHAT TO BUILD:
The complete React application shell including Zustand
state store, AuthModal, ErrorBoundary, and the main
App.jsx layout with placeholder panels for components
that will be built in later tasks.

FILES TO IMPLEMENT:

src/index.css:
  Tailwind directives. CSS custom properties for all brand
  colors: --bg, --surface, --border, --violet, --blue,
  --text, --muted, --green, --amber, --red.
  Reset: html/body/#root height 100%, overflow hidden.
  Custom dark scrollbar (6px, transparent track).

src/store.js:
  Zustand store with persist middleware.
  Persist key 'aether-ide-state'. Persist only:
  editorSettings, theme, sidebarWidth, rightPanelWidth,
  terminalPanelHeight.

  State slices and their fields:
  AUTH: authStatus {authenticated, email}, setAuthStatus
  BACKEND: backendUrl, backendError, setBackendUrl, setBackendError
  WORKSPACE: rootPath, fileTree, setRootPath, setFileTree
  TABS: tabs[], activeTabId, recentlyClosedTabs[],
    openTab(file) — adds if not exists (match by path), activates
    closeTab(id) — removes, pushes to recently closed (max 10),
      activates last remaining tab
    setTabDirty(id, dirty)
    pinTab(id) — toggles isPinned
    reopenLastTab() — restore from recentlyClosedTabs
  EDITOR: editorSettings {fontFamily, fontSize, lineHeight,
    tabSize, useSpaces, wordWrap, minimap},
    setEditorSetting(key, val)
  MODERNIZE: modernizeState (idle/scanning/scraping/streaming/done/error),
    originalCode, fixedCode, activeFlag, sourceUrl,
    setModernizeState, appendFixedCode(chunk), resetModernize
  TERMINAL: terminals[], terminalPanelOpen, terminalPanelHeight,
    activeTerminalId, addTerminal, removeTerminal,
    setTerminalPanelOpen, setTerminalPanelHeight
  DEBUGGER: debugSession, debugState (idle/running/paused/stopped),
    breakpoints {} (filePath → [{line, condition, enabled}]),
    callStack[], variables {locals, watch},
    setDebugSession, setDebugState, toggleBreakpoint(filePath, line),
    setCallStack, setVariables
  GIT: gitStatus {branch, files[], ahead, behind}, gitPanelOpen,
    gitPanelTab, setGitStatus, setGitPanelOpen, setGitPanelTab
  DIAGNOSTICS: diagnostics {} (filePath → [markers]),
    setDiagnostics(filePath, markers)
  LAYOUT: sidebarWidth (260), rightPanelOpen (true),
    rightPanelWidth (340), activeSidebarTab (files),
    activeRightTab (rag), theme (dark),
    setSidebarWidth, setRightPanelWidth,
    setActiveSidebarTab, setActiveRightTab, toggleTheme
  SESSIONS: currentSessionName, setCurrentSessionName
  CHAT: chatMessages[], appendChatMessage(msg), clearChat

src/ErrorBoundary.jsx:
  Class component. Catches errors from children.
  Shows a centered error UI with: warning icon, label prop
  as component name, error message in monospace, Retry button.
  Retry resets hasError to false.

src/AuthModal.jsx:
  Full-screen dark overlay covering everything (z-index 9999).
  Shows Aether IDE logo/title in the center.
  Two buttons:
  1. "Login via Browser" — calls window.electron.auth.openBrowser('ide')
  2. "Already logged in? Check again" — calls
     window.electron.auth.getStatus(), if authenticated dispatch
     to store, else show error message.
  Cannot be dismissed without authenticating.

src/App.jsx:
  On mount: listen to window.electron events:
    auth.onStartup → setAuthStatus
    auth.onSuccess → setAuthStatus with authenticated:true
    sidecar.onReady → setBackendUrl with http://127.0.0.1:{port}
    sidecar.onError → setBackendError
  Also call auth.getStatus() immediately on mount.

  If not authenticated: render AuthModal covering everything.

  Layout (when authenticated):
    Title bar (36px): "Aether IDE" with violet accent.
      Show rootPath if open.
    Main body (flex row, fills remaining height):
      Activity bar (48px wide): icon buttons for
        files, search, git, debug panels.
        Clicking changes activeSidebarTab in store.
      Sidebar panel (sidebarWidth from store):
        Render placeholder text for now.
      Editor area (flex-grow):
        Render placeholder text for now.
      Right panel (rightPanelWidth, collapsible):
        Render placeholder text for now.
    Terminal area (terminalPanelHeight): placeholder
    Status bar (26px, violet background):
      Show branch and email from store.

  Wrap each major section in ErrorBoundary with a label prop.

src/main.jsx:
  Render App in StrictMode into #root. Import index.css.

ACCEPTANCE TEST:
- Electron opens showing AuthModal
- AuthModal "Login via Browser" triggers browser open
- After auth deep link: AuthModal disappears
- IDE shell shows: title bar, activity bar, sidebar,
  editor, right panel, terminal area, violet status bar
- Status bar shows "main" branch and auth email
- Clicking activity bar icons changes which sidebar tab is active
- No console errors

---

════════════════════════════════════════════════════════
TASK 07 — Desktop Client: Monaco Editor + File Tree + Tabs
════════════════════════════════════════════════════════

WHAT TO BUILD:
The three core editor components. After this task the
IDE can open real files, edit them, and run the AI
modernization pipeline.

FILES TO IMPLEMENT:

src/components/Sidebar/FileTree.jsx:
  "Open Folder" button at top calls electron.fs.openFolder(),
    stores rootPath and fileTree in store.
  Recursive tree render from fileTree data.
  Folder rows: toggle open/closed on click (default: open if
    depth < 2).
  File rows: on click, call electron.fs.readFile(path) to get
    content, then openTab({path, name, language, content}).
  Detect language from extension:
    .js/.jsx → javascript, .ts/.tsx → typescript,
    .py → python, .css → css, .json → json,
    .md → markdown, .html → html, else → plaintext.
  Show a small colored label for file type instead of icons.
  Show git status dot (orange=modified, red=untracked)
    by matching filename against gitStatus.files from store.
  Indent each level by 12px.
  Hover highlight on rows.

src/components/Editor/EditorTabs.jsx:
  Tab bar showing all open tabs from store.
  Each tab: dirty orange dot (if isDirty), file name, × close button.
  Active tab: highlighted with white text, violet bottom border,
    darker background.
  Clicking tab sets activeTabId in store.
  × button calls closeTab(id) (confirm if dirty).
  Ctrl+W / Cmd+W closes active tab (keyboard listener).
  Empty state message when no tabs: "Open a file from the sidebar".
  Horizontal scroll if many tabs overflow.

src/components/Editor/CodeCanvas.jsx:
  Use @monaco-editor/react Editor component.
  Show EditorTabs above the editor.
  Derive current file from tabs + activeTabId in store.
  Pass language and value from active tab to Monaco.
  onChange: update local content state, setTabDirty(id, true).
  Editor options from store.editorSettings:
    fontFamily, fontSize, lineHeight, tabSize, wordWrap,
    minimap.enabled.
  Theme: vs-dark.

  Toolbar above Monaco (below tabs):
    File path breadcrumb (last 2 segments).
    Language badge.
    "⚡ Modernize" button (violet, disabled when not idle).

  Modernize flow:
    On click: set modernizeState='scanning', store originalCode.
    Call electron.analyze.modernize(content, path).
    Listen to electron.analyze.onStream for chunks.
    Parse each chunk as JSON:
      type=code_chunk → appendFixedCode(content)
      type=flag_found → set sourceUrl
      type=done → setModernizeState('done'), offStream
      type=no_deprecations → setModernizeState('idle'), offStream
    While streaming: show modernizeState in button label.

  Split diff view (when modernizeState is streaming or done):
    Left panel: original code (red tint background, read-only Monaco)
    Right panel: AI fix streaming in (green tint, read-only Monaco)
    Source URL bar above showing where the fix came from.

  Accept / Reject buttons below diff:
    Accept: call electron.fs.writeFile(path, fixedCode),
      update tab content, resetModernize.
    Reject: resetModernize, back to normal editor.

  If no file open: centered empty state message.

Update App.jsx:
  Import FileTree, EditorTabs, CodeCanvas.
  Replace sidebar placeholder with FileTree.
  Replace editor placeholder with EditorTabs + CodeCanvas.

ACCEPTANCE TEST:
- Click "Open" in FileTree → folder opens → files render
- Click a JS file → Monaco opens with syntax highlighting
- Click a Python file → Monaco opens with Python highlighting
- Edit file → dirty orange dot appears on tab
- Ctrl+W → tab closes
- Open multiple files → multiple tabs appear
- Click "⚡ Modernize" on a file with deprecated code
  (e.g. a file containing componentWillMount)
  → spinner state, then split diff appears
- Click Accept → file written, diff closes
- Click Reject → returns to normal editor

---

════════════════════════════════════════════════════════
TASK 08 — Desktop Client: AI Panels
════════════════════════════════════════════════════════

WHAT TO BUILD:
The right-side AI panels: RAG chat with source citations
and the architecture visualizer.

FILES TO IMPLEMENT:

src/components/Panels/RagChat.jsx:
  Two sections: message list (scrollable, flex-grow)
    and input row (bottom, fixed).
  Message list: render each message from store.chatMessages.
    User messages: right-aligned, violet tint.
    AI messages: left-aligned, surface background,
      rendered with ReactMarkdown for formatting.
    Below each AI message: if sourceUrl exists, show a
      "Source:" chip with a clickable link.
  Input row: text input + Send button.
    Enter key (without shift) also sends.
    Disabled while loading.
  On send:
    Append user message to store.
    Get token from window.electron.auth.getToken().
    Get backendUrl from store (or fallback to port 8008).
    POST to {backendUrl}/api/rag/query with
      Authorization header, question, and context
      (current file content from active tab).
    Append AI response to store.
  Loading indicator while waiting.
  "Clear" button in header calls store.clearChat().

src/components/Panels/ProblemsPanel.jsx:
  List all diagnostics from store.diagnostics.
  Group by file path with collapsible sections.
  Each entry: severity icon, message, file:line.
  Click entry → open that file at that line.
  Filter tabs: All / Errors / Warnings.

Update App.jsx right panel:
  Add tab bar: AI Chat | Problems
  Render RagChat or ProblemsPanel based on activeRightTab.
  Wire activity bar lightning bolt icon to toggle right panel.

ACCEPTANCE TEST:
- AI Chat panel visible
- Type a question about code → response renders with markdown
- Source URL chip appears below AI response
- Clear button empties messages
- Problems tab shows (empty list OK at this stage)

---

════════════════════════════════════════════════════════
TASK 09 — Desktop Client: Integrated Terminal
════════════════════════════════════════════════════════

WHAT TO BUILD:
Real PTY terminal using node-pty + xterm.js.
This is technically the most complex task because
node-pty is a native module that needs special handling.

CRITICAL SETUP FIRST:
Before writing any code, ensure:
1. node-pty is in package.json dependencies (done in Task 01)
2. asarUnpack includes node_modules/node-pty (done in Task 01)
3. Run: npx electron-rebuild in apps/desktop-client
   This rebuilds node-pty for the current Electron version.
   If electron-rebuild is not found: npm install -g electron-rebuild

FILES TO IMPLEMENT:

electron/ipcHandlers/terminalHandler.cjs:
  Try to require('node-pty'), catch and log if unavailable.
  Maintain a Map of id → {ptyProcess, rows, cols}.
  Increment counter for unique terminal IDs.
  Shell detection: process.env.SHELL on Mac/Linux,
    process.env.COMSPEC or 'cmd.exe' on Windows.
  terminal:create({cwd, rows=24, cols=80}):
    Spawn pty with correct shell, TERM=xterm-256color.
    Forward pty output to renderer via
    mainWindow.webContents.send('terminal:data:{id}', data).
    On exit: send 'terminal:exit:{id}', remove from map.
    Return {id}.
  terminal:write({id, data}): proc.write(data)
  terminal:resize({id, rows, cols}): proc.resize(cols, rows)
  terminal:kill({id}): proc.kill(), delete from map
  terminal:setcwd({id, cwd}): write 'cd "{cwd}"\r' to proc
  Export killAll() that kills all terminals — called in before-quit.

Update electron/main.cjs:
  Import terminalHandler and call its register().
  Call terminalHandler.killAll() in before-quit event.

src/components/Terminal/TerminalPanel.jsx:
  Import Terminal from @xterm/xterm.
  Import FitAddon from @xterm/addon-fit.
  Import WebLinksAddon from @xterm/addon-web-links.
  Import CSS: '@xterm/xterm/css/xterm.css'.
  On mount: create Terminal instance with dark theme
    matching brand colors (background #0a0a0f, cursor #7C3AED,
    fontFamily JetBrains Mono, fontSize 13, cursorBlink true).
  Load and attach FitAddon and WebLinksAddon.
  Open xterm in a container div ref.
  Wire xterm.onData → electron.terminal.write(terminalId, data).
  Wire electron.terminal.onData(terminalId) → xterm.write(data).
  Wire electron.terminal.onExit(terminalId) → print exit message.
  ResizeObserver on container: call fitAddon.fit() then
    electron.terminal.resize(terminalId, xterm.rows, xterm.cols).
  When isActive prop changes to true: call fitAddon.fit() and
    xterm.focus() after a short setTimeout.
  On unmount: disconnect observer, electron.terminal.offAll,
    xterm.dispose().

src/components/Terminal/TerminalTabs.jsx:
  Tab bar: shows each terminal from store.terminals.
    Each tab: terminal name, × button.
    Active tab highlighted.
  + button: create new terminal.
    Call electron.terminal.create({cwd: store.rootPath})
    then addTerminal to store.
  × button: removeTerminal from store, call electron.terminal.kill.
  Ctrl+` toggles terminalPanelOpen in store (keyboard listener).
  Below tab bar: render TerminalPanel for each terminal,
    only the active one visible (absolute positioning).
  Empty state with "New Terminal" button if no terminals.
  Show a close/hide button for the panel.

src/components/Terminal/TerminalToolbar.jsx:
  Small toolbar between tab bar and terminal content.
  Buttons: Clear (send clear command), Kill (terminate process),
    Split (placeholder for future split terminal).

Update App.jsx:
  Import TerminalTabs.
  Replace terminal placeholder with TerminalTabs.
  Terminal panel height is draggable (mouse drag on top border).
  Store new height in store.terminalPanelHeight.

ACCEPTANCE TEST:
- Ctrl+` opens the terminal panel
- A real shell appears (bash/zsh on Mac/Linux, cmd on Windows)
- Type: ls (or dir on Windows) → directory contents appear
- Type: echo "hello aether" → response appears
- Type: python --version → Python version shows
- + button creates a second terminal tab
- × closes that terminal
- Drag the top border of the terminal panel → it resizes
- Ctrl+` again hides the terminal panel

---

════════════════════════════════════════════════════════
TASK 10 — Python Backend: All API Endpoints
════════════════════════════════════════════════════════

WHAT TO BUILD:
Every Python backend endpoint. The full AST modernization
pipeline, RAG query, git status, AI completions, and
all the unique feature endpoints.

FILES TO IMPLEMENT:

app/agents/deprecation_db.json:
  JSON object with two top-level keys: "javascript" and "python".
  JavaScript deprecated patterns to include:
    componentWillMount, ReactDOM.render, findDOMNode,
    componentWillReceiveProps, componentWillUpdate,
    moment( (moment.js), request( (node request library)
  Python deprecated patterns to include:
    asyncio.coroutine, collections.Mapping,
    imp.load_module, os.popen
  Each entry has: replacement, docs_query, severity, since_version.

app/agents/anomaly_detector.py:
  load_deprecation_db() reads the JSON file.
  detect_language(file_path) maps extension to language string.
  traverse_and_flag(content, language) → List[DeprecationFlag]:
    For each pattern in deprecation_db[language]:
      Search content for that pattern string.
      If found: record line number, create DeprecationFlag.
      Use splitlines and enumerate to find exact line numbers.
      Extract ±5 lines as code_snippet.
  extract_context_block(content, line, window=10) → str:
    Return lines from max(0, line-window) to
    min(total_lines, line+window).

app/scrapers/doc_crawler.py:
  KNOWN_SOURCES dict mapping library keywords to base URLs:
    react → react.dev, python → docs.python.org, etc.
  resolve_doc_url(docs_query) → str:
    Check KNOWN_SOURCES for keyword matches.
    Query DuckDuckGo Instant Answer API:
      GET https://api.duckduckgo.com/?q={query}&format=json&no_redirect=1
    Extract AbstractURL or first RelatedTopics URL.
    Return the best URL found.
  can_fetch(url) → bool:
    Check robots.txt using urllib.robotparser.
    Cache results. Return True if fetch is allowed.
  polite_fetch(url) → str (async):
    Rate limit: track last request time per domain,
    wait at least 2 seconds between requests to same domain.
    Use httpx async client with User-Agent: AgenticIDE/1.0.
  crawl_and_extract(url) → str (async):
    Check can_fetch first. Then polite_fetch.
    Parse with BeautifulSoup4.
    Remove: nav, header, footer, script, style, aside,
      elements with class containing menu or nav.
    Extract: article, main, .content, or body as fallback.
    Preserve code blocks: replace <code> content with
      backtick-fenced blocks.
    Return clean text.
  filter_migration_syntax(raw_text) → str:
    Find paragraphs containing migration keywords:
    "deprecated", "replaced by", "instead use", "migration",
    "use X instead", "no longer", "removed in".
    Return those paragraphs plus the 2 following paragraphs.

app/scrapers/text_processor.py:
  chunk_for_vectorization(text, chunk_size=500, overlap=50)
    → List[str]:
    Approximate token count as len(text) / 4.
    Split into chunks respecting sentence boundaries.
    Each chunk overlaps the previous by overlap tokens.

app/agents/orchestrator.py:
  run_modernize_pipeline(file_content, file_path)
    → AsyncGenerator[str, None]:
    1. detect_language from extension
    2. traverse_and_flag to get list of DeprecationFlag
    3. If empty: yield {"type":"no_deprecations"} and return
    4. For each flag:
       a. scrape = await crawl_and_extract(
            await resolve_doc_url(flag.docs_query))
       b. filtered = filter_migration_syntax(scrape)
       c. chunks = chunk_for_vectorization(filtered)
       d. store_migration_context(chunks, url, flag.function_name)
       e. rag = query_relevant_fix(flag.function_name)
       f. context = join rag documents
       g. prompt = assemble_strict_prompt(
            flag.code_snippet, context, flag.function_name)
       h. yield json {"type":"flag_found", "flag":flag.dict(),
            "source_url": rag[0]["source_url"] if rag else ""}
       i. async for chunk in stream_modernized_code(prompt):
            yield json {"type":"code_chunk","content":chunk}
    5. yield json {"type":"done"}

app/api/endpoints/analyze.py:
  POST /modernize:
    Body: ModernizeRequest. Auth required.
    Return StreamingResponse (text/event-stream).
    Each event: "data: {json_line}\n\n" from orchestrator.
    Headers: Cache-Control: no-cache, X-Accel-Buffering: no.
  POST /scan-project:
    Body: ProjectScanRequest. Auth required.
    For each file_path: read file, detect_language,
    traverse_and_flag. Return {total, issues:[{file, flags, language}]}.

app/api/endpoints/rag.py:
  POST /query:
    Body: RagQueryRequest. Auth required.
    query_relevant_fix(question) to get top docs.
    groq_complete with system prompt to answer using
    only the provided context.
    Return {answer, source_url, confidence:0.9}.

app/api/endpoints/git.py:
  GET /status?path={folder}:
    Run: git -C {path} status --porcelain --branch
    Parse output into {branch, files:[{x, y, path}]}.

app/api/endpoints/ai.py:
  POST /complete: inline code completion, temp 0.1,
    max 150 tokens, stop on double newline or backticks.
    Return {completion}.
  POST /explain: explain selection in 2-3 sentences.
    Return {explanation}.
  POST /generate: generate code from comment.
    Return {code}.

app/api/endpoints/perf.py, contracts.py, deps.py,
  mutations.py, git_extra.py:
  Implement as stubs for now. Each has a router and
  a GET /status endpoint returning {"status":"coming_soon"}.
  They will be fully implemented as unique features later.

ACCEPTANCE TEST:
- curl POST /api/analyze/modernize with a React component
  containing componentWillMount
  → response streams JSON lines including flag_found,
    code_chunk events, ending with done
- curl POST /api/rag/query with a question
  → returns {answer, source_url}
- curl GET /api/git/status?path=/some/git/repo
  → returns {branch, files}
- All endpoints return 401 when no Authorization header
  (unless CLERK_JWT_ISSUER is empty)

---

════════════════════════════════════════════════════════
TASK 11 — Desktop Client: Git UI + Static Analyzer IPC
════════════════════════════════════════════════════════

WHAT TO BUILD:
Full git UI with staging, commit, and branch management.
The static analyzer IPC handler that actually connects
the Modernize button to the Python backend stream.

FILES TO IMPLEMENT:

electron/ipcHandlers/staticAnalyzer.cjs:
  register(ipcMain, app, getMainWindow, getBackendPort):
  analyze:modernize(content, filePath):
    Get backendPort from getBackendPort().
    Get JWT from global.__aetherJWT (attach as Bearer token).
    POST to http://127.0.0.1:{port}/api/analyze/modernize.
    Read the response body as a stream using fetch + ReadableStream.
    For each SSE line starting with "data: ": extract the JSON,
    send it to renderer via mainWindow.webContents.send('analyze:stream', json).
    Return {success:true} when stream ends.
  analyze:scanProject(filePaths):
    POST to /api/analyze/scan-project with JWT.
    Return the JSON response.

electron/ipcHandlers/gitHandler.cjs:
  register(ipcMain):
  Implement ALL git operations using child_process exec:
  git:status({rootPath}) → parse --porcelain output
  git:diff({rootPath, filePath, staged}) → git diff output
  git:stage({rootPath, filePaths}) → git add
  git:unstage({rootPath, filePaths}) → git restore --staged
  git:discardChanges({rootPath, filePath}) → git restore
  git:commit({rootPath, message, amend}) → git commit
  git:push({rootPath}) → git push
  git:pull({rootPath}) → git pull --rebase
  git:fetch({rootPath}) → git fetch --all
  git:branches({rootPath}) → git branch, return {current, local[]}
  git:createBranch({rootPath, name, checkout})
  git:switchBranch({rootPath, name})
  git:deleteBranch({rootPath, name, force})
  git:log({rootPath, limit}) → parsed commit list
    Each: {hash (7 chars), author, timestamp, subject}
  git:blame({rootPath, filePath}) → parsed blame output
    Each line: {hash, author, summary, content}
  git:stash({rootPath, message})
  git:stashPop({rootPath})

src/components/Git/GitPanel.jsx:
  Poll git status every 5 seconds when rootPath exists.
    Call electron.git.status(rootPath) and setGitStatus.

  Three sections:
  STAGED section: files where x !== ' ' and x !== '?'
    Each row: green filename, − button to unstage.
  CHANGES section: files where y !== ' ' and y !== '?'
    Each row: orange filename, + button to stage, diff preview on click.
  UNTRACKED section: files where x === '?'
    Each row: red filename, + button to stage.

  DIFF PREVIEW: clicking a file row shows the diff output
    (call electron.git.diff) in a small panel with monospace
    font, added lines green, removed lines red.

  COMMIT PANEL at bottom:
    Textarea for commit message.
    "Commit ({n} staged)" button — disabled when message
    is empty or no staged files.
    On commit: call electron.git.commit, refresh status.

  PUSH/PULL/FETCH buttons in the header area.
    Show spinner on each while in progress.

Update App.jsx:
  Import GitPanel.
  In the sidebar area: when activeSidebarTab === 'git',
  render GitPanel instead of FileTree.
  Poll git status on interval using setInterval in useEffect.

ACCEPTANCE TEST:
- Open a git repository folder
- Git panel shows files in correct sections
- Click + on an unstaged file → moves to staged
- Click − on a staged file → moves back to unstaged
- Write a commit message → Commit button enables
- Click Commit → git log shows the new commit
- FileTree shows colored dots for modified/untracked files
- Modernize Code button (from Task 07) now actually streams
  from the Python backend → split diff appears
- Accept Fix → file written to disk

---

════════════════════════════════════════════════════════
TASK 12 — Final Wiring: Command Palette + Status Bar + Auth Polish
════════════════════════════════════════════════════════

WHAT TO BUILD:
Command palette, quick file open, full status bar,
keyboard shortcuts, and the final auth bridge that
makes the web portal correctly activate the desktop IDE.

FILES TO IMPLEMENT:

src/components/Overlays/CommandPalette.jsx:
  Triggered by Ctrl+Shift+P (or Cmd+Shift+P on Mac).
  Full-screen dimmed overlay, centered modal (max-width 600px).
  Search input at top. Fuzzy-filtered command list below.
  Commands to include:
    Open Folder (Ctrl+O)
    Toggle Terminal (Ctrl+`)
    Open Source Control
    Modernize Current File (Ctrl+Shift+M)
    Scan Entire Project
    Format Document (Shift+Alt+F)
    Start Debugging (F5)
    Git: Commit
    Git: Push
    Git: Pull
    Toggle Theme
    Sign Out
  Each command: label left, keybinding hint right.
  Arrow keys navigate list. Enter executes top match.
  Escape closes. Click outside closes.

src/components/Overlays/QuickOpen.jsx:
  Triggered by Ctrl+P (or Cmd+P on Mac).
  Same modal shell as CommandPalette.
  Search input filters all files in store.fileTree
  (flatten the tree into a searchable list).
  Each result: file type label + relative path.
  Click or Enter opens the file in Monaco.
  Show recently opened files when input is empty.

src/components/StatusBar.jsx:
  Full-width bar (26px) at the very bottom of the IDE.
  Violet background (#7C3AED).

  LEFT SIDE:
    Git branch name (from store.gitStatus.branch)
    Ahead/behind count if nonzero
    Current session name if set (◉ sessionName)

  CENTER:
    Error count (✕ N) in light red if errors exist
    Warning count (△ N) in light amber if warnings exist

  RIGHT SIDE:
    Auth email
    Backend status dot: green if backendUrl set, red if not
    "Backend ready" or "Backend offline" label

Update App.jsx:
  Import CommandPalette, QuickOpen, StatusBar.
  Add useState for paletteOpen and quickOpenOpen.
  Add useEffect with keyboard handler:
    Ctrl/Cmd+Shift+P → toggle palette
    Ctrl/Cmd+P → toggle quick open
  Render CommandPalette and QuickOpen as overlays
    when their state is true.
  Replace the violet status bar div with <StatusBar />.

CRITICAL AUTH POLISH in web-frontend:
  In apps/web-frontend/src/pages/AuthPortal.jsx,
  find the useEffect that runs after sign-in.
  For the case where source === 'ide':
    Call getToken() to get the Clerk JWT.
    Get the user's primary email from the user object.
    Build the URL: aether://auth?token={encodeURIComponent(token)}&email={encodeURIComponent(email)}
    Set window.location.href to that URL.
    This triggers the Electron protocol handler from Task 05.
    This is the exact line that was missing before and caused
    Windsurf to produce a disconnected auth flow.

FINAL ACCEPTANCE TEST — all 16 steps must pass:
  1. npm run dev:all from monorepo root — all three start
  2. localhost:5173 — landing page loads with terminal animation
  3. Click Download without login → redirects to /auth
  4. Sign in → redirects to /dashboard with Download button
  5. Open Electron app → AuthModal appears
  6. Click "Login via Browser" → browser opens /auth?source=ide
  7. Sign in → browser URL changes to aether://auth?token=...
  8. Electron catches it → AuthModal disappears → IDE shell visible
  9. Click "Open" in FileTree → select a folder → files appear
  10. Click a JS file with componentWillMount → Monaco opens it
  11. Click "⚡ Modernize" → scanning... → streaming... → split diff
  12. Accept Fix → file saved, diff closes, tab content updated
  13. Ctrl+` → terminal opens → type ls → files listed
  14. ⑂ icon in activity bar → Git panel → stage + commit works
  15. Ctrl+Shift+P → command palette opens with fuzzy search
  16. Status bar shows branch, email, green backend dot

  ALL 16 STEPS MUST PASS BEFORE CALLING THE PROJECT COMPLETE.
