import { useState, useEffect } from 'react'
import { useStore } from '../../store.js'

export default function NewProjectWizard({ onClose }) {
  const [projectName, setProjectName] = useState('my-app')
  const [selectedTemplate, setSelectedTemplate] = useState('react-vite')

  const templates = [
    { id: 'react-vite', name: 'React + Vite', desc: 'Modern React with fast HMR', command: 'npm create vite@latest {{name}} -- --template react' },
    { id: 'vue-vite', name: 'Vue + Vite', desc: 'Vue 3 with Vite tooling', command: 'npm create vite@latest {{name}} -- --template vue' },
    { id: 'nextjs', name: 'Next.js', desc: 'React framework for production', command: 'npx create-next-app@latest {{name}}' },
    { id: 'svelte', name: 'SvelteKit', desc: 'Cybernetically enhanced web apps', command: 'npm create svelte@latest {{name}}' },
    { id: 'express', name: 'Express API', desc: 'Basic Node.js API scaffold', command: 'npx express-generator {{name}}' },
    { id: 'fastapi', name: 'Python FastAPI', desc: 'High-performance Python API', command: 'mkdir {{name}}; cd {{name}}; python -m venv venv; pip install fastapi uvicorn' },
    { id: 'django', name: 'Django', desc: 'Python Web Framework', command: 'django-admin startproject {{name}}' },
    { id: 'rust-cargo', name: 'Rust (Cargo)', desc: 'Rust binary project', command: 'cargo new {{name}}' },
    { id: 'go-module', name: 'Go Module', desc: 'Standard Go project structure', command: 'mkdir {{name}}; cd {{name}}; go mod init {{name}}' },
    { id: 'dotnet-api', name: 'ASP.NET Core Web API', desc: 'C# robust backend', command: 'dotnet new webapi -n {{name}}' },
    { id: 'angular', name: 'Angular', desc: 'Google\'s Web Framework', command: 'npx @angular/cli new {{name}} --defaults' },
    { id: 'nestjs', name: 'NestJS', desc: 'Scalable Node.js framework', command: 'npx @nestjs/cli new {{name}} --package-manager npm' }
  ]

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleCreate = () => {
    if (!projectName.trim()) return

    const template = templates.find((t) => t.id === selectedTemplate)
    if (!template) return

    const finalCommand = template.command.replace(/{{name}}/g, projectName.trim())

    // Close the wizard
    onClose()

    // Dispatch event to open a new terminal and run the command
    // We can just open the terminal panel, wait a tick, then send the command
    const store = useStore.getState()
    store.setTerminalPanelOpen(true)
    
    // Fire a custom event to App.jsx to create the terminal and run
    document.dispatchEvent(new CustomEvent('aeres:scaffold-project', { detail: { command: finalCommand } }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-aeres-surface border border-aeres-border rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aeres-border bg-black/20">
          <h2 className="text-lg font-bold text-aeres-text flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            New Project Wizard
          </h2>
          <button onClick={onClose} className="text-aeres-muted hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Project Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-aeres-muted mb-2">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-black/40 border border-aeres-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-aeres-violet transition-colors font-mono"
              placeholder="e.g. my-awesome-app"
              autoFocus
            />
          </div>

          {/* Templates Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-aeres-muted mb-3">Select Template</label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                    selectedTemplate === t.id
                      ? 'bg-aeres-violet/10 border-aeres-violet shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                      : 'bg-black/20 border-aeres-border hover:border-aeres-muted hover:bg-black/30'
                  }`}
                >
                  <div className={`font-bold text-sm mb-1 ${selectedTemplate === t.id ? 'text-aeres-violet' : 'text-slate-300'}`}>
                    {t.name}
                  </div>
                  <div className="text-xs text-aeres-muted leading-relaxed">
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-aeres-border bg-black/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-aeres-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim()}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-aeres-violet text-black hover:bg-aeres-violet/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(124,58,237,0.3)]"
          >
            Generate Project
          </button>
        </div>
      </div>
    </div>
  )
}
