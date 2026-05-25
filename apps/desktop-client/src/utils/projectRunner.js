/**
 * Project Runner Utilities
 * Detects the correct shell command to run a file or project.
 */

/**
 * Detects the run command for a single file based on its extension/language.
 * Returns a command string, 'open-browser' for HTML files, or null if unknown.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<string|null>}
 */
export async function detectFileCommand(filePath, content) {
  const lower = filePath.toLowerCase()

  if (lower.endsWith('.py')) return `python "${filePath}"`
  if (lower.endsWith('.js') && !lower.endsWith('.jsx')) return `node "${filePath}"`
  if (lower.endsWith('.ts') && !lower.endsWith('.tsx')) return `npx ts-node "${filePath}"`
  if (lower.endsWith('.go')) return `go run "${filePath}"`
  if (lower.endsWith('.rs')) return `cargo run`
  if (lower.endsWith('.rb')) return `ruby "${filePath}"`
  if (lower.endsWith('.php')) return `php "${filePath}"`
  if (lower.endsWith('.java')) {
    const className = filePath.split(/[/\\]/).pop().replace('.java', '')
    return `javac "${filePath}" && java ${className}`
  }
  if (lower.endsWith('.sh')) return `bash "${filePath}"`
  if (lower.endsWith('.ps1')) return `powershell -File "${filePath}"`
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'open-browser'
  if (lower.endsWith('.jsx') || lower.endsWith('.tsx')) return null // needs project runner

  return null
}

/**
 * Detects the project-level run command by inspecting package.json or other config files.
 * Returns the dev/start command string, or null if not detected.
 *
 * @param {string|null} rootPath
 * @returns {Promise<string|null>}
 */
export async function detectProjectCommand(rootPath) {
  if (!rootPath || !window.electron?.fs) return null

  try {
    const pkgPath = `${rootPath}${rootPath.includes('\\') ? '\\' : '/'}package.json`
    const exists = await window.electron.fs.exists(pkgPath)
    if (!exists) return null

    const raw = await window.electron.fs.readFile(pkgPath)
    const pkg = JSON.parse(raw)
    const scripts = pkg.scripts || {}

    // Prefer dev > start > serve > build
    if (scripts.dev) return 'npm run dev'
    if (scripts.start) return 'npm start'
    if (scripts.serve) return 'npm run serve'
    if (scripts.build) return 'npm run build'
  } catch {
    // package.json missing or malformed
  }

  // Check for Python project
  try {
    const mainPy = `${rootPath}${rootPath.includes('\\') ? '\\' : '/'}main.py`
    if (await window.electron.fs.exists(mainPy)) {
      return `python "${mainPy}"`
    }
  } catch { /* ignore */ }

  return null
}
