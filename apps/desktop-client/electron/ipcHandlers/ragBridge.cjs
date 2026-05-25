const { dialog, shell } = require('electron')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

function register(ipcMain, app, getMainWindow, getBackendPort) {
  let currentAbortController = null

  // ── Interrupt Active RAG/Agent Request ──────────────
  ipcMain.handle('rag:interrupt', async () => {
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
      return { success: true }
    }
    return { success: false, error: 'No active request to interrupt' }
  })

  ipcMain.handle('rag:openUrl', async (_, url) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── RAG Query (existing) ───────────────────────────
  ipcMain.handle('rag:query', async (_, question, context) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    
    if (currentAbortController) currentAbortController.abort()
    currentAbortController = new AbortController()

    try {
      const resp = await fetch(`${base}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          question, 
          context: context || '', 
          root_path: global.__activeRootPath || '' 
        }),
        signal: currentAbortController.signal
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      const data = await resp.json()
      currentAbortController = null
      return data
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[ragBridge] RAG Query aborted')
        return { answer: 'Request interrupted.', interrupted: true }
      }
      console.error('[ragBridge] RAG Query failed:', err.message)
      currentAbortController = null
      return { answer: `I encountered an error connecting to the AI core: ${err.message}`, source_url: '' }
    }
  })

  // ── RAG Ingest (existing) ──────────────────────────
  ipcMain.handle('rag:ingest', async (_, url, name) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    try {
      const resp = await fetch(`${base}/api/rag/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url, name }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[ragBridge] Ingest failed:', err.message)
      return { error: err.message }
    }
  })

  // ── Agent Edit (simple, existing) ──────────────────
  ipcMain.handle('rag:agentEdit', async (_, { instruction, filePath, fileContent }) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    try {
      const resp = await fetch(`${base}/api/rag/agent-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          instruction,
          file_path: filePath,
          file_content: fileContent,
          root_path: global.__activeRootPath || '' 
        }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[ragBridge] Agent Edit failed:', err.message)
      return { action: 'error', explanation: err.message }
    }
  })

  // ── Agent Stream (NEW — Full Agentic System) ───────
  ipcMain.handle('rag:agentStream', async (_, opts) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    const win = getMainWindow()

    if (currentAbortController) currentAbortController.abort()
    currentAbortController = new AbortController()

    try {
      const resp = await fetch(`${base}/api/rag/agent-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          instruction: opts.instruction,
          context: opts.context || '',
          file_path: opts.filePath || '',
          root_path: opts.rootPath || global.__activeRootPath || '',
          conversation: opts.conversation || [],
          images: opts.images || [],
        }),
        signal: currentAbortController.signal
      })

      if (!resp.ok) {
        win?.webContents.send('rag:agent-step', {
          type: 'error', content: `Backend returned ${resp.status}`
        })
        currentAbortController = null
        return { error: `Backend returned ${resp.status}` }
      }

      // Parse SSE stream
      const reader = resp.body
      const decoder = new TextDecoder()
      let buffer = ''

      for await (const chunk of reader) {
        buffer += decoder.decode(chunk, { stream: true })
        
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              win?.webContents.send('rag:agent-step', { type: 'done' })
              currentAbortController = null
              return { success: true }
            }
            try {
              const step = JSON.parse(data)
              
              // Handle file write/edit tools — execute on Electron side
              if (step.type === 'needs_confirm') {
                // Send to frontend for user confirmation
                win?.webContents.send('rag:agent-step', step)
              } else {
                win?.webContents.send('rag:agent-step', step)
              }
            } catch (e) {
              console.warn('[ragBridge] SSE parse error:', e.message)
            }
          }
        }
      }

      currentAbortController = null
      return { success: true }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[ragBridge] Agent Stream aborted')
        win?.webContents.send('rag:agent-step', {
          type: 'error', content: 'Agent execution interrupted.'
        })
        return { success: false, interrupted: true }
      }
      console.error('[ragBridge] Agent Stream failed:', err.message)
      win?.webContents.send('rag:agent-step', {
        type: 'error', content: err.message
      })
      currentAbortController = null
      return { error: err.message }
    }
  })

  // ── Agent Tool Execution (file write/edit with user confirmation) ──
  ipcMain.handle('rag:applyAgentEdit', async (_, { tool, args }) => {
    try {
      if (tool === 'write_file') {
        const fp = args.file_path
        const dir = path.dirname(fp)
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(fp, args.content, 'utf-8')
        return { success: true, path: fp }
      }
      
      if (tool === 'edit_file') {
        const fp = args.file_path
        const content = await fs.readFile(fp, 'utf-8')
        if (!content.includes(args.find)) {
          return { success: false, error: 'Could not find the target text in file' }
        }
        const newContent = content.replace(args.find, args.replace)
        await fs.writeFile(fp, newContent, 'utf-8')
        return { success: true, path: fp }
      }
      
      if (tool === 'multi_edit_file') {
        const fp = args.file_path
        let content = await fs.readFile(fp, 'utf-8')
        let errors = []
        for (const edit of args.edits) {
          if (!content.includes(edit.find)) {
            errors.push(`Could not find target text: ${edit.find.substring(0, 20)}...`)
            continue
          }
          content = content.replace(edit.find, edit.replace)
        }
        if (errors.length === args.edits.length) {
          return { success: false, error: 'All edits failed: ' + errors.join(', ') }
        }
        await fs.writeFile(fp, content, 'utf-8')
        return { success: true, path: fp, error: errors.length ? `Partial success. Errors: ${errors.join(', ')}` : undefined }
      }
      
      return { success: false, error: 'Unknown tool' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Agent Terminal Execution ──
  ipcMain.handle('rag:runCommand', async (_, { command, cwd }) => {
    try {
      const result = await execAsync(command, {
        cwd: cwd || global.__activeRootPath || process.cwd(),
        timeout: 30000,
        encoding: 'utf-8',
      })
      return {
        stdout: (result.stdout || '').slice(0, 5000),
        stderr: (result.stderr || '').slice(0, 2000),
        exitCode: 0
      }
    } catch (err) {
      return {
        stdout: (err.stdout || '').slice(0, 5000),
        stderr: (err.stderr || '').slice(0, 2000),
        exitCode: err.code || 1
      }
    }
  })

  // ── RAG Autocomplete (Ghost Text) ──
  ipcMain.handle('rag:autocomplete', async (_, { prefix, suffix, language, filePath }) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    try {
      const resp = await fetch(`${base}/api/rag/autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prefix,
          suffix,
          language: language || 'javascript',
          file_path: filePath || ''
        }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[ragBridge] Autocomplete failed:', err.message)
      return { suggestion: '' }
    }
  })
}

module.exports = { register }
