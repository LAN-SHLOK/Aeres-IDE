const { shell, safeStorage } = require('electron')
const fs = require('fs')
const path = require('path')

let __encryptedJWT = null
global.__aeresEmail = null
global.__aeresJWT = null

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

function getAuthFile(app) {
    return path.join(app.getPath('userData'), 'aeres_auth.json')
}

function saveAuth(app, token, email) {
  try {
    const encrypted = safeStorage.isEncryptionAvailable() 
      ? safeStorage.encryptString(token).toString('base64')
      : Buffer.from(token).toString('base64')
    fs.writeFileSync(getAuthFile(app), JSON.stringify({ jwt: encrypted, email }))
  } catch (err) {
    console.error('[Auth] Save error:', err)
  }
}

function loadAuth(app) {
  try {
    const file = getAuthFile(app)
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const buf = Buffer.from(data.jwt, 'base64')
      const token = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(buf)
        : buf.toString('utf-8')
      
      global.__aeresJWT = token
      global.__aeresEmail = data.email
      __encryptedJWT = buf
      return true
    }
  } catch (err) {
    console.error('[Auth] Load error:', err)
  }
  return false
}

function register(ipcMain, app, getMainWindow) {
  loadAuth(app)

  ipcMain.handle('auth:getStatus', () => {
    if (!global.__aeresJWT) return { authenticated: false, email: null }
    try {
      const payload = decodePayload(global.__aeresJWT)
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        return { authenticated: false, email: null, expired: true }
      }
      return { authenticated: true, email: global.__aeresEmail }
    } catch {
      return { authenticated: false, email: null }
    }
  })

  ipcMain.handle('auth:getToken', () => {
    return global.__aeresJWT
  })

  ipcMain.handle('auth:logout', () => {
    __encryptedJWT = null
    global.__aeresEmail = null
    global.__aeresJWT = null
    try {
        const file = getAuthFile(app)
        if (fs.existsSync(file)) fs.unlinkSync(file)
    } catch {}
    clearTimeout(refreshTimer)
    refreshTimer = null
    return true
  })

  ipcMain.handle('auth:openBrowser', async (_, source = 'ide') => {
    const webUrl = (process.env.WEB_PORTAL_URL || 'http://localhost:5173').replace(/\/$/, '')
    await shell.openExternal(`${webUrl}/auth?source=${encodeURIComponent(source)}`)
  })
}

function handleDeepLink(url, mainWindow, app) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'aeres:') return
    if (parsed.hostname !== 'auth') return
    const token = parsed.searchParams.get('token')
    const email = parsed.searchParams.get('email') || ''
    if (!token) return

    if (safeStorage.isEncryptionAvailable()) {
      __encryptedJWT = safeStorage.encryptString(token)
    } else {
      __encryptedJWT = Buffer.from(token) 
    }
    
    global.__aeresEmail = email
    global.__aeresJWT = token
    saveAuth(app, token, email)
    scheduleRefresh(token, mainWindow)

    mainWindow?.webContents.send('auth:success', { email })
    mainWindow?.focus()
    console.log(`[Auth] Authenticated: ${email}`)
  } catch (err) {
    console.error('[Auth] Deep link error:', err)
  }
}

module.exports = { register, handleDeepLink }
