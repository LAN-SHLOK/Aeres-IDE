import React, { useState } from 'react'
import { useStore } from '../../store'
import { CheckCircle, AlertTriangle, XCircle, Shield, Wrench, RefreshCw, Loader2 } from 'lucide-react'

export function HealthDashboard() {
  const { 
    rootPath, 
    healthScore, 
    healthIssues, 
    isScanningHealth, 
    setHealthData, 
    setIsScanningHealth,
    backendUrl,
    setAgentMode,
    setActiveRightTab,
    setRightPanelOpen,
    openTab,
    updateTab,
    tabs
  } = useStore()

  const [fixingIssues, setFixingIssues] = useState({})

  const handleScan = async () => {
    if (!rootPath) return
    setIsScanningHealth(true)
    
    try {
      const e = window.electron
      if (!e || !e.analyze || !e.analyze.healthScan) throw new Error('Backend bridge not found')
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Health Scan Timed Out (50s)')), 50000))
      const data = await Promise.race([e.analyze.healthScan({ root_path: rootPath }), timeoutPromise])
      if (data.error) throw new Error(data.error)
      setHealthData(data.health_score || 0, data.issues || [])
    } catch (error) {
      console.error("Health Scan Error:", error)
      setHealthData(0, [{ severity: 'critical', message: 'Failed to connect to backend scanner.', file: 'System', suggested_fix: 'Check backend connection.' }])
    } finally {
      setIsScanningHealth(false)
    }
  }

  const handleFixIssue = async (issue, index) => {
    if (!issue.file || issue.file === 'System') return;
    
    setFixingIssues(prev => ({ ...prev, [index]: true }))
    
    try {
      const e = window.electron
      if (!e?.rag?.agentEdit) throw new Error('Agent Edit not available')
      
      let absPath = issue.file;
      if (!absPath.includes(':') && !absPath.startsWith('/')) {
        absPath = `${rootPath}/${issue.file}`.replace(/\\/g, '/');
      }
      
      const fileContent = await e.fs.readFile(absPath)
      
      const instruction = `Please fix the following issue: ${issue.message}. Suggested fix: ${issue.suggested_fix}`
      
      const res = await e.rag.agentEdit({
        instruction: instruction,
        file_path: absPath,
        file_content: fileContent,
        root_path: rootPath || ''
      })
      
      if (res.action === 'edit' && res.new_content) {
        await e.fs.writeFile(absPath, res.new_content)
        
        // Optimistic UI update: remove issue and bump score instantly
        const updatedIssues = healthIssues.filter((_, i) => i !== index)
        const newScore = Math.min(100, (healthScore || 0) + (issue.severity === 'critical' ? 15 : issue.severity === 'warning' ? 10 : 5))
        setHealthData(newScore, updatedIssues)
        
        // Update tab if it is currently open
        const tab = tabs.find(t => t.path === absPath || t.path === issue.file)
        if (tab) {
          updateTab(tab.id, { content: res.new_content })
        }
        
        // Show what changed
        window.alert(`✅ Fix Applied Successfully!\n\nFile: ${absPath.split('/').pop()}\nWhat Changed:\n${res.explanation}`)
        
        // Reveal the fixed file
        openTab({ path: absPath, name: absPath.split('/').pop() || absPath })
        
        // Trigger a real backend rescan in the background to officially verify
        handleScan()
      } else {
        throw new Error(res.explanation || 'Failed to apply fix')
      }
    } catch (err) {
      console.error('Fix Issue Error:', err)
      window.alert(`Failed to apply fix: ${err.message || 'Unknown error'}`)
    } finally {
      setFixingIssues(prev => ({ ...prev, [index]: false }))
    }
  }

  // Determine score color
  let scoreColor = '#10b981' // Green
  let glowColor = 'rgba(16, 185, 129, 0.2)'
  if (healthScore !== null && healthScore < 50) {
    scoreColor = '#ef4444' // Red
    glowColor = 'rgba(239, 68, 68, 0.2)'
  } else if (healthScore !== null && healthScore < 80) {
    scoreColor = '#f59e0b' // Yellow
    glowColor = 'rgba(245, 158, 11, 0.2)'
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = healthScore !== null ? circumference - (healthScore / 100) * circumference : circumference;

  return (
    <div className="flex flex-col h-full bg-aeres-bg text-white overflow-y-auto custom-scrollbar relative animate-fade-in">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-aeres-border px-3 bg-aeres-surface/40 backdrop-blur-md sticky top-0 z-10">
        <span className="text-[9px] font-black uppercase tracking-widest text-aeres-muted flex items-center gap-1.5">
          <Shield size={14} className="text-aeres-violet font-bold" /> Project Health
        </span>
        <button 
          onClick={handleScan} 
          disabled={isScanningHealth || !rootPath}
          className={`rounded-full border-2 border-black px-2.5 py-0.5 text-[8px] font-extrabold uppercase transition shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] cursor-pointer flex items-center gap-1 ${
            isScanningHealth 
              ? 'bg-aeres-violet/20 text-aeres-violet border-aeres-violet/30'
              : 'bg-aeres-surface text-white hover:bg-aeres-violet hover:text-black'
          }`}
          title="Scan Workspace"
        >
          <RefreshCw size={10} className={isScanningHealth ? 'animate-spin' : ''} /> 
          {isScanningHealth ? 'Scanning...' : 'Scan Workspace'}
        </button>
      </div>

      <div className="p-6 flex flex-col items-center justify-center gap-6">
        {/* Score Ring */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute inset-0 rounded-full blur-2xl transition-all duration-1000"
            style={{ backgroundColor: healthScore !== null ? glowColor : 'transparent' }}
          />
          <svg width="140" height="140" className="transform -rotate-90 relative z-10 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
            <circle cx="70" cy="70" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
            <circle 
              cx="70" 
              cy="70" 
              r={radius} 
              stroke={scoreColor} 
              strokeWidth="12" 
              fill="none" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            {healthScore !== null ? (
              <>
                <span className="text-3xl font-black tracking-tighter" style={{ color: scoreColor }}>{healthScore}</span>
                <span className="text-[9px] font-black text-aeres-muted uppercase tracking-widest mt-1">Score</span>
              </>
            ) : (
              <span className="text-[10px] text-aeres-muted font-bold text-center px-4 uppercase tracking-wider leading-relaxed">Not<br/>Scanned</span>
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {healthScore === null ? 'Ready to Scan' : healthScore >= 80 ? 'Looking Good!' : healthScore >= 50 ? 'Needs Attention' : 'Critical Issues Found'}
          </h3>
          <p className="text-[10px] text-aeres-muted mt-1.5 max-w-[200px] leading-relaxed mx-auto">
            {healthScore === null ? 'Analyze your workspace for vulnerabilities and code smells.' : 'AI analysis complete.'}
          </p>
        </div>
      </div>

      {/* Issues List */}
      {healthIssues && healthIssues.length > 0 && (
        <div className="flex-1 p-4 space-y-4">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-aeres-muted mb-2">Detected Issues</h4>
          {healthIssues.map((issue, idx) => {
            const isCritical = issue.severity === 'critical'
            const isWarning = issue.severity === 'warning'
            return (
              <div key={idx} className="bg-aeres-surface border-2 border-black rounded-xl p-4 transition-all hover:border-aeres-violet shadow-[4px_4px_0px_#000]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCritical ? <XCircle className="w-4 h-4 text-red-500" /> : 
                     isWarning ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : 
                     <CheckCircle className="w-4 h-4 text-aeres-violet" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-aeres-violet'}`}>
                        {issue.severity}
                      </span>
                      <span className="text-[9px] font-mono text-aeres-muted truncate" title={issue.file}>{issue.file.split('/').pop()}</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1.5 leading-snug">{issue.message}</p>
                    {issue.suggested_fix && (
                      <div className="mt-3 bg-black/40 rounded-md p-2.5 border border-aeres-border">
                        <p className="text-[10px] text-aeres-muted italic font-mono">"{issue.suggested_fix}"</p>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleFixIssue(issue, idx)}
                        disabled={fixingIssues[idx]}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black text-[9px] font-black uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] ${fixingIssues[idx] ? 'bg-aeres-bg text-aeres-muted cursor-not-allowed' : 'bg-aeres-violet text-black hover:bg-white'}`}
                      >
                        {fixingIssues[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
                        {fixingIssues[idx] ? 'Fixing...' : 'Fix Auto'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {healthScore !== null && healthIssues.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-aeres-muted bg-aeres-bg">
          <div className="relative mb-4 hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-black bg-aeres-surface text-emerald-400 shadow-[2px_2px_0px_#000]">
              <CheckCircle size={28} />
            </div>
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Perfect Score</h3>
          <p className="text-[10px] text-aeres-muted max-w-[200px] leading-relaxed">
            No issues found in your scanned files.
          </p>
        </div>
      )}
    </div>
  )
}
