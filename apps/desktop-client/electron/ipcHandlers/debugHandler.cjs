const { ipcMain } = require('electron')
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')
const fs = require('fs')

let debugSession = null

class DAPClient {
  constructor(port, onEvent, onLog) {
    this.port = port
    this.onEvent = onEvent
    this.onLog = onLog
    this.socket = new net.Socket()
    this.buffer = Buffer.alloc(0)
    this.seq = 1
    this.callbacks = new Map()

    this.socket.on('data', (data) => {
      this.buffer = Buffer.concat([this.buffer, data])
      this.processBuffer()
    })

    this.socket.on('error', (err) => this.onLog(`[DAP Error] ${err.message}`))
  }

  connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('DAP connection timeout')), 5000)
      this.socket.connect(this.port, '127.0.0.1', () => {
        clearTimeout(timeout)
        this.onLog(`[DAP] Connected to port ${this.port}`)
        resolve()
      })
    })
  }

  processBuffer() {
    while (true) {
      const str = this.buffer.toString('utf8')
      const match = str.match(/Content-Length: (\d+)\r\n\r\n/)
      if (!match) break

      const length = parseInt(match[1])
      const headerLength = match[0].length
      if (this.buffer.length < headerLength + length) break

      const body = this.buffer.slice(headerLength, headerLength + length).toString('utf8')
      this.buffer = this.buffer.slice(headerLength + length)

      try {
        const msg = JSON.parse(body)
        if (msg.type === 'response') {
          const cb = this.callbacks.get(msg.request_seq)
          if (cb) {
            cb(msg)
            this.callbacks.delete(msg.request_seq)
          }
        } else if (msg.type === 'event') {
          this.onEvent(msg.event, msg.body)
        }
      } catch (e) {
        this.onLog(`[DAP Parse Error] ${e.message}`)
      }
    }
  }

  send(command, args = {}) {
    return new Promise((resolve) => {
      const request = {
        seq: this.seq++,
        type: 'request',
        command,
        arguments: args
      }
      this.callbacks.set(request.seq, resolve)
      const json = JSON.stringify(request)
      this.socket.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`)
    })
  }

  dispose() {
    this.socket.destroy()
  }
}

let dap = null

/**
 * Find .NET solution (.sln) or C# project (.csproj) in file parent directories
 */
/**
 * Find .NET solution (.sln) or C# project (.csproj) in file parent directories
 */
function findDotnetProject(dir) {
  let current = dir
  let slnInfo = null
  let csprojInfo = null

  while (true) {
    try {
      if (fs.existsSync(current)) {
        const files = fs.readdirSync(current)
        const slnFile = files.find(f => f.endsWith('.sln'))
        if (slnFile && !slnInfo) {
          slnInfo = { type: 'sln', path: path.join(current, slnFile), dir: current }
        }
        const csprojFile = files.find(f => f.endsWith('.csproj'))
        if (csprojFile && !csprojInfo) {
          csprojInfo = { type: 'csproj', path: path.join(current, csprojFile), dir: current }
        }
      }
    } catch (e) {
      // Ignore read errors
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  // ALWAYS prefer the solution (.sln) root directory if found in ancestor paths
  if (slnInfo) return slnInfo
  if (csprojInfo) return csprojInfo
  return null
}

/**
 * Helper to resolve absolute path of dotnet on Windows
 */
function resolveDotnetPath() {
  // Let the system shell resolve dotnet using injected PATH folders to avoid architecture conflicts
  return 'dotnet'
}

/**
 * Helper to resolve absolute path of cargo on Windows
 */
function resolveCargoPath() {
  if (process.platform === 'win32') {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\shlok'
    const paths = [
      path.join(userProfile, '.cargo\\bin\\cargo.exe'),
      'C:\\Program Files\\Rust\\bin\\cargo.exe'
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
  }
  return 'cargo'
}

/**
 * Helper to resolve absolute path of go on Windows
 */
function resolveGoPath() {
  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Go\\bin\\go.exe',
      'C:\\Go\\bin\\go.exe'
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
  }
  return 'go'
}

/**
 * Helper to resolve absolute path of python on Windows
 */
function resolvePythonPath() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\shlok', 'AppData\\Local')
    try {
      const pythonProgramsDir = path.join(localAppData, 'Programs\\Python')
      if (fs.existsSync(pythonProgramsDir)) {
        const dirs = fs.readdirSync(pythonProgramsDir)
        for (const d of dirs) {
          const p = path.join(pythonProgramsDir, d, 'python.exe')
          if (fs.existsSync(p)) return p
        }
      }
    } catch (e) {}
  }
  return 'python'
}

/**
 * Launch .NET project using dotnet run
 */
/**
 * Resolve the real 64-bit cmd.exe path under WoW64 redirection on Windows
 */
function getWindowsShell() {
  if (process.platform === 'win32') {
    const sysnative = 'C:\\Windows\\Sysnative\\cmd.exe'
    if (fs.existsSync(sysnative)) {
      return sysnative
    }
    return 'cmd.exe'
  }
  return true
}

/**
 * Launch .NET project using dotnet run
 */
async function launchDotnet(dotnetProj, getMainWindow) {
  const cmd = resolveDotnetPath()
  let args = ['run']
  const projectDir = dotnetProj.dir

  // If we are at solution level, scan for subfolders containing Web/API projects to target
  if (dotnetProj.type === 'sln') {
    try {
      const files = fs.readdirSync(projectDir)
      const webDir = files.find(f => {
        const p = path.join(projectDir, f)
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
          const subFiles = fs.readdirSync(p)
          return subFiles.some(sf => sf.endsWith('.csproj') && (f.toLowerCase().includes('web') || f.toLowerCase().includes('api')))
        }
        return false
      })
      if (webDir) {
        args = ['run', '--project', webDir]
        getMainWindow()?.webContents.send('debug:output', `[Aeres] .NET Solution detected. Auto-targeting Web project: '${webDir}'...\n`)
      }
    } catch (e) {
      console.error('[Aeres Solution Scan Error]', e)
    }
  }

  getMainWindow()?.webContents.send('debug:output', `[Aeres] Launching: dotnet ${args.join(' ')} inside ${projectDir}\n`)

  const finalCmd = cmd.includes(' ') && !cmd.startsWith('"') ? `"${cmd}"` : cmd

  const env = { ...process.env }
  if (process.platform === 'win32') {
    const programFiles64 = process.env.ProgramW6432 || 'C:\\Program Files'
    env.DOTNET_ROOT = path.join(programFiles64, 'dotnet')
    
    const paths = env.PATH || env.Path || ''
    const dotnet64Path = path.join(programFiles64, 'dotnet')
    const dotnetPaths = [
      dotnet64Path,
      'C:\\Program Files\\dotnet',
      'C:\\Program Files (x86)\\dotnet'
    ].filter(p => fs.existsSync(p))
    
    if (dotnetPaths.length > 0) {
      env.PATH = `${dotnetPaths.join(';')};${paths}`
      env.Path = `${dotnetPaths.join(';')};${paths}`
    }
  }

  const child = spawn(finalCmd, args, {
    cwd: projectDir,
    env,
    shell: getWindowsShell()
  })

  debugSession = { child, port: 0, lang: 'dotnet' }

  child.stdout.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  child.stderr.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })

  child.on('exit', (code) => {
    getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${code}]\n`)
    getMainWindow()?.webContents.send('debug:terminated')
    debugSession = null
  })

  return { session: { port: 0, lang: 'dotnet' } }
}

