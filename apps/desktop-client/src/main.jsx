// Import tauri bridge safely - don't crash the whole app if Tauri isn't available
try {
  await import('./tauri-bridge.js')
} catch (e) {
  console.warn('[main] Tauri bridge unavailable, running in browser-only mode:', e.message)
  // Ensure window.electron exists as a minimal shim so App.jsx doesn't crash
  if (!window.electron) {
    window.electron = null
  }
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Dismiss splash screen after React mounts
requestAnimationFrame(() => {
  const splash = document.getElementById('aeres-splash')
  if (splash) {
    splash.style.opacity = '0'
    setTimeout(() => splash.remove(), 400)
  }
})

// Load Google Fonts asynchronously (non-render-blocking)
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Quicksand:wght@300..700&display=swap'
document.head.appendChild(fontLink)
