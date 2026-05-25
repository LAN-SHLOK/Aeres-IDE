const { request } = require('../backendProxy.cjs')

function register(ipcMain) {
  ipcMain.handle('radar:scan', async (_, { rootPath }) => {
    try {
      return await request('/api/deps/scan', {
        method: 'POST',
        body: JSON.stringify({ root_path: rootPath }),
      })
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('radar:getCached', async (_, { rootPath }) => {
    try {
      return await request(`/api/deps/cached?root_path=${encodeURIComponent(rootPath)}`)
    } catch (err) {
      return null
    }
  })
}

module.exports = { register }