/**
 * Find Django/FastAPI Python project in parent directories
 */
function findPythonProject(dir) {
  let current = dir
  while (true) {
    try {
      if (fs.existsSync(current)) {
        const managePy = path.join(current, 'manage.py')
        if (fs.existsSync(managePy)) return { type: 'django', path: managePy, dir: current }
        const mainPy = path.join(current, 'main.py')
        if (fs.existsSync(mainPy)) return { type: 'fastapi', path: mainPy, dir: current }
      }
    } catch (e) {}
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/**
 * Find Rust Cargo project in parent directories
 */
function findCargoProject(dir) {
  let current = dir
  while (true) {
    try {
      if (fs.existsSync(current)) {
        const cargoToml = path.join(current, 'Cargo.toml')
        if (fs.existsSync(cargoToml)) return { path: cargoToml, dir: current }
      }
    } catch (e) {}
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/**
 * Find Go project in parent directories
 */
function findGoProject(dir) {
  let current = dir
  while (true) {
    try {
      if (fs.existsSync(current)) {
        const goMod = path.join(current, 'go.mod')
        if (fs.existsSync(goMod)) return { path: goMod, dir: current }
      }
    } catch (e) {}
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/**
 * Find Java Maven/Gradle project in parent directories
 */
function findJavaProject(dir) {
  let current = dir
  while (true) {
    try {
      if (fs.existsSync(current)) {
        const pomXml = path.join(current, 'pom.xml')
        if (fs.existsSync(pomXml)) return { type: 'maven', path: pomXml, dir: current }
        const buildGradle = path.join(current, 'build.gradle')
        if (fs.existsSync(buildGradle)) return { type: 'gradle', path: buildGradle, dir: current }
      }
    } catch (e) {}
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/**
 * Launch generic spawned project process and stream output to frontend terminal
 */
async function launchGenericSpawn(cmd, args, cwd, lang, getMainWindow) {
  const finalCmd = cmd.includes(' ') && !cmd.startsWith('"') ? `"${cmd}"` : cmd

  const child = spawn(finalCmd, args, {
    cwd,
    env: { ...process.env },
    shell: getWindowsShell()
  })

  debugSession = { child, port: 0, lang }

  child.stdout.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  child.stderr.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })

  child.on('exit', (code) => {
    getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${code}]\n`)
    getMainWindow()?.webContents.send('debug:terminated')
    debugSession = null
  })

  return { session: { port: 0, lang } }
}

/**
 * Intercept framework-specific launches (C#, Python, Rust, Go, Java)
 */
async function interceptFrameworkLaunch(filePath, getMainWindow) {
  const fileDir = path.dirname(filePath)
  const ext = path.extname(filePath).toLowerCase()

  // 1. Check for C# .NET Project
  let dotnetProj = null
  try {
    dotnetProj = findDotnetProject(fileDir)
  } catch (e) {
    console.error('[Aeres .NET Detection Error]', e)
  }
  if (dotnetProj) {
    return await launchDotnet(dotnetProj, getMainWindow)
  }

  // 2. Check for Python Frameworks (Django / FastAPI)
  if (ext === '.py') {
    const pyProj = findPythonProject(fileDir)
    if (pyProj) {
      let cmd = resolvePythonPath()
      let args = []
      if (pyProj.type === 'django') {
        args = ['manage.py', 'runserver']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Django Project detected in ${pyProj.dir}. Launching 'python manage.py runserver'...\n`)
      } else if (pyProj.type === 'fastapi') {
        args = ['-m', 'uvicorn', 'main:app', '--reload']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] FastAPI Project detected in ${pyProj.dir}. Launching 'python -m uvicorn main:app --reload'...\n`)
      }
      if (args.length > 0) {
        return await launchGenericSpawn(cmd, args, pyProj.dir, 'python', getMainWindow)
      }
    }
  }

  // 3. Check for Rust Cargo Project
  if (ext === '.rs') {
    const rustProj = findCargoProject(fileDir)
    if (rustProj) {
      const cmd = resolveCargoPath()
      const args = ['run']
      getMainWindow()?.webContents.send('debug:output', `[Aeres] Rust Cargo Project detected in ${rustProj.dir}. Launching 'cargo run'...\n`)
      return await launchGenericSpawn(cmd, args, rustProj.dir, 'rust', getMainWindow)
    }
  }

  // 4. Check for Go Project
  if (ext === '.go') {
    const goProj = findGoProject(fileDir)
    if (goProj) {
      const cmd = resolveGoPath()
      let runDir = goProj.dir
      try {
        const files = fs.readdirSync(goProj.dir)
        const hasMain = files.some(f => f.endsWith('.go') && fs.readFileSync(path.join(goProj.dir, f), 'utf8').includes('package main'))
        if (!hasMain) {
          const subdirs = files.filter(f => fs.statSync(path.join(goProj.dir, f)).isDirectory())
          for (const sd of subdirs) {
            const sdPath = path.join(goProj.dir, sd)
            const subfiles = fs.readdirSync(sdPath)
            if (subfiles.some(sf => sf.endsWith('.go') && fs.readFileSync(path.join(sdPath, sf), 'utf8').includes('package main'))) {
              runDir = sdPath
              break
            }
          }
        }
      } catch (e) {}
      getMainWindow()?.webContents.send('debug:output', `[Aeres] Go Project detected in ${runDir}. Launching 'go run .'...\n`)
      return await launchGenericSpawn(cmd, ['run', '.'], runDir, 'go', getMainWindow)
    }
  }

  // 5. Check for Java Maven/Gradle Projects (Spring Boot)
  if (ext === '.java') {
    const javaProj = findJavaProject(fileDir)
    if (javaProj) {
      let cmd = ''
      let args = []
      if (javaProj.type === 'maven') {
        const hasWrapper = fs.existsSync(path.join(javaProj.dir, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw'))
        cmd = hasWrapper ? (process.platform === 'win32' ? 'mvnw.cmd' : './mvnw') : 'mvn'
        args = ['spring-boot:run']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Spring Boot (Maven) Project detected in ${javaProj.dir}. Launching 'mvn spring-boot:run'...\n`)
      } else if (javaProj.type === 'gradle') {
        const hasWrapper = fs.existsSync(path.join(javaProj.dir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'))
        cmd = hasWrapper ? (process.platform === 'win32' ? 'gradlew.bat' : './gradlew') : 'gradle'
        args = ['bootRun']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Spring Boot (Gradle) Project detected in ${javaProj.dir}. Launching 'gradle bootRun'...\n`)
      }
      if (cmd) {
        return await launchGenericSpawn(cmd, args, javaProj.dir, 'java', getMainWindow)
      }
    }
  }

  return null
}

/**
 * Detect file language from extension
 */
function detectDebugLang(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const langMap = {
    '.py': 'python',
    '.js': 'node', '.mjs': 'node', '.cjs': 'node',
    '.ts': 'node', '.tsx': 'node', '.jsx': 'node',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp',
    '.java': 'java',
    '.rb': 'ruby',
    '.cs': 'csharp',
  }
  return langMap[ext] || 'unknown'
}

function register(ipcMain, app, getMainWindow) {
  // Universal debug launch — detects language automatically
  ipcMain.handle('debug:launch', async (_, { filePath, breakOnStart = true }) => {
    if (debugSession) {
      const child = debugSession.child
      if (!child || child.exitCode !== null || child.killed) {
        // The process has already exited but the session object was not cleared. Auto-heal!
        debugSession = null
        dap?.dispose()
        dap = null
      } else {
        return { error: 'Already debugging' }
      }
    }
    
    // 1. Intercept launches using advanced framework detection
    try {
      const frameworkSession = await interceptFrameworkLaunch(filePath, getMainWindow)
      if (frameworkSession) return frameworkSession
    } catch (e) {
      console.error('[Aeres Framework Interceptor Error]', e)
    }

    const lang = detectDebugLang(filePath)
    const port = 5678 + Math.floor(Math.random() * 100)
    
    getMainWindow()?.webContents.send('debug:output', `[Aeres] Detected: ${lang} | File: ${filePath}\n`)

    try {
      if (lang === 'python') {
        return await launchPython(filePath, port, breakOnStart, getMainWindow, ipcMain)
      } else if (lang === 'node') {
        return await launchNode(filePath, port, breakOnStart, getMainWindow)
      } else {
        // For languages without DAP support, just run the file
        return await runWithOutput(filePath, lang, getMainWindow)
      }
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('debug:command', async (_, { command, args }) => {
    if (!dap) return false
    return await dap.send(command, args)
  })

  ipcMain.handle('debug:stop', () => {
    if (debugSession) {
      const child = debugSession.child
      if (child) {
        if (process.platform === 'win32') {
          try {
            spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'], { shell: true })
          } catch (e) {
            console.error('[Aeres Taskkill Error]', e)
            child.kill()
          }
        } else {
          child.kill()
        }
      }
      debugSession = null
      dap?.dispose()
      dap = null
    }
    return true
  })

  ipcMain.handle('debug:stackTrace', async (_, { sessionId, threadId }) => {
    if (!dap) return { stackFrames: [] }
    const res = await dap.send('stackTrace', { threadId: threadId || 1 })
    return res.body || { stackFrames: [] }
  })

  ipcMain.handle('debug:variables', async (_, { sessionId, variablesReference }) => {
    if (!dap) return { variables: [] }
    const res = await dap.send('variables', { variablesReference })
    return res.body || { variables: [] }
  })

  ipcMain.handle('debug:evaluate', async (_, { sessionId, expression, frameId }) => {
    if (!dap) return { result: 'No session' }
    const args = { expression, context: 'repl' }
    if (frameId) args.frameId = frameId
    const res = await dap.send('evaluate', args)
    return res.body || { result: 'Error' }
  })

  ipcMain.handle('debug:setBreakpoints', async (_, { sessionId, filePath, breakpoints }) => {
    if (!dap) return false
    await dap.send('setBreakpoints', {
      source: { path: filePath },
      breakpoints: breakpoints.map(b => ({ line: b.line }))
    })
    return true
  })
}

/**
 * Python debugging via debugpy (DAP)
 */
async function launchPython(filePath, port, breakOnStart, getMainWindow, ipcMain) {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
  
  const args = ['-m', 'debugpy', '--listen', port.toString()]
  if (breakOnStart) args.push('--wait-for-client')
  args.push(filePath)

  const child = spawn(pythonPath, args, {
    cwd: path.dirname(filePath),
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  })

  debugSession = { child, port, lang: 'python' }
  
  dap = new DAPClient(port, (event, body) => {
    getMainWindow()?.webContents.send('debug:event', { event, body })
    if (event === 'stopped') {
      getMainWindow()?.webContents.send('debug:stopped', body)
    }
  }, (log) => {
    getMainWindow()?.webContents.send('debug:output', log + '\n')
  })

  await new Promise(r => setTimeout(r, 1500))
  await dap.connect()

  await dap.send('initialize', {
    adapterID: 'aeres-python',
    pathFormat: 'path',
    linesStartAt1: true,
    columnsStartAt1: true,
    supportsVariableType: true
  })

  await dap.send('launch', { program: filePath, request: 'launch' })
  await dap.send('configurationDone')

  child.stdout.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  child.stderr.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  
  child.on('exit', (code) => {
    getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${code}]\n`)
    getMainWindow()?.webContents.send('debug:terminated')
    debugSession = null
    dap?.dispose()
    dap = null
  })

  return { session: { port, lang: 'python' } }
}

/**
 * Node.js debugging via built-in inspector (DAP over Chrome DevTools Protocol)
 * Uses --inspect-brk for breakpoint support
 */
async function launchNode(filePath, port, breakOnStart, getMainWindow) {
  const inspectPort = 9229 + Math.floor(Math.random() * 100)
  const ext = path.extname(filePath).toLowerCase()
  
  // Find project package.json recursively to identify modern web apps (Angular, Next.js, React, Vite)
  function findPackageJson(dir) {
    let current = dir
    while (true) {
      const normalized = path.normalize(current)
      const parts = normalized.split(path.sep)
      
      // Skip build, dependency, and cache folders to find the real project root
      const isDummyDir = parts.some(part => {
        const lower = part.toLowerCase()
        return lower === '.next' || lower === 'node_modules' || lower === 'dist' || lower === '.angular' || lower === 'build'
      })

      if (!isDummyDir) {
        const p = path.join(current, 'package.json')
        if (fs.existsSync(p)) {
          return { packagePath: p, dir: current }
        }
      }
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
    return null
  }

  const fileDir = path.dirname(filePath)
  const pkgInfo = findPackageJson(fileDir)
  let runProjectCommand = null
  let runProjectArgs = []
  let runProjectCwd = fileDir

  if (pkgInfo) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgInfo.packagePath, 'utf8'))
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
      runProjectCwd = pkgInfo.dir
      
      if (deps['@angular/core']) {
        runProjectCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
        runProjectArgs = ['run', 'start']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Angular Project detected in ${runProjectCwd}. Launching 'npm run start'...\n`)
      } else if (deps['next']) {
        runProjectCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
        runProjectArgs = ['run', 'dev']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Next.js Project detected in ${runProjectCwd}. Launching 'npm run dev'...\n`)
      } else if (deps['vite']) {
        runProjectCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
        runProjectArgs = ['run', 'dev']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] Vite Project detected in ${runProjectCwd}. Launching 'npm run dev'...\n`)
      } else if (deps['react-scripts']) {
        runProjectCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
        runProjectArgs = ['run', 'start']
        getMainWindow()?.webContents.send('debug:output', `[Aeres] React Project detected in ${runProjectCwd}. Launching 'npm run start'...\n`)
      }
    } catch (e) {
      console.error('[Aeres Project Detection Error]', e)
    }
  }
  
  let cmd, args, cwd
  if (runProjectCommand) {
    cmd = runProjectCommand
    args = runProjectArgs
    cwd = runProjectCwd
  } else {
    cwd = fileDir
    if (ext === '.ts' || ext === '.tsx') {
      // Use ts-node or tsx for TypeScript
      cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
      args = ['tsx', filePath]
    } else {
      cmd = 'node'
      args = [breakOnStart ? '--inspect-brk' : '--inspect', `--inspect-port=${inspectPort}`, filePath]
    }
  }

  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env },
    shell: process.platform === 'win32'
  })

  debugSession = { child, port: inspectPort, lang: 'node' }

  child.stdout.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  child.stderr.on('data', (d) => {
    const text = d.toString()
    getMainWindow()?.webContents.send('debug:output', text)
  })
  
  child.on('exit', (code) => {
    getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${code}]\n`)
    getMainWindow()?.webContents.send('debug:terminated')
    debugSession = null
  })

  return { session: { port: inspectPort, lang: 'node' } }
}

