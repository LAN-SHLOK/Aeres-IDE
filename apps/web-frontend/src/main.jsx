import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './assets/global.css'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#222', minHeight: '100vh' }}>
          <h2>Something went wrong in React.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 20 }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey || publishableKey === 'pk_test_placeholder' || publishableKey === 'pk_test_replace_me') {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white p-8 text-center font-sans relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-red-400 bg-red-500/10 border border-red-500/20 mb-6 font-mono">
            sys_config_error
          </span>
          <h1 className="font-display text-2xl font-black mb-4 tracking-tight">Auth Configuration Required</h1>
          <p className="text-white/60 text-xs font-medium mb-6 leading-relaxed">
            To run the Aeres web portal, please add your Clerk Publishable Key to your Vercel Environment Variables.
          </p>
          <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-xs mb-6 text-left select-all shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
            <span className="text-white/40">VITE_CLERK_PUBLISHABLE_KEY=</span><span className="text-white">pk_test_...</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black py-3 rounded-lg text-xs uppercase tracking-wider font-display font-bold hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Refresh Diagnostics
          </button>
        </div>

      </div>
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={publishableKey}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

