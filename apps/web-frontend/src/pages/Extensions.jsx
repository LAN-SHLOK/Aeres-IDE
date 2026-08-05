import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Extensions() {
  const extensions = [
    {
      title: 'Docker Support',
      author: 'Aeres Core',
      downloads: '124k',
      rating: '4.9',
      desc: 'Full Docker and docker-compose integration. Container logs, shell access, and build orchestration directly within the IDE panels.',
      color: 'bg-[#2dd4bf]'
    },
    {
      title: 'Vim Bindings',
      author: 'Community',
      downloads: '89k',
      rating: '4.8',
      desc: 'Complete Vim emulation for the Monaco editor including macros, registers, and visual block mode.',
      color: 'bg-[#ff8ba7]'
    },
    {
      title: 'Tailwind CSS IntelliSense',
      author: 'Aeres Core',
      downloads: '210k',
      rating: '5.0',
      desc: 'Intelligent autocomplete, linting, and hover previews for Tailwind CSS classes in your HTML/JSX.',
      color: 'bg-[#c084fc]'
    },
    {
      title: 'Rust Analyzer Plus',
      author: 'Community',
      downloads: '56k',
      rating: '4.7',
      desc: 'Enhanced Rust development experience with inlay hints, macro expansion, and advanced cargo commands.',
      color: 'bg-[#fef08a]'
    }
  ]

  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[1200px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Extensions
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            Customize Aeres IDE with themes, language servers, and powerful workflow tools.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <input 
            type="text" 
            placeholder="Search extensions..."
            className="flex-1 bg-[#13141f] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-[#c084fc] transition-colors"
          />
          <button className="bg-[#c084fc] text-black font-black uppercase text-sm tracking-widest px-8 py-4 rounded-2xl shadow-[4px_4px_0px_#000000] hover:translate-y-1 hover:shadow-[0px_0px_0px_#000000] transition-all">
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {extensions.map((ext, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#13141f] border border-white/10 rounded-3xl p-8 shadow-[4px_4px_0px_#000000] relative overflow-hidden group hover:border-white/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${ext.color} flex items-center justify-center border-2 border-black`}>
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display text-white">{ext.title}</h3>
                    <span className="text-white/40 text-xs font-bold">{ext.author}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition-colors">
                  Install
                </button>
              </div>
              <p className="text-white/70 text-sm font-semibold leading-relaxed mb-6">
                {ext.desc}
              </p>
              <div className="flex items-center gap-6 text-xs font-bold text-white/50">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  {ext.downloads}
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400">
                  ★ {ext.rating}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
