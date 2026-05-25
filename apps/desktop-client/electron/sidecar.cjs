const { app } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const net = require('net')
const fs = require('fs')

let backendProcess = null
let backendPort = null

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      try {
        const addr = srv.address()
        const port = typeof addr === 'object' && addr ? addr.port : addr
        srv.close(() => resolve(port))
      } catch (e) {
        reject(e)
      }
    })
  })
}

function getSidecarPath() {
  if (app.isPackaged) {
    const ext = process.platform === 'win32' ? '.exe' : ''
    return path.join(process.resourcesPath, `backend${ext}`)
  }
  const venvPython =
    process.platform === 'win32'
      ? path.join(__dirname, '../../python-backend/venv/Scripts/python.exe')
      : path.join(__dirname, '../../python-backend/venv/bin/python')
  return venvPython
}

async function waitForBackend(port, maxAttempts = 120) {
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 2000)
      const resp = await fetch(`${base}/api/health`, { signal: ac.signal })
      clearTimeout(t)
      if (resp.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Backend failed to start within ~60 seconds')
}

async function startSidecar() {
  if (backendProcess && backendPort) {
    return backendPort
  }
  backendPort = await findFreePort()
  const sidecarPath = getSidecarPath()
  const backendDir = path.join(__dirname, '../../python-backend')
  const mainPy = path.join(backendDir, 'main.py')
  const args = app.isPackaged ? [] : [mainPy]
  
  // Create a clean env object that inherits from process.env
  // but doesn't force empty strings for missing Aeres-specific keys
  const env = { 
    ...process.env, 
    BACKEND_PORT: String(backendPort),
    DEBUG_SKIP_AUTH: 'True'
  }

  backendProcess = spawn(sidecarPath, args, { 
    env, 
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'] 
  })

  const logPath = path.join(app.getPath('userData'), 'backend.log')
  const logStream = fs.createWriteStream(logPath, { flags: 'a' })
  logStream.write(`\n--- ${new Date().toISOString()} ---\n`)
  backendProcess.stdout?.pipe(logStream)
  backendProcess.stderr?.pipe(logStream)

  backendProcess.on('error', (err) => console.error('[Sidecar] spawn error:', err))
  backendProcess.on('exit', (code) => {
    console.log(`[Sidecar] exited with code ${code}`)
    backendProcess = null
  })

  await waitForBackend(backendPort)
  console.log(`[Sidecar] Ready on port ${backendPort}`)
  return backendPort
}

function stopSidecar() {
  if (!backendProcess) return
  try {
    if (process.platform === 'win32') {
      backendProcess.kill()
    } else {
      backendProcess.kill('SIGTERM')
    }
  } catch (e) {
    console.warn('[Sidecar] stop:', e)
  }
  backendProcess = null
  backendPort = null
}

function getBackendPort() {
  return backendPort
}

module.exports = { startSidecar, stopSidecar, getBackendPort, findFreePort, getSidecarPath }

