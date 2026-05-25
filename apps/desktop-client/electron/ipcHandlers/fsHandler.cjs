const { ipcMain, dialog, shell } = require('electron')
const fs = require('fs')
const path = require('path')

let activeWatcher = null
let watchPath = null

function register(ipcMain, app, getMainWindow) {
  
  ipcMain.handle('fs:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('fs:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openDirectory'],
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('fs:readFile', async (_, filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (err) {
      console.error('[fsHandler] readFile error:', err)
      return ''
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    } catch (err) {
      console.error('[fsHandler] writeFile error:', err)
      return false
    }
  })

  ipcMain.handle('fs:createFolder', async (_, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
      }
      return true
    } catch (err) {
      console.error('[fsHandler] createFolder error:', err)
      return false
    }
  })

  ipcMain.handle('fs:exists', async (_, filePath) => {
    return fs.existsSync(filePath)
  })

  ipcMain.handle('fs:getTree', async (_, rootPath) => {
    if (rootPath && watchPath !== rootPath) {
      if (activeWatcher) {
        activeWatcher.close()
      }
      watchPath = rootPath
      try {
        activeWatcher = fs.watch(rootPath, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.includes('node_modules') || filename.includes('.git') || filename.includes('venv') || filename.includes('__pycache__'))) {
            return
          }
          const win = getMainWindow()
          if (win) {
            win.webContents.send('fs:changed')
          }
        })
      } catch (err) {
        console.error('[fsHandler] watch error:', err)
      }
    }

    function buildTree(currentPath, depth = 0) {
      try {
        const stats = fs.statSync(currentPath)
        const name = path.basename(currentPath)
        
        if (stats.isDirectory()) {
          if (name === 'node_modules' || name === '.git' || name === 'venv' || name === '__pycache__') {
              return null
          }
          
          const children = fs.readdirSync(currentPath)
            .map(child => buildTree(path.join(currentPath, child), depth + 1))
            .filter(Boolean)
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name)
              return a.type === 'dir' ? -1 : 1
            })
            
          return {
            name,
            path: currentPath,
            type: 'dir',
            children
          }
        } else {
          return {
            name,
            path: currentPath,
            type: 'file',
            size: stats.size
          }
        }
      } catch (e) {
        return null
      }
    }

    try {
      // Return children of the root path as an array
      const entries = fs.readdirSync(rootPath)
      const tree = entries.map(name => buildTree(path.join(rootPath, name)))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === 'dir' ? -1 : 1
        })
      return tree
    } catch (err) {
      console.error('[fsHandler] getTree error:', err)
      return []
    }
  })
  
  ipcMain.handle('search:inProject', async (_, { rootPath, query }) => {
    const results = []
    function searchDir(currentPath) {
        try {
            const files = fs.readdirSync(currentPath)
            for (const file of files) {
                const fullPath = path.join(currentPath, file)
                const name = path.basename(fullPath)
                if (name === 'node_modules' || name === '.git' || name === 'venv' || name === '.aeres') continue
                
                const stats = fs.statSync(fullPath)
                if (stats.isDirectory()) {
                    searchDir(fullPath)
                } else {
                    if (/\.(js|jsx|ts|tsx|py|css|html|json|md)$/.test(name)) {
                        const content = fs.readFileSync(fullPath, 'utf-8')
                        const lines = content.split('\n')
                        lines.forEach((line, i) => {
                            if (line.toLowerCase().includes(query.toLowerCase())) {
                                results.push({
                                    file: fullPath,
                                    line: i + 1,
                                    text: line.trim()
                                })
                            }
                        })
                    }
                }
                if (results.length > 100) break
            }
        } catch (e) {}
    }
    try {
        if (!rootPath) return []
        searchDir(rootPath)
        return { results, count: results.length }
    } catch (err) {
        return { results: [], count: 0 }
    }
  })

  ipcMain.handle('fs:reveal', async (_, filePath) => {
    try {
      shell.showItemInFolder(filePath)
      return true
    } catch (err) {
      console.error('[fsHandler] reveal error:', err)
      return false
    }
  })

  ipcMain.handle('fs:delete', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true })
      }
      return true
    } catch (err) {
      console.error('[fsHandler] delete error:', err)
      return false
    }
  })

  ipcMain.handle('fs:rename', async (_, oldPath, newPath) => {
    try {
      fs.renameSync(oldPath, newPath)
      return true
    } catch (err) {
      console.error('[fsHandler] rename error:', err)
      return false
    }
  })

  ipcMain.handle('fs:openExternal', async (_, url) => {
    try {
      await shell.openExternal(url)
      return true
    } catch (err) {
      console.error('[fsHandler] openExternal error:', err)
      return false
    }
  })
}

module.exports = { register }
