const { shell, safeStorage } = require('electron')

let __encryptedJWT = null
global.__aetherEmail = null

let refreshTimer = null

function decodePayload(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function scheduleRefresh(token, mainWindow) {
  const payload = decodePayload(token)
  if (!payload?.exp) return
  const expiresIn = payload.exp * 1000 - Date.now()
  const refreshIn = Math.max(expiresIn - 60_000, 5_000)
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    mainWindow?.webContents.send('auth:refresh_needed')
  }, refreshIn)
}

function register(ipcMain) {
  ipcMain.handle('auth:getStatus', () => {
    if (!__encryptedJWT) return { authenticated: false, email: null }
    try {
      const token = safeStorage.decryptString(__encryptedJWT)
      const payload = decodePayload(token)
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        return { authenticated: false, email: null, expired: true }
      }
      return { authenticated: true, email: global.__aetherEmail }
    } catch {
      return { authenticated: false, email: null }
    }
  })

  ipcMain.handle('auth:getToken', () => {
    if (!__encryptedJWT) return null
    try {
      return safeStorage.decryptString(__encryptedJWT)
    } catch {
      return null
    }
  })

  ipcMain.handle('auth:logout', () => {
    __encryptedJWT = null
    global.__aetherEmail = null
    clearTimeout(refreshTimer)
    refreshTimer = null
    return true
  })

  ipcMain.handle('auth:openBrowser', async (_, source = 'ide') => {
    const webUrl = (process.env.WEB_PORTAL_URL || 'http://localhost:5173').replace(/\/$/, '')
    await shell.openExternal(`${webUrl}/auth?source=${encodeURIComponent(source)}`)
  })
}

function handleDeepLink(url, mainWindow) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'aether:') return
    if (parsed.hostname !== 'auth') return
    const token = parsed.searchParams.get('token')
    const email = parsed.searchParams.get('email') || ''
    if (!token) return

    if (safeStorage.isEncryptionAvailable()) {
      __encryptedJWT = safeStorage.encryptString(token)
    } else {
      // Fallback for environments where encryption is not available (rare in Electron desktop)
      __encryptedJWT = Buffer.from(token) 
    }
    
    global.__aetherEmail = email
    scheduleRefresh(token, mainWindow)

    mainWindow?.webContents.send('auth:success', { email })
    mainWindow?.focus()
    console.log(`[Auth] Authenticated: ${email}`)
  } catch (err) {
    console.error('[Auth] Deep link error:', err)
  }
}

module.exports = { register, handleDeepLink }
