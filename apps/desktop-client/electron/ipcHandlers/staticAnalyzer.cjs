const http = require('http')
const https = require('https')

function register(ipcMain, app, getMainWindow, getBackendPort) {
  ipcMain.handle('analyze:modernize', async (_, content, filePath) => {
    const port = getBackendPort()
    if (!port) throw new Error('Backend not ready')

    const token = global.__aetherJWT || ''
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
            // Process SSE events
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || '' // keep incomplete line
            for (const line of lines) {
              const match = line.match(/^data:\s*(.+)$/m)
              if (match) {
                try {
                  const data = JSON.parse(match[1])
                  const mainWindow = getMainWindow()
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('analyze:stream', data)
                  }
                } catch {
                  /* ignore parse errors */
                }
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
    const port = getBackendPort()
    if (!port) throw new Error('Backend not ready')

    const token = global.__aetherJWT || ''
    const body = JSON.stringify({ file_paths: filePaths })

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/analyze/scan-project',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch {
              resolve({ total: 0, issues: [] })
            }
          })
          res.on('error', reject)
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  })
}

module.exports = { register }
