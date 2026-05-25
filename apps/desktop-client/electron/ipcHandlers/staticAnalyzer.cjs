const { request } = require('../backendProxy.cjs')
const http = require('http')
const fs = require('fs')
const path = require('path')

function findProjectRoot(filePath) {
  let dir = path.dirname(filePath)
  while (dir) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.dirname(filePath)
}

function logDeprecation(filePath, flag) {
  try {
    const projectRoot = findProjectRoot(filePath)
    const logPath = path.join(projectRoot, '.aeres_deprecation_log.json')
    
    let logs = []
    if (fs.existsSync(logPath)) {
      try {
        const fileContent = fs.readFileSync(logPath, 'utf8')
        logs = JSON.parse(fileContent)
      } catch (err) {
        console.error('Error parsing existing deprecation logs:', err)
      }
    }
    
    // Check for duplicates in the current session/run to keep it clean
    const isDup = logs.some(
      (l) => l.filePath === path.relative(projectRoot, filePath).replace(/\\/g, '/') &&
             l.functionName === (flag.function_name || '')
    )
    if (isDup) return

    logs.push({
      timestamp: new Date().toISOString(),
      filePath: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
      functionName: flag.function_name || '',
      severity: flag.severity || 'medium',
      sinceVersion: flag.since_version || '',
      replacement: flag.replacement || '',
      status: 'modernized'
    })
    
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8')
  } catch (err) {
    console.error('Error writing deprecation log:', err)
  }
}

function register(ipcMain, app, getMainWindow, getBackendPort) {
  ipcMain.handle('analyze:modernize', async (_, content, filePath) => {
    const port = getBackendPort()
    if (!port) throw new Error('Backend not ready')

    const token = global.__aeresJWT || ''
    const body = JSON.stringify({ content, path: filePath })

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/analyze/modernize',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let buffer = ''
          res.on('data', (chunk) => {
            buffer += chunk.toString()
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              const match = line.match(/^data:\s*(.+)$/m)
              if (match) {
                try {
                  const data = JSON.parse(match[1])
                  if (data && data.type === 'flag_found' && data.flag) {
                    logDeprecation(filePath, data.flag)
                  }

                  const mainWindow = getMainWindow()
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('analyze:stream', data)
                  }
                } catch {}
              }
            }
          })
          res.on('end', () => resolve({ success: true }))
          res.on('error', reject)
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  })

  ipcMain.handle('analyze:scanProject', async (_, filePaths) => {
    try {
      return await request('/api/analyze/scan-project', {
        method: 'POST',
        body: JSON.stringify({ file_paths: filePaths })
      })
    } catch {
      return { total: 0, issues: [] }
    }
  })

  ipcMain.handle('analyze:mutationResults', async (_, filePath) => {
    try {
      return await request(`/api/mutations/results?file_path=${encodeURIComponent(filePath)}`)
    } catch {
      return { results: [], isRunning: false }
    }
  })

  ipcMain.handle('analyze:runMutation', async (_, opts) => {
    try {
      return await request('/api/mutations/run', {
        method: 'POST',
        body: JSON.stringify(opts)
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('analyze:scanDeps', async (_, rootPath) => {
    try {
      return await request('/api/deps/scan', {
        method: 'POST',
        body: JSON.stringify({ root_path: rootPath })
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('analyze:contractSummary', async (_, filePath) => {
    try {
      return await request(`/api/contracts/summary?file_path=${encodeURIComponent(filePath)}`)
    } catch {
      return []
    }
  })

  ipcMain.handle('analyze:contractGenerate', async (_, opts) => {
    try {
      return await request('/api/contracts/generate', {
        method: 'POST',
        body: JSON.stringify(opts)
      })
    } catch (err) {
      return { error: err.message }
    }
  })
}

module.exports = { register }
