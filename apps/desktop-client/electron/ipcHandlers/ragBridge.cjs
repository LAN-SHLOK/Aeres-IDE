const { dialog } = require('electron')
const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

const IGNORE = new Set(['node_modules', '.git', 'venv', '__pycache__', 'dist', 'release', '.aether'])

function register(ipcMain, app, getMainWindow, getBackendPort) {
  ipcMain.handle('fs:openFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (!result.canceled) {
      global.__activeRootPath = result.filePaths[0]
    }
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('fs:readFile', async (_, filePath) => fs.readFile(filePath, 'utf-8'))

  ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('fs:exists', async (_, filePath) => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:getTree', async (_, rootPath) => {
    console.log(`[Main] fs:getTree called for: ${rootPath}`)
    if (!rootPath) return []
    
    async function walk(dir, depth = 0) {
      if (depth > 8) return []
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        const items = []
        for (const entry of entries) {
          if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            try {
              const children = await walk(fullPath, depth + 1)
              items.push({
                name: entry.name,
                path: fullPath,
                type: 'dir',
                children,
              })
            } catch (e) {
              console.warn(`[Main] Failed to walk subdir ${fullPath}:`, e.message)
            }
          } else {
            const ext = path.extname(entry.name).slice(1)
            items.push({ name: entry.name, path: fullPath, type: 'file', ext })
          }
        }
        return items.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      } catch (err) {
        console.error(`[Main] fs:getTree readdir error at ${dir}:`, err.message)
        return []
      }
    }
    const result = await walk(rootPath)
    console.log(`[Main] fs:getTree returned ${result.length} top-level items`)
    return result
  })

  ipcMain.handle('rag:query', async (_, question, context) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aetherJWT || ''
    try {
      const resp = await fetch(`${base}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          question, 
          context: context || '', 
          root_path: global.__activeRootPath || '' 
        }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[ragBridge] RAG Query failed:', err.message)
      return { answer: `I encountered an error connecting to the AI core: ${err.message}`, source_url: '' }
    }
  })

  ipcMain.handle('search:inProject', async (_, { rootPath, query, caseSensitive }) => {
    if (!query) return { results: [], count: 0 }
    
    // Redirect to backend search for deep insights and better performance
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aetherJWT || ''
    
    try {
      const rpath = rootPath || global.__activeRootPath || ''
      const resp = await fetch(`${base}/api/search/?q=${encodeURIComponent(query)}&root_path=${encodeURIComponent(rpath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await resp.json()
      // Map backend {results: [{file, line, content}]} to frontend expectation {results: [{file, line, text}]}
      const mapped = (data.results || []).map(r => ({ ...r, text: r.content }))
      return { results: mapped, count: mapped.length }
    } catch (err) {
      console.error('[ragBridge] Backend search failed, falling back to local grep:', err.message)
      // Fallback to local grep if backend is down
      const escaped = String(query).replace(/"/g, '\\"')
      let cmd
      if (process.platform === 'win32') {
        cmd = `findstr /s /n ${caseSensitive ? '' : '/i'} "${escaped}" "${rootPath}\\*" 2>nul`
      } else {
        const flag = caseSensitive ? '' : '-i'
        cmd = `grep -rn ${flag} --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py" "${escaped}" "${rootPath}" 2>/dev/null | head -200`
      }
      try {
        const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024, shell: true })
        const results = stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const lastColon = line.lastIndexOf(':')
            const secondLastColon = line.lastIndexOf(':', lastColon - 1)
            if (lastColon === -1 || secondLastColon === -1) return null
            const file = line.substring(0, secondLastColon)
            const lineNum = line.substring(secondLastColon + 1, lastColon)
            const text = line.substring(lastColon + 1).trim()
            return { file, line: parseInt(lineNum, 10), text }
          })
          .filter(Boolean)
        return { results, count: results.length }
      } catch {
        return { results: [], count: 0 }
      }
    }
  })
}

module.exports = { register }
