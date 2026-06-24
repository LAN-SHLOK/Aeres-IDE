import React, { useState } from 'react';
import { Bot, Key, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
const backendUrl = 'http://127.0.0.1:8008';
const OnboardingModal = ({ onComplete }) => {
  const [groqKey, setGroqKey] = useState('');
  const [diagramKey, setDiagramKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groqKey.trim()) {
      setError('A Groq API key is required to use the AI features.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      let currentBackendUrl = backendUrl;
      if (window.electron && window.electron.sidecar && window.electron.sidecar.getPort) {
        const port = await window.electron.sidecar.getPort();
        if (port) {
          currentBackendUrl = `http://127.0.0.1:${port}`;
        }
      }

      const response = await fetch(`${currentBackendUrl}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          GROQ_API_KEY: groqKey.trim(),
          IDE_DIAGRAM_ENGINE: diagramKey.trim() || undefined,
          GOOGLE_API_KEY: googleKey.trim() || undefined,
          GITHUB_TOKEN: githubToken.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save API keys');
      }
      
      onComplete();
    } catch (err) {
      setError(err.message || 'An error occurred while saving your keys.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#1e1e2e] shadow-2xl border border-pink-500/20">
        <div className="flex bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-8 border-b border-pink-500/10">
          <div className="mr-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 font-display">Welcome to Aeres IDE ✨</h2>
            <p className="text-pink-100/70 text-sm max-w-md">
              Before we get started, we need to securely configure your AI provider. 
              Your keys are stored locally and never leave your machine!
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
              <div className="i-lucide-alert-circle" />
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-pink-100">
                  <Key className="mr-2 h-4 w-4 text-pink-400" />
                  Groq API Key (Primary) <span className="ml-1 text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full rounded-xl bg-black/40 border border-pink-500/20 px-4 py-3 text-white placeholder-pink-100/30 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-pink-100">
                  <Key className="mr-2 h-4 w-4 text-pink-400" />
                  Catalyst Diagram Key <span className="ml-2 text-[10px] uppercase tracking-wider text-pink-100/30 bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                </label>
                <input
                  type="password"
                  value={diagramKey}
                  onChange={(e) => setDiagramKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full rounded-xl bg-black/40 border border-pink-500/20 px-4 py-3 text-white placeholder-pink-100/30 focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-pink-100/50">
              <span>Primary key handles IDE chat; Diagram key handles heavy Cartographer JSON payloads.</span>
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-pink-400 transition-colors"
              >
                Get your free Groq API key here <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-pink-100">
                  <Key className="mr-2 h-4 w-4 text-purple-400" />
                  Gemini API Key <span className="ml-2 text-[10px] uppercase tracking-wider text-pink-100/30 bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                </label>
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-pink-100/30 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all font-mono text-sm"
                />
                <div className="mt-2 flex items-center text-xs text-pink-100/40">
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-purple-400 transition-colors"
                  >
                    Get Gemini API key <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <div>
                <label className="mb-2 flex items-center text-sm font-medium text-pink-100">
                  <Key className="mr-2 h-4 w-4 text-blue-400" />
                  GitHub Token <span className="ml-2 text-[10px] uppercase tracking-wider text-pink-100/30 bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white placeholder-pink-100/30 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all font-mono text-sm"
                />
                <div className="mt-2 flex items-center text-xs text-pink-100/40">
                  <a 
                    href="https://github.com/settings/tokens/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-blue-400 transition-colors"
                  >
                    Get GitHub Token <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex items-center justify-between">
            <div className="flex items-center text-xs text-pink-100/40">
              <ShieldCheck className="mr-2 h-4 w-4 text-green-400/70" />
              Your keys are stored securely on your local device.
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold text-white shadow-lg shadow-pink-500/20 transition-all hover:scale-105 hover:shadow-pink-500/40 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? 'Saving...' : 'Start Coding'}
              {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;
