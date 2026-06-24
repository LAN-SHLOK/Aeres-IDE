import { useEffect, useRef } from 'react'

// Registers Monaco decoration provider that shows timing inline
export default function useTemporalLens(editor, filePath, enabled) {
  const decorationsRef = useRef([])

  function colorForMs(ms) {
    if (ms < 100) return '#1D9E75'   // green
    if (ms < 1000) return '#BA7517'  // amber
    return '#E24B4A'                  // red
  }

  function labelForMs(ms) {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  useEffect(() => {
    if (!editor || !filePath || !enabled) {
      if (editor) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      }
      return
    }

    const electron = window.electron
    const monaco = window.monaco

    // Load existing timings for this file
    electron.temporal.getFile(filePath).then(timings => {
      applyDecorations(timings || [])
    })

    // Listen for live updates as new runs complete
    const off = electron.temporal.onUpdate(filePath, (timings) => {
      applyDecorations(timings || [])
    })

    function sparkline(data) {
      if (!data || data.length === 0) return '';
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min;
      const chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      return data.map(v => {
        if (range === 0) return chars[3];
        const idx = Math.floor(((v - min) / range) * 7);
        return chars[Math.min(7, Math.max(0, idx))];
      }).join('');
    }

    function applyDecorations(timings) {
      if (!editor || !monaco) return
      
      const newDecorations = timings.map(t => {
        const history = t.history || [t.durationMs];
        const graph = sparkline(history);
        
        return {
          range: new monaco.Range(t.line, 1, t.line, 1),
          options: {
            isWholeLine: false,
            after: {
              content: `  (avg: ${labelForMs(t.durationMs)} · ${t.calls} calls)`,
              color: colorForMs(t.durationMs),
              fontStyle: 'normal',
              fontSize: '11px',
              opacity: '0.65',
            },
            hoverMessage: {
              value: `**${t.name || t.functionName}**\nAvg: ${labelForMs(t.durationMs)}\nGraph: \`${graph}\`\nLast 20 calls: ${
                history.map(d => labelForMs(d)).join(', ')
              }`
            }
          }
        }
      })

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    }

    return () => {
      off()
      if (editor) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      }
    }
  }, [editor, filePath, enabled])
}
