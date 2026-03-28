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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] text-white p-8 text-center font-sans">
        <h1 className="text-2xl font-bold mb-4">Auth Configuration Required</h1>
        <p className="text-gray-400 mb-6 max-w-md">
          To run the Aether web portal, please add your Clerk Publishable Key to <code className="bg-white/10 px-2 py-1 rounded">.env.local</code> in the <code className="bg-white/10 px-2 py-1 rounded">apps/web-frontend</code> directory.
        </p>
        <pre className="bg-black/50 p-4 rounded border border-white/10 text-sm mb-6">
          VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-2 px-6 rounded transition"
        >
          Check Again
        </button>
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
