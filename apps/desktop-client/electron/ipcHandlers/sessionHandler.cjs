const { ipcMain, app } = require('electron')
const fs = require('fs').promises
const path = require('path')

function getSessionsDir() {
  return path.join(app.getPath('userData'), 'aeres-sessions')
}

async function ensureDir() {
  try {
    await fs.mkdir(getSessionsDir(), { recursive: true })
  } catch (err) {}
}

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle('sessions:save', async (event, { name, state }) => {
    await ensureDir()
    const id = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    const session = {
      id, name,
      savedAt: new Date().toISOString(),
      state: {
        // Editor state
        tabs: state.tabs,           // [{ path, name, language, content, isDirty }]
        activeTabId: state.activeTabId,
        // Workspace
        rootPath: state.rootPath,
        // Layout
        sidebarWidth: state.sidebarWidth,
        rightPanelWidth: state.rightPanelWidth,
        terminalPanelHeight: state.terminalPanelHeight,
        activeSidebarTab: state.activeSidebarTab,
        activeRightTab: state.activeRightTab,
        // Git
        branch: state.gitStatus?.branch,
        // AI
        chatMessages: state.chatMessages,
      }
    }
    await fs.writeFile(path.join(getSessionsDir(), `${id}.json`), JSON.stringify(session, null, 2))
    return { id, name, savedAt: session.savedAt }
  })

  ipcMain.handle('sessions:list', async () => {
    await ensureDir()
    try {
      const files = await fs.readdir(getSessionsDir())
      const sessions = []
      for (const f of files.filter(f => f.endsWith('.json'))) {
        try {
          const raw = await fs.readFile(path.join(getSessionsDir(), f), 'utf-8')
          const s = JSON.parse(raw)
          sessions.push({ id: s.id, name: s.name, savedAt: s.savedAt, rootPath: s.state.rootPath })
        } catch {}
      }
      return sessions.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    } catch (err) {
      return []
    }
  })

  ipcMain.handle('sessions:load', async (event, { id }) => {
    const filePath = path.join(getSessionsDir(), `${id}.json`)
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw).state
  })

  ipcMain.handle('sessions:delete', async (event, { id }) => {
    try {
      await fs.unlink(path.join(getSessionsDir(), `${id}.json`))
      return true
    } catch (err) { return false }
  })

  ipcMain.handle('sessions:rename', async (event, { id, newName }) => {
    const filePath = path.join(getSessionsDir(), `${id}.json`)
    const raw = await fs.readFile(filePath, 'utf-8')
    const session = JSON.parse(raw)
    session.name = newName
    await fs.writeFile(filePath, JSON.stringify(session, null, 2))
    return true
  })
}

module.exports = { register }
