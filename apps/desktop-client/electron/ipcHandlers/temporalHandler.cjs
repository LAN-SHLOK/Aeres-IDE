const { ipcMain } = require('electron')

// For Node.js/JavaScript: hook into CDP (Chrome DevTools Protocol)
// The debug session already opens a CDP connection — extend it
// For Python: parse cProfile output after each run

const timingStore = new Map()  // filePath → { functionName → [durations] }

function register(ipcMain, app, getMainWindow) {

  // Called by debugHandler after each run completes with timing data
  ipcMain.handle('temporal:ingest', (_, { filePath, timings }) => {
    // timings = [{ functionName, line, durationMs, callCount }]
    const existing = timingStore.get(filePath) || []
    const merged = mergTimings(existing, timings)
    timingStore.set(filePath, merged)
    // Push to renderer to update decorations
    getMainWindow()?.webContents.send('temporal:update', { filePath, timings: merged })
    return { stored: merged.length }
  })

  ipcMain.handle('temporal:getFile', (_, { filePath }) => {
    return timingStore.get(filePath) || []
  })

  ipcMain.handle('temporal:clearFile', (_, { filePath }) => {
    timingStore.delete(filePath)
    return true
  })

  // Hook Python cProfile — inject profiling wrapper around user script
  ipcMain.handle('temporal:wrapPython', (_, { scriptPath }) => {
    // Returns a wrapper script that runs cProfile and outputs JSON timing data
    return `
import cProfile, pstats, json, io, sys, os
pr = cProfile.Profile()
pr.enable()
try:
    with open(r"${scriptPath}", 'rb') as f:
        code = compile(f.read(), r"${scriptPath}", 'exec')
        exec(code, {'__name__': '__main__', '__file__': r"${scriptPath}"})
except Exception as e:
    print(f"Error executing script: {e}", file=sys.stderr)
finally:
    pr.disable()
    s = io.StringIO()
    ps = pstats.Stats(pr, stream=s)
    ps.sort_stats('cumulative')
    data = []
    # stats is {(file, line, name): (cc, nc, tt, ct, callers)}
    for func, (cc, nc, tt, ct, callers) in pr.getstats():
        if isinstance(func, tuple) and func[0] == r"${scriptPath}":
            data.append({"file": func[0], "line": func[1], "name": func[2], "durationMs": round(ct*1000, 2), "calls": cc})
    print("AETHER_TIMING:" + json.dumps(data))
`
  })
}

function mergTimings(existing, newTimings) {
  const map = {}
  for (const t of existing) map[`${t.line}:${t.name || t.functionName}`] = t
  for (const t of newTimings) {
    const key = `${t.line}:${t.name || t.functionName}`
    if (map[key]) {
      const history = [...(map[key].history || [map[key].durationMs]), t.durationMs].slice(-20)
      map[key] = {
        ...t,
        history,
        durationMs: Number((history.reduce((a, b) => a + b, 0) / history.length).toFixed(2)),
        calls: (map[key].calls || 0) + (t.calls || 1)
      }
    } else {
      map[key] = { ...t, history: [t.durationMs] }
    }
  }
  return Object.values(map)
}

module.exports = { register }
