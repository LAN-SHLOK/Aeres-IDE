const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

/**
 * Formats code using Prettier (if available) or returns the original content.
 * Falls back gracefully when Prettier is not installed.
 */
async function formatWithPrettier(content, filePath) {
  return new Promise((resolve) => {
    // Write content to a temp file so Prettier can read it
    const ext = path.extname(filePath) || '.js'
    const tmpFile = path.join(os.tmpdir(), `aeres_fmt_${Date.now()}${ext}`)
    try {
      fs.writeFileSync(tmpFile, content, 'utf-8')
    } catch {
      return resolve({ formatted: content, error: null })
    }

    // Try to find prettier in the project's node_modules or globally
    const prettierBin = path.join(
      path.dirname(filePath),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prettier.cmd' : 'prettier'
    )
    const globalPrettier = process.platform === 'win32' ? 'prettier.cmd' : 'prettier'
    const bin = fs.existsSync(prettierBin) ? prettierBin : globalPrettier

    execFile(bin, ['--write', '--no-error-on-unmatched-pattern', tmpFile], { timeout: 10000 }, (err) => {
      try {
        if (err) {
          // Prettier not found or failed — return original
          fs.unlinkSync(tmpFile)
          return resolve({ formatted: content, error: null })
        }
        const formatted = fs.readFileSync(tmpFile, 'utf-8')
        fs.unlinkSync(tmpFile)
        resolve({ formatted, error: null })
      } catch {
        resolve({ formatted: content, error: null })
      }
    })
  })
}

/**
 * Runs ESLint on a file and returns diagnostics.
 * Falls back gracefully when ESLint is not installed.
 */
async function lintWithESLint(filePath, rootPath) {
  return new Promise((resolve) => {
    const eslintBin = path.join(
      rootPath || path.dirname(filePath),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'eslint.cmd' : 'eslint'
    )

    if (!fs.existsSync(eslintBin)) {
      return resolve({ diagnostics: [], error: null })
    }

    execFile(
      eslintBin,
      ['--format', 'json', '--no-eslintrc', filePath],
      { timeout: 15000, cwd: rootPath || path.dirname(filePath) },
      (err, stdout) => {
        try {
          const results = JSON.parse(stdout || '[]')
          const messages = results[0]?.messages || []
          const diagnostics = messages.map((m) => ({
            line: m.line,
            column: m.column,
            message: `eslint(${m.ruleId || 'unknown'}): ${m.message}`,
            severity: m.severity === 2 ? 'error' : 'warning',
          }))
          resolve({ diagnostics, error: null })
        } catch {
          resolve({ diagnostics: [], error: null })
        }
      }
    )
  })
}

function register(ipcMain) {
  ipcMain.handle('format:document', async (_, { content, filePath, language }) => {
    try {
      // Only format languages Prettier supports
      const supported = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'css', 'html', 'json', 'markdown']
      if (!supported.includes(language)) {
        return { formatted: content, error: null }
      }
      return await formatWithPrettier(content, filePath)
    } catch (err) {
      console.error('[formatterHandler] format error:', err)
      return { formatted: content, error: err.message }
    }
  })

  ipcMain.handle('lint:file', async (_, { filePath, rootPath }) => {
    try {
      return await lintWithESLint(filePath, rootPath)
    } catch (err) {
      console.error('[formatterHandler] lint error:', err)
      return { diagnostics: [], error: err.message }
    }
  })
}

module.exports = { register }
