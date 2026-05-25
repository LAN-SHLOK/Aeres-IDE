import React from 'react'
import { useStore } from '../../store.js'

export default function RateLimitModal({ onClose }) {
  const installExtension = useStore((s) => s.installExtension)
  
  const handleUpgrade = () => {
    alert('🚀 Redirecting to Secure Stripe Checkout...\n\nThank you for choosing Aeres Pro! Upgrading your account to Pro Plan ($20/mo) instantly...')
    // Simulating instant upgrade by unlocking all premium plugins and settings
    installExtension('aeres-pro-suite')
    installExtension('advanced-scrapers')
    useStore.setState({ theme: 'aeres' }) // Switch to eye-friendly Aeres Pro theme
    alert('🎉 Upgrade complete! Your Aeres account is now active on the Pro Plan! Rate limits successfully removed.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-[500px] bg-[#130f26] border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_#000000] animate-in zoom-in-95 duration-200">
        {/* Retro Windows-95 Title Bar */}
        <div className="bg-[#fef08a] border-b-4 border-black px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-black tracking-widest flex items-center gap-1">
              <span>⚠️</span> rate_limit_warning.exe
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-5 h-5 rounded-md border-2 border-black bg-red-400 hover:bg-red-500 flex items-center justify-center text-xs text-black font-black active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          {/* Animated Warning Icon */}
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center bg-[#fef08a]/20 border-3 border-black rounded-2xl shadow-[4px_4px_0px_#000000] rotate-[-6deg] hover:rotate-0 transition-transform">
            <span className="text-3xl">⏳</span>
          </div>

          <h2 className="text-xl font-black text-white mb-2 leading-none uppercase tracking-wide">
            Aeres AI Core Rate Limit Reached
          </h2>
          <p className="text-slate-400 text-xs max-w-sm mb-6 leading-relaxed">
            You have hit the maximum API limits of Aeres AI's Standard tier. Upgrade to Pro to unlock continuous autonomous refactoring and priority agents.
          </p>

          {/* Premium Plan Card */}
          <div className="w-full bg-[#1c1735] border-3 border-black rounded-2xl p-5 text-left mb-6 relative">
            <span className="absolute -top-3.5 right-4 inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase text-black bg-[#ff8ba7] border-2 border-black shadow-[2px_2px_0px_#000000]">
              Highly Recommended
            </span>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black text-white">$20</span>
              <span className="text-slate-500 text-xs font-bold">/ month</span>
            </div>
            <p className="text-slate-300 text-[10px] font-medium mb-4 leading-relaxed">
              Unlock the full power of our autonomous agent pipelines with zero limits and priority execution.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-[#ff8ba7]">✓</span> Unlimited AI Agent Edit Runs
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#ff8ba7]">✓</span> 10x Faster Generation
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#ff8ba7]">✓</span> Advanced Scrapers & Telemetry
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#ff8ba7]">✓</span> Multi-File Auto Refactoring
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 bg-[#ff8ba7] text-black font-black uppercase text-xs tracking-wider rounded-xl border-3 border-black shadow-[4px_4px_0px_#000000] hover:bg-[#ff8ba7]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition-all"
            >
              🚀 Upgrade to Pro ($20)
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1c1735] hover:bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-wider rounded-xl border-3 border-black shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
