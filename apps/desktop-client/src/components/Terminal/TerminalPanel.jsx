import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { useStore } from '../../store.js'

export default function TerminalPanel({ terminalId, isActive }) {
  const containerRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const attachedRef = useRef(false)
  const theme = useStore((s) => s.theme)

  const getXtermTheme = (appTheme) => {
    const base = {
      background: '#0a0a0f',
      foreground: '#f1f5f9',
      cursor: '#7C3AED',
      cursorAccent: '#0a0a0f',
      selectionBackground: '#7C3AED44',
      black: '#1e293b', red: '#ef4444', green: '#22c55e',
      yellow: '#eab308', blue: '#3b82f6', magenta: '#a855f7',
      cyan: '#06b6d4', white: '#f1f5f9',
      brightBlack: '#475569', brightRed: '#f87171', brightGreen: '#4ade80',
      brightYellow: '#facc15', brightBlue: '#60a5fa', brightMagenta: '#c084fc',
      brightCyan: '#22d3ee', brightWhite: '#ffffff',
    }
    if (appTheme?.startsWith('cutie')) {
      return { ...base, background: '#130f26', cursor: '#ffb3c1', selectionBackground: '#ffb3c144' }
    }
    if (appTheme === 'retro') {
      return { ...base, background: '#0c0f0d', foreground: '#33ff33', cursor: '#33ff33' }
    }
    if (appTheme === 'cyberpunk') {
      return { ...base, background: '#050508', foreground: '#00ffff', cursor: '#ff007f' }
    }
    return base
  }

  useEffect(() => {
    if (!containerRef.current || attachedRef.current) return

    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      lineHeight: 1.4,
      theme: getXtermTheme(theme),
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.loadAddon(new WebLinksAddon((event, url) => {
      if (window.electron?.fs?.openExternal) {
        window.electron.fs.openExternal(url)
      }
    }))
    xterm.open(containerRef.current)

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon
    attachedRef.current = true

    const e = window.electron
    if (!e) return

    // Handle Ctrl+C: copy if text selected, otherwise send SIGINT to pty
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.type === 'keydown' && event.key === 'c' && xterm.hasSelection()) {
        navigator.clipboard.writeText(xterm.getSelection())
        xterm.clearSelection()
        return false
      }
      // Ctrl+V paste from clipboard
      if (event.ctrlKey && event.type === 'keydown' && event.key === 'v') {
        navigator.clipboard.readText().then((text) => {
          if (text) e.terminal.write(terminalId, text)
        })
        return false
      }
      return true
    })

    // Forward xterm input → pty
    xterm.onData((data) => {
      e.terminal.write(terminalId, data)
    })

    // Forward pty output → xterm
    const unlistenData = e.terminal.onData(terminalId, (data) => {
      xterm.write(data)
    })

    // Handle pty exit
    const unlistenExit = e.terminal.onExit(terminalId, ({ exitCode }) => {
      xterm.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
    })

    // Initial fit after a short delay to ensure the container has its final layout
    setTimeout(() => {
      try {
        fitAddon.fit()
        const dims = fitAddon.proposeDimensions()
        if (dims) {
          e.terminal.resize(terminalId, dims.rows, dims.cols)
        }
      } catch { /* ignore */ }
    }, 100)

    // Resize observer — debounced to avoid spamming resize calls
    let resizeTimer = null
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        try {
          fitAddon.fit()
          const dims = fitAddon.proposeDimensions()
          if (dims) {
            e.terminal.resize(terminalId, dims.rows, dims.cols)
          }
        } catch { /* ignore */ }
      }, 50)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      if (unlistenData) unlistenData()
      if (unlistenExit) unlistenExit()
      xterm.dispose()
      attachedRef.current = false
    }
  }, [terminalId])

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getXtermTheme(theme)
    }
  }, [theme])

  // Fit when becoming active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current.fit()
          const dims = fitAddonRef.current.proposeDimensions()
          if (dims && window.electron) {
            window.electron.terminal.resize(terminalId, dims.rows, dims.cols)
          }
        } catch { /* ignore */ }
      }, 50)
    }
  }, [isActive, terminalId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? 'block' : 'none', padding: '4px' }}
    />
  )
}