/**
 * Generic "run with output" for languages without DAP support.
 * Just runs the file and captures stdout/stderr.
 */
async function runWithOutput(filePath, lang, getMainWindow) {
  const ext = path.extname(filePath).toLowerCase()
  const name = path.basename(filePath)
  const dir = path.dirname(filePath)

  const commands = {
    'go': { cmd: 'go', args: ['run', filePath] },
    'rust': { cmd: 'rustc', args: [filePath, '-o', path.join(dir, 'output')] },
    'c': { cmd: 'gcc', args: [filePath, '-o', path.join(dir, 'output')] },
    'cpp': { cmd: 'g++', args: [filePath, '-o', path.join(dir, 'output')] },
    'java': { cmd: 'javac', args: [filePath] },
    'ruby': { cmd: 'ruby', args: [filePath] },
  }

  const config = commands[lang]
  if (!config) {
    return { error: `No run configuration for ${lang} files. Use the terminal to run manually.` }
  }

  getMainWindow()?.webContents.send('debug:output', `[Aeres] Running: ${config.cmd} ${config.args.join(' ')}\n`)

  const child = spawn(config.cmd, config.args, {
    cwd: dir,
    shell: process.platform === 'win32'
  })

  debugSession = { child, port: 0, lang }

  child.stdout.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })
  child.stderr.on('data', (d) => {
    getMainWindow()?.webContents.send('debug:output', d.toString())
  })

  child.on('exit', (code) => {
    // For compiled languages, run the output binary
    if (['rust', 'c', 'cpp'].includes(lang) && code === 0) {
      const outputPath = path.join(dir, process.platform === 'win32' ? 'output.exe' : 'output')
      getMainWindow()?.webContents.send('debug:output', `[Aeres] Compilation successful. Running binary...\n`)
      const run = spawn(outputPath, [], { cwd: dir, shell: process.platform === 'win32' })
      run.stdout.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
      run.stderr.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
      run.on('exit', (c) => {
        getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${c}]\n`)
        getMainWindow()?.webContents.send('debug:terminated')
        debugSession = null
      })
    } else if (lang === 'java' && code === 0) {
      const className = name.replace('.java', '')
      getMainWindow()?.webContents.send('debug:output', `[Aeres] Compilation successful. Running class...\n`)
      const run = spawn('java', [className], { cwd: dir, shell: process.platform === 'win32' })
      run.stdout.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
      run.stderr.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
      run.on('exit', (c) => {
        getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${c}]\n`)
        getMainWindow()?.webContents.send('debug:terminated')
        debugSession = null
      })
    } else {
      getMainWindow()?.webContents.send('debug:output', `\n[Process exited with code ${code}]\n`)
      getMainWindow()?.webContents.send('debug:terminated')
      debugSession = null
    }
  })

  return { session: { port: 0, lang } }
}

module.exports = { register }
