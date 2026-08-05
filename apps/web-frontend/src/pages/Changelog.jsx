import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Changelog() {
  const versions = [
    {
      version: 'v1.2.0',
      date: 'August 5, 2026',
      title: 'The "Catalyst" Update',
      changes: [
        'Added Workspace Sunburst visualization for tracking directory sizes.',
        'Added API Sandbox with local proxy support for testing endpoints.',
        'Integrated Web Preview Sandbox with iframe injection for React apps.',
        'Optimized RAG Engine vector embeddings for 20% faster queries.',
        'Added automated Contract Snapshots for Python runtime testing.'
      ]
    },
    {
      version: 'v1.1.5',
      date: 'July 28, 2026',
      title: 'Performance & Polishing',
      changes: [
        'Refined Causal Blame Map rendering with D3 force simulation.',
        'Redesigned "Comprehensive Capabilities" grid with premium glassmorphism.',
        'Improved local Groq API key persistence securely via platformdirs.',
        'Fixed an issue where Temporal Lens CPU profiles were dropping frames.'
      ]
    },
    {
      version: 'v1.1.0',
      date: 'July 15, 2026',
      title: 'The Agentic AI Release',
      changes: [
        'Introduced the 120B parameter local AI Assistant in the Chat panel.',
        'Added autonomous codebase refactoring via "Catalyst Batch Modernize".',
        'Implemented the Health Dashboard for automated vulnerability patching.',
        'Initial release of full LSP integration for Python and TypeScript.'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[1000px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#ff8ba7]/10 text-[#ff8ba7] font-black text-xs uppercase tracking-widest mb-6 border border-[#ff8ba7]/20">
            <div className="w-2 h-2 rounded-full bg-[#ff8ba7] animate-pulse"></div>
            What's New
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Changelog
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            New updates and improvements to Aeres IDE.
          </p>
        </motion.div>

        <div className="space-y-16">
          {versions.map((release, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative pl-8 md:pl-0"
            >
              <div className="hidden md:block absolute left-[120px] top-0 bottom-0 w-[2px] bg-white/5"></div>
              
              <div className="md:grid md:grid-cols-[120px_1fr] md:gap-16 relative">
                {/* Date Side */}
                <div className="mb-4 md:mb-0 md:text-right relative">
                  <div className="hidden md:block absolute right-[-65px] top-1.5 w-4 h-4 rounded-full bg-[#09090e] border-4 border-[#2dd4bf] z-10"></div>
                  <span className="text-white/40 text-sm font-bold font-mono tracking-widest uppercase block">{release.date}</span>
                  <span className="text-[#2dd4bf] text-sm font-black font-mono tracking-widest uppercase">{release.version}</span>
                </div>

                {/* Content Side */}
                <div className="bg-[#13141f] border border-white/10 rounded-3xl p-8 md:p-10 shadow-[4px_4px_0px_#000000] relative overflow-hidden group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#2dd4bf]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none blur-xl"></div>
                  <h2 className="text-2xl font-black font-display mb-6 relative z-10">{release.title}</h2>
                  <ul className="space-y-4 relative z-10">
                    {release.changes.map((change, j) => (
                      <li key={j} className="flex gap-4 text-white/70 text-sm font-semibold leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0 mt-2"></div>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
