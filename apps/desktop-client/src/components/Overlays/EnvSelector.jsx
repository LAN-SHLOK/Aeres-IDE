import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package } from 'lucide-react'
import { useStore } from '../../store'

export default function EnvSelector() {
  const {
    envSelectorOpen,
    setEnvSelectorOpen,
    availableEnvironments,
    activeEnvironment,
    setActiveEnvironment,
    theme
  } = useStore()
  
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const isDark = theme.includes('dark')

  useEffect(() => {
    if (envSelectorOpen) {
      useStore.getState().refreshEnvironments()
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [envSelectorOpen])

  if (!envSelectorOpen) return null

  const filtered = (availableEnvironments || []).filter(env => 
    env?.name?.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEnvSelectorOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        setActiveEnvironment(filtered[selectedIndex])
        setEnvSelectorOpen(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setEnvSelectorOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border ${
          isDark 
            ? 'bg-[#11111b]/95 border-white/10 backdrop-blur-xl shadow-black/50' 
            : 'bg-white/95 border-black/10 backdrop-blur-xl shadow-black/10'
        }`}
      >
        <div className="p-3">
          <input
            ref={inputRef}
            type="text"
            className={`w-full bg-transparent border-none outline-none text-lg px-2 py-1 ${
              isDark ? 'text-white placeholder-white/30' : 'text-gray-900 placeholder-gray-400'
            }`}
            placeholder="Select Environment..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className={`max-h-80 overflow-y-auto border-t ${isDark ? 'border-white/5' : 'border-black/5'} py-2`}>
          {filtered.length === 0 ? (
            <div className={`px-5 py-3 text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              No environments found.
            </div>
          ) : (
            filtered.map((env, i) => (
              <div
                key={env.id}
                onClick={() => {
                  setActiveEnvironment(env)
                  setEnvSelectorOpen(false)
                }}
                className={`px-5 py-2.5 mx-2 my-0.5 rounded-lg cursor-pointer flex items-center gap-3 ${
                  i === selectedIndex
                    ? isDark ? 'bg-indigo-500/20 text-white' : 'bg-indigo-50 text-indigo-700'
                    : isDark ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-black/5 hover:text-black'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-400">
                  <Package size={16} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{env.name}</span>
                    {activeEnvironment?.id === env.id && (
                      <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  {env.path && <div className="text-xs opacity-60 mt-0.5 font-mono">{env.path}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
