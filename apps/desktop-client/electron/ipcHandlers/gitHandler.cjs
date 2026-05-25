const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

let cachedGitPath = null;

async function findGit() {
  if (cachedGitPath) return cachedGitPath;
  const commonGitPaths = ['git', 'C:\\Program Files\\Git\\bin\\git.exe', 'C:\\Program Files\\Git\\cmd\\git.exe', 'C:\\Program Files (x86)\\Git\\bin\\git.exe', 'C:\\Program Files (x86)\\Git\\cmd\\git.exe'];
  for (const p of commonGitPaths) {
    try { await execAsync(`"${p}" --version`); cachedGitPath = p; return p; } catch {}
  }
  try {
    const { stdout } = await execAsync('where git');
    const first = stdout.split('\r\n')[0].trim();
    if (first) { cachedGitPath = first; return first; }
  } catch {}
  cachedGitPath = 'git';
  return 'git';
}

async function runGit(args, cwd) {
  const gitPath = await findGit();
  try {
    const { stdout } = await execAsync(`"${gitPath}" ${args}`, {
      cwd, maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return stdout;
  } catch (err) {
    if (!err.message.includes('not a git repository')) {
      console.error(`[Git] Error:`, err.message);
    }
    throw err;
  }
}

function register(ipcMain, app, getMainWindow, getBackendPort) {
  ipcMain.handle('git:init', async (_, { rootPath }) => {
    try {
      await runGit('init', rootPath)
      return { success: true }
    } catch (err) {
      console.error('[gitHandler] Init error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:status', async (_, { rootPath }) => {
    try {
      const output = await runGit('status --porcelain --branch', rootPath)
      const lines = output.trim().split('\n')
      let branch = 'unknown'
      const files = []

      for (const line of lines) {
        if (line.startsWith('## ')) {
          const branchPart = line.slice(3)
          if (branchPart.includes('...')) {
            branch = branchPart.split('...')[0]
          } else {
            branch = branchPart.trim()
          }
        } else if (line.length >= 3) {
          const x = line[0]
          const y = line[1]
          let filePath = line.slice(3)
          if (filePath.includes(' -> ')) filePath = filePath.split(' -> ').pop()
          files.push({ x, y, path: filePath.trim() })
        }
      }
      return { branch, files }
    } catch {
      return { branch: 'unknown', files: [] }
    }
  })

  ipcMain.handle('git:diff', async (_, { rootPath, filePath, staged }) => {
    try {
      const flag = staged ? '--cached' : ''
      const fp = filePath ? `-- "${filePath}"` : ''
      return await runGit(`diff ${flag} ${fp}`, rootPath)
    } catch {
      return ''
    }
  })

  ipcMain.handle('git:stage', async (_, { rootPath, filePaths }) => {
    const paths = filePaths.map((p) => `"${p}"`).join(' ')
    await runGit(`add ${paths}`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:unstage', async (_, { rootPath, filePaths }) => {
    const paths = filePaths.map((p) => `"${p}"`).join(' ')
    await runGit(`restore --staged ${paths}`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:discardChanges', async (_, { rootPath, filePath }) => {
    await runGit(`restore "${filePath}"`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:commit', async (_, { rootPath, message, amend }) => {
    try {
      const amendFlag = amend ? '--amend' : ''
      const msg = message.replace(/"/g, '\\"')
      await runGit(`commit -m "${msg}" ${amendFlag}`, rootPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:push', async (_, { rootPath, force, auth }) => {
    try {
      const forceFlag = force ? '--force' : ''
      let remoteUrl = ''
      if (auth && auth.username && auth.token) {
        try {
          const rawUrl = await runGit('remote get-url origin', rootPath)
          const cleanUrl = rawUrl.trim()
          if (cleanUrl.startsWith('https://')) {
            remoteUrl = cleanUrl.replace('https://', `https://${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.token)}@`)
          }
        } catch {}
      }

      if (remoteUrl) {
        await runGit(`push ${forceFlag} "${remoteUrl}"`, rootPath)
      } else {
        await runGit(`push ${forceFlag}`, rootPath)
      }
      return { success: true }
    } catch (err) {
      if (err.message.includes('has no upstream branch') || err.message.includes('set-upstream') || err.message.includes('current branch')) {
        try {
          const branchOut = await runGit('branch --show-current', rootPath);
          const currentBranch = branchOut.trim();
          if (currentBranch) {
            const forceFlag = force ? '--force' : '';
            let remoteUrl = ''
            if (auth && auth.username && auth.token) {
              try {
                const rawUrl = await runGit('remote get-url origin', rootPath)
                const cleanUrl = rawUrl.trim()
                if (cleanUrl.startsWith('https://')) {
                  remoteUrl = cleanUrl.replace('https://', `https://${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.token)}@`)
                }
              } catch {}
            }
            if (remoteUrl) {
              await runGit(`push -u "${remoteUrl}" "${currentBranch}" ${forceFlag}`, rootPath);
            } else {
              await runGit(`push -u origin "${currentBranch}" ${forceFlag}`, rootPath);
            }
            return { success: true };
          }
        } catch (retryErr) {
          return { success: false, error: retryErr.message };
        }
      }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:pull', async (_, { rootPath, auth }) => {
    try {
      let remoteUrl = ''
      if (auth && auth.username && auth.token) {
        try {
          const rawUrl = await runGit('remote get-url origin', rootPath)
          const cleanUrl = rawUrl.trim()
          if (cleanUrl.startsWith('https://')) {
            remoteUrl = cleanUrl.replace('https://', `https://${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.token)}@`)
          }
        } catch {}
      }

      if (remoteUrl) {
        await runGit(`pull --rebase "${remoteUrl}"`, rootPath)
      } else {
        await runGit(`pull --rebase`, rootPath)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:fetch', async (_, { rootPath }) => {
    try {
      await runGit('fetch --all', rootPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:branches', async (_, { rootPath }) => {
    try {
      const output = await runGit('branch -a', rootPath)
      const lines = output.trim().split('\n').filter(Boolean)
      let current = ''
      const local = new Set()
      for (const line of lines) {
        let name = line.replace(/^\*?\s*/, '').trim()
        if (line.startsWith('*')) {
          current = name
        }
        if (name.startsWith('remotes/')) {
          name = name.replace(/^remotes\/[^/]+\//, '')
        }
        if (name && !name.includes('HEAD')) {
          local.add(name)
        }
      }
      return { current, local: Array.from(local) }
    } catch {
      return { current: '', local: [] }
    }
  })

  ipcMain.handle('git:createBranch', async (_, { rootPath, name, checkout }) => {
    if (checkout) {
      await runGit(`checkout -b "${name}"`, rootPath)
    } else {
      await runGit(`branch "${name}"`, rootPath)
    }
    return { success: true }
  })

  ipcMain.handle('git:switchBranch', async (_, { rootPath, name }) => {
    await runGit(`checkout "${name}"`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:deleteBranch', async (_, { rootPath, name, force }) => {
    const flag = force ? '-D' : '-d'
    await runGit(`branch ${flag} "${name}"`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:log', async (_, { rootPath, limit = 50 }) => {
    try {
      const output = await runGit(
        `log --oneline --format="%H|||%an|||%aI|||%s" -n ${limit}`,
        rootPath
      )
      return output.trim().split('\n').filter(Boolean).map((line) => {
        const [hash, author, timestamp, ...rest] = line.split('|||')
        return {
          hash: (hash || '').slice(0, 7),
          author: author || '',
          timestamp: timestamp || '',
          subject: rest.join('|||') || '',
        }
      })
    } catch {
      return []
    }
  })

  ipcMain.handle('git:blame', async (_, { rootPath, filePath }) => {
    try {
      const output = await runGit(`blame --porcelain "${filePath}"`, rootPath)
      const blocks = []
      let current = {}
      for (const line of output.split('\n')) {
        if (/^[0-9a-f]{40}/.test(line)) {
          if (current.hash) blocks.push(current)
          current = { hash: line.slice(0, 7), content: '' }
        } else if (line.startsWith('author ')) {
          current.author = line.slice(7)
        } else if (line.startsWith('summary ')) {
          current.summary = line.slice(8)
        } else if (line.startsWith('\t')) {
          current.content = line.slice(1)
        }
      }
      if (current.hash) blocks.push(current)
      return blocks
    } catch {
      return []
    }
  })

  ipcMain.handle('git:stash', async (_, { rootPath, message }) => {
    const msg = message ? `push -m "${message.replace(/"/g, '\\"')}"` : 'push'
    await runGit(`stash ${msg}`, rootPath)
    return { success: true }
  })

  ipcMain.handle('git:stashPop', async (_, { rootPath }) => {
    await runGit('stash pop', rootPath)
    return { success: true }
  })

  ipcMain.handle('git:causal-chain', async (_, { repoPath, filePath, functionName, errorMessage }) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    try {
      const resp = await fetch(`${base}/api/git/causal-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repo_path: repoPath, file_path: filePath, function_name: functionName, error_message: errorMessage }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[gitHandler] Causal chain failed:', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('git:generate-commit', async (_, { diff }) => {
    const port = getBackendPort && getBackendPort()
    const base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:8008'
    const token = global.__aeresJWT || ''
    try {
      const resp = await fetch(`${base}/api/git/generate-commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ diff }),
      })
      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      return await resp.json()
    } catch (err) {
      console.error('[gitHandler] Generate commit failed:', err.message)
      return { error: err.message }
    }
  })
}

module.exports = { register }
