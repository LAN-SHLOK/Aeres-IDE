import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { 
  FileCode, 
  Search, 
  GitBranch, 
  Play, 
  Settings, 
  Activity,
  Files,
  Terminal,
  Blocks
} from 'lucide-react'

const SECTIONS = [
  {
    id: 'intro',
    title: 'README.md',
    icon: <FileCode size={16} />,
    content: `Aether IDE is a specialized neural environment designed for professional engineers. It serves as an investigative bridge between legacy architectures and modern standards.`
  },
  {
    id: 'setup',
    title: 'installation.sh',
    icon: <Terminal size={16} />,
    content: `Install the Aether Client to begin localized analysis. The IDE operates entirely within your network, ensuring zero data leakage of proprietary codebases.`
  },
  {
    id: 'engine',
    title: 'engine.py',
    icon: <Blocks size={16} />,
    content: `The Aether Engine performs real-time AST transformations, cross-referencing official live documentation to ensure migrations are deterministic and up-to-date.`
  },
  {
    id: 'telemetry',
    title: 'telemetry.log',
    icon: <Activity size={16} />,
    content: `Aether captures production behavior to generate test behavior that matches reality. Behavioral snapshots turn execution traces into reliable unit tests.`
  }
]

export default function Docs() {
  return (
    <div className="h-screen bg-[#05050a] font-body text-white selection:bg-white selection:text-black flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex-1 flex pt-16 h-full">
        {/* Activity Bar */}
        <aside className="w-12 bg-[#0a0a0f] border-r border-white/5 flex flex-col items-center py-4 gap-6 text-white/40">
           <Files size={20} className="text-white" />
           <Search size={20} />
           <GitBranch size={20} />
           <Play size={20} />
           <Blocks size={20} />
           <div className="mt-auto flex flex-col gap-6 mb-4">
              <Activity size={20} />
              <Settings size={20} />
           </div>
        </aside>

        {/* Sidebar / Explorer */}
        <aside className="w-64 bg-[#0a0a0f]/50 border-r border-white/5 flex flex-col">
          <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30 flex justify-between items-center">
            EXPLORER
            <span className="cursor-pointer">...</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-1">
               <div className="text-[11px] font-bold text-white/60 px-2 py-1 flex items-center gap-2">
                 <span className="rotate-90">▼</span> AETHER-PORTAL
               </div>
               <div className="pl-4 space-y-1 mt-1">
                 {SECTIONS.map(s => (
                   <a 
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-white/40 hover:bg-white/5 hover:text-white transition rounded no-underline"
                   >
                     {s.icon} {s.title}
                   </a>
                 ))}
               </div>
            </div>
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 bg-[#05050a] flex flex-col">
          {/* Tabs */}
          <div className="h-10 bg-[#0a0a0f] border-b border-white/5 flex items-center">
            {SECTIONS.map((s, i) => (
              <div 
                key={s.id}
                className={`h-full px-4 flex items-center gap-2 text-xs border-r border-white/5 ${i === 0 ? 'bg-[#05050a] border-t-2 border-t-[#7c3aed] text-white' : 'text-white/30'}`}
              >
                {s.icon} {s.title} <span className="ml-2 opacity-30">×</span>
              </div>
            ))}
          </div>

          {/* Breadcrumbs */}
          <div className="px-6 py-2 border-b border-white/5 text-[10px] font-mono text-white/20 flex items-center gap-2 uppercase tracking-widest">
            AETHER-PORTAL <span className="text-white/10">{'>'}</span> SRC <span className="text-white/10">{'>'}</span> DOCS <span className="text-white/10">{'>'}</span> <span className="text-white/40">MANUAL.MD</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-12 py-16 scroll-smooth">
            <div className="max-w-[800px]">
               <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-display text-5xl font-extrabold tracking-tighter mb-20 text-white"
               >
                 The Aether <br/><span className="text-white/20 italic font-medium">Core Intelligence Manual.</span>
               </motion.h1>

               <div className="space-y-40 pb-40">
                 {SECTIONS.map(s => (
                   <section key={s.id} id={s.id} className="scroll-mt-40">
                     <h2 className="font-display text-4xl font-bold mb-10 tracking-tight text-white/90">{s.title.replace('.',' ')}</h2>
                     <div className="prose prose-invert max-w-none text-white/40 leading-[2] text-xl font-light">
                       <p className="mb-12">{s.content}</p>
                       
                       <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-10 group relative overflow-hidden transition-all duration-700 hover:border-white/20">
                          <div className="absolute top-0 left-0 w-2 h-full bg-[#7c3aed] opacity-50"></div>
                          <div className="flex justify-between items-center mb-6 text-[10px] uppercase tracking-widest text-white/20">
                            <span>TERMINAL</span>
                            <span className="text-[#7c3aed]">LIVE</span>
                          </div>
                          <pre className="m-0 p-0 bg-transparent border-none">
                            <code className="text-sm font-mono text-[#a78bfa]">
                              $ aether --investigate --mode synthesis --target ./core
                            </code>
                          </pre>
                       </div>
                     </div>
                   </section>
                 ))}
               </div>
            </div>
          </div>
        </main>

        {/* Outline / Right Sidebar */}
        <aside className="hidden xl:block w-48 bg-[#0a0a0f]/30 border-l border-white/5 p-4 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-6 font-mono">OUTLINE</div>
          <nav className="space-y-4">
            {SECTIONS.map(s => (
              <a 
                key={s.id} 
                href={`#${s.id}`}
                className="block text-[11px] text-white/30 hover:text-[#7c3aed] transition no-underline border-l border-white/5 pl-4"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#7c3aed] text-white text-[9px] font-mono flex items-center justify-between px-4 z-[200]">
        <div className="flex gap-4">
           <span className="flex items-center gap-1"><GitBranch size={10} /> main*</span>
           <span className="flex items-center gap-1"><Activity size={10} /> 0 Errors</span>
        </div>
        <div className="flex gap-4">
           <span>UTF-8</span>
           <span>React JavaScript</span>
           <span>Aether Intelligence v1.0</span>
        </div>
      </div>
    </div>
  )
}
