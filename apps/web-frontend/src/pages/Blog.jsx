import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Blog() {
  const posts = [
    {
      title: 'Building a Local-First LLM Architecture',
      date: 'August 1, 2026',
      category: 'Engineering',
      desc: 'How we structured the Python FastAPI sidecar and Tauri IPC to securely route 120B parameter Groq inference without exposing your source code.',
      color: 'bg-[#2dd4bf]'
    },
    {
      title: 'D3 Force Graphs for Complex Codebases',
      date: 'July 22, 2026',
      category: 'Design',
      desc: 'Visualizing 100k+ lines of code is hard. Here is how we used WebGL and D3.js to render Causal Blame Maps at 60fps.',
      color: 'bg-[#ff8ba7]'
    },
    {
      title: 'The Future of Agentic Workspaces',
      date: 'July 10, 2026',
      category: 'Vision',
      desc: 'Why autocomplete is dead and autonomous, tool-using agents are the future of software development.',
      color: 'bg-[#fef08a]'
    }
  ]

  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[1000px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Blog
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            Thoughts, engineering deep dives, and announcements from the Aeres team.
          </p>
        </motion.div>

        <div className="space-y-8">
          {posts.map((post, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#13141f] border border-white/10 rounded-3xl p-8 shadow-[4px_4px_0px_#000000] relative overflow-hidden group hover:-translate-y-1 transition-all cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-xs font-bold font-mono tracking-widest uppercase">{post.date}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                  <span className={`px-2.5 py-1 rounded-md ${post.color} text-black text-[10px] font-black uppercase tracking-wider`}>
                    {post.category}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-black font-display text-white mb-4 group-hover:text-[#2dd4bf] transition-colors">{post.title}</h2>
              <p className="text-white/60 text-sm font-semibold leading-relaxed">
                {post.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
