import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Security() {
  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[800px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Security Model
          </h1>
          <div className="text-white/40 text-sm font-bold font-mono tracking-widest uppercase mb-12">
            Aeres IDE Architecture
          </div>

          <div className="prose prose-invert prose-p:text-white/70 prose-p:font-semibold prose-p:leading-relaxed prose-headings:font-display prose-headings:font-black prose-a:text-[#2dd4bf] max-w-none">
            <h2 className="text-2xl mt-12 mb-6">1. Local Host Binding</h2>
            <p>
              The Python FastAPI sidecar runs strictly on <code>127.0.0.1</code>. It uses aggressive CORS validation (`allow_origin_regex`) ensuring that only the Tauri IPC (`tauri://localhost`) and the local React frontend can access its API endpoints.
            </p>

            <h2 className="text-2xl mt-12 mb-6">2. API Key Storage</h2>
            <p>
              When you provide a Groq API key (or any other provider key), it is saved directly to your OS-native user data directory using the `platformdirs` python library (e.g., `%APPDATA%` on Windows, `~/.config/` on Linux/macOS). 
            </p>
            <p>
              Keys are never committed to your repository. Furthermore, when querying endpoints to check key status, the backend masks the key in the response (e.g. `gsk_***x8`), preventing frontend XSS attacks from extracting it.
            </p>

            <h2 className="text-2xl mt-12 mb-6">3. Proxy & CORS Bypass</h2>
            <p>
              The built-in API Sandbox leverages the `http://127.0.0.1:8008/api/proxy/` endpoint to make external HTTP requests. This architecture prevents browser-enforced CORS issues without requiring you to run dangerous browser flags, ensuring your main browser environment remains isolated.
            </p>
            
            <h2 className="text-2xl mt-12 mb-6">4. Terminal Sandbox</h2>
            <p>
              The integrated terminal uses Tauri's OS-native bindings to spawn a PTY (pseudo-terminal). Web processes cannot execute arbitrary shell scripts without explicitly passing through the Tauri Rust backend, heavily mitigating RCE (Remote Code Execution) vulnerabilities compared to electron-based alternatives.
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
