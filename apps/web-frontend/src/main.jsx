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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdf5ee] text-[#3b2314] p-8 text-center font-sans">
        
        <div className="kawaii-card max-w-md p-8 bg-white">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-3 border-black shadow-[3px_3px_0px_#000000] mb-6 font-mono">
            🖳 config_error
          </span>
          <h1 className="font-display text-2xl font-black mb-4">Auth Configuration Required</h1>
          <p className="text-[#3b2314]/70 text-xs font-semibold mb-6 leading-relaxed">
            To run the Aeres web portal, please add your Clerk Publishable Key to <code className="bg-white border-2 border-black px-1.5 py-0.5 rounded font-mono font-black text-black">.env.local</code> in the <code className="bg-white border-2 border-black px-1.5 py-0.5 rounded font-mono font-black text-black">apps/web-frontend</code> directory.
          </p>
          <pre className="bg-[#fffdf9] p-4 rounded-2xl border-3 border-black font-mono text-xs mb-6 text-left select-all font-extrabold shadow-[2px_2px_0px_#000000]">
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="kawaii-btn-pink text-xs uppercase tracking-wider font-display font-bold"
          >
            Check Again
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
