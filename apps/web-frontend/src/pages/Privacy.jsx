import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[800px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Privacy Policy
          </h1>
          <div className="text-white/40 text-sm font-bold font-mono tracking-widest uppercase mb-12">
            Last Updated: August 5, 2026
          </div>

          <div className="prose prose-invert prose-p:text-white/70 prose-p:font-semibold prose-p:leading-relaxed prose-headings:font-display prose-headings:font-black prose-a:text-[#2dd4bf] max-w-none">
            <h2 className="text-2xl mt-12 mb-6">1. Local-First Architecture</h2>
            <p>
              Aeres IDE is built entirely on a local-first architecture. This means your source code, configuration files, and project structures never leave your local machine unless explicitly sent to your chosen LLM provider via Bring Your Own Key (BYOK) settings.
            </p>

            <h2 className="text-2xl mt-12 mb-6">2. Telemetry and Analytics</h2>
            <p>
              We do not track, collect, or transmit any usage metrics, error logs, or telemetry data to our servers. Your development workflow is entirely private.
            </p>

            <h2 className="text-2xl mt-12 mb-6">3. Third-Party Integrations</h2>
            <p>
              When you use AI features (like the RAG Chat or Catalyst Modernize), your code snippets are sent directly from your machine to Groq (or your configured LLM provider). Aeres acts only as a local proxy and does not intercept, store, or monitor these API calls. You are subject to the privacy policies of the API providers you connect to.
            </p>
            
            <h2 className="text-2xl mt-12 mb-6">4. Local Storage</h2>
            <p>
              All IDE configurations, API keys, and workspace metadata are stored locally on your disk (e.g., in `.aeres/` folders or OS-level `AppData`). You maintain full control over these files and can delete them at any time.
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
