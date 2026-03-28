import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

export default function TerminalPanel({ terminalId, isActive }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      theme: {
        background: '#0a0a0f',
        foreground: '#e4e4e7',
        cursor: '#7C3AED',
        selectionBackground: 'rgba(124, 58, 237, 0.3)',
        black: '#0a0a0f',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#4F8EF7',
        magenta: '#7C3AED',
        cyan: '#06b6d4',
        white: '#e4e4e7',
      },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    // Fit after opening
    setTimeout(() => {
      try { fitAddon.fit() } catch { /* ok */ }
    }, 50)

    // Wire data
    const e = window.electron
    if (e) {
      term.onData((data) => {
        e.terminal.write(terminalId, data)
      })
      e.terminal.onData(terminalId, (data) => {
        term.write(data)
      })
      e.terminal.onExit(terminalId, ({ exitCode }) => {
        term.writeln(`\r\n[Process exited with code ${exitCode}]`)
      })
    }

    // ResizeObserver
    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        if (e) {
          e.terminal.resize(terminalId, term.rows, term.cols)
        }
      } catch { /* ignore */ }
    })
    observer.observe(containerRef.current)

    termRef.current = term
    fitRef.current = fitAddon
    observerRef.current = observer

    return () => {
      observer.disconnect()
      if (e) e.terminal.offAll(terminalId)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [terminalId])

  // Focus when active
  useEffect(() => {
    if (isActive && termRef.current && fitRef.current) {
      setTimeout(() => {
        try {
          fitRef.current.fit()
          termRef.current.focus()
        } catch { /* ok */ }
      }, 50)
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}
