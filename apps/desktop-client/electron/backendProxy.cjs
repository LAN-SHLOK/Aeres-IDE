const { getBackendPort } = require('./sidecar.cjs')

async function request(path, options = {}) {
  const port = getBackendPort()
  if (!port) {
    throw new Error('Backend sidecar is not initialized or failed to start.')
  }

  const base = `http://127.0.0.1:${port}`
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`
  
  const token = global.__aeresJWT || ''
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }

  const resp = await fetch(url, {
    ...options,
    headers
  })

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => 'Unknown error')
    throw new Error(`Backend Error (${resp.status}): ${errorBody}`)
  }

  return await resp.json()
}

module.exports = { request }
