import React, { useState } from 'react'
import { useStore } from '../../store'
import { CheckCircle, AlertTriangle, XCircle, Shield, Wrench, RefreshCw } from 'lucide-react'

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
    openTab
  } = useStore()

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

  const handleFixIssue = (issue) => {
    // Pipe the issue to the Chat panel
    setAgentMode('chat')
    setActiveRightTab('chat')
    setRightPanelOpen(true)
    
    const prompt = `Please fix the following issue in ${issue.file}: ${issue.message}. Suggested fix: ${issue.suggested_fix}`
    window.dispatchEvent(new CustomEvent('aeres:send-agent-prompt', { detail: { prompt } }))
    
    if (issue.file && issue.file !== 'System') {
       openTab({ path: issue.file, title: issue.file.split('/').pop() || issue.file })
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
    <div className="flex flex-col h-full bg-[#0d0d12] text-gray-200 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-sm uppercase tracking-wider text-white">Project Health</h2>
        </div>
        <button 
          onClick={handleScan} 
          disabled={isScanningHealth || !rootPath}
          className={`p-2 rounded-md transition-all ${isScanningHealth ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
          title="Scan Workspace"
        >
          <RefreshCw className={`w-4 h-4 ${isScanningHealth ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6 flex flex-col items-center justify-center gap-6">
        {/* Score Ring */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute inset-0 rounded-full blur-2xl transition-all duration-1000"
            style={{ backgroundColor: healthScore !== null ? glowColor : 'transparent' }}
          />
          <svg width="140" height="140" className="transform -rotate-90 relative z-10 drop-shadow-2xl">
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
                <span className="text-3xl font-bold tracking-tighter" style={{ color: scoreColor }}>{healthScore}</span>
                <span className="text-[10px] text-gray-400 font-medium uppercase">Score</span>
              </>
            ) : (
              <span className="text-xs text-gray-500 font-medium text-center px-4">Not<br/>Scanned</span>
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white">
            {healthScore === null ? 'Ready to Scan' : healthScore >= 80 ? 'Looking Good!' : healthScore >= 50 ? 'Needs Attention' : 'Critical Issues Found'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
            {healthScore === null ? 'Analyze your workspace for vulnerabilities and code smells.' : 'AI analysis complete.'}
          </p>
        </div>
      </div>

      {/* Issues List */}
      {healthIssues && healthIssues.length > 0 && (
        <div className="flex-1 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detected Issues</h4>
          {healthIssues.map((issue, idx) => {
            const isCritical = issue.severity === 'critical'
            const isWarning = issue.severity === 'warning'
            return (
              <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 transition-all hover:bg-white/[0.05]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCritical ? <XCircle className="w-4 h-4 text-red-400" /> : 
                     isWarning ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : 
                     <CheckCircle className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-blue-400'}`}>
                        {issue.severity}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate" title={issue.file}>{issue.file.split('/').pop()}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-1 leading-snug">{issue.message}</p>
                    {issue.suggested_fix && (
                      <div className="mt-3 bg-black/20 rounded-lg p-2.5 border border-white/5">
                        <p className="text-xs text-gray-400 italic">"{issue.suggested_fix}"</p>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleFixIssue(issue)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-md text-xs font-medium transition-colors border border-indigo-500/20"
                      >
                        <Wrench className="w-3 h-3" />
                        Fix Automatically
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
          <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-sm text-gray-300">Perfect score! No issues found in your scanned files.</p>
        </div>
      )}
    </div>
  )
}
