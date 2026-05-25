const { ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const backendProxy = require('../backendProxy.cjs')

function register(ipcMain, app, getMainWindow, getBackendPort) {
  
  ipcMain.handle('contract:observe', async (_, body) => {
    try {
      return await backendProxy.request('/api/contracts/observe', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('contract:generate', async (_, body) => {
    try {
      return await backendProxy.request('/api/contracts/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('contract:getSummary', async (_, { filePath }) => {
    try {
      return await backendProxy.request(`/api/contracts/summary?file_path=${encodeURIComponent(filePath)}`)
    } catch (err) {
      return []
    }
  })

  ipcMain.handle('contract:runWithTracing', async (_, { filePath }) => {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
    const tracerPath = path.join(__dirname, '../../python-backend/app/agents/python_contract_tracer.py')
    const port = getBackendPort()
    
    const child = spawn(pythonPath, [tracerPath, filePath], {
        cwd: path.dirname(filePath),
        env: { 
            ...process.env, 
            AERES_BACKEND_URL: `http://127.0.0.1:${port}`,
            AERES_FILE_PATH: filePath
        }
    })

    child.stdout.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
    child.stderr.on('data', (d) => getMainWindow()?.webContents.send('debug:output', d.toString()))
    
    return { success: true }
  })
}

module.exports = { register }
