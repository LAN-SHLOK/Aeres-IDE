import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import SmartDownload from './SmartDownload.jsx'

import IDE_SCREEN from '../assets/aeres_full_ide_showcase.png'

export default function HeroSection({ autoDownload = false }) {
  const headline = "Code at the speed of thought."
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 300])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-40 text-center overflow-hidden bg-transparent">
      
      <motion.div style={{ opacity, y }} className="relative z-10 w-full max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="mb-12 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl px-6 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.4em] text-[#a78bfa] shadow-[0_0_30px_rgba(124,58,237,0.1)]"
        >
          AERES INTELLIGENCE ENGINE V1.0
        </motion.div>

        <h1 className="font-display text-[clamp(2.5rem,10vw,8rem)] font-extrabold leading-[0.85] tracking-[-0.06em] text-white mb-16">
          {headline.split(" ").map((word, i) => (
            <motion.span 
              key={i} 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={`inline-block mr-[0.2em] last:mr-0 ${word === "thought." ? 'italic font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] to-[#3b82f6]' : ''}`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-24 max-w-[1100px] mx-auto group"
        >
          {/* Main IDE Showcase */}
          <div className="absolute -inset-4 bg-[#7c3aed]/20 blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-2xl transition duration-700 group-hover:border-white/20 group-hover:scale-[1.01]">
            <img src={IDE_SCREEN} alt="Aeres IDE Interface" className="w-full h-auto opacity-90 group-hover:opacity-100 transition duration-700" />
            
            {/* UI Decorative Overlays */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
          
          <div className="mt-16 flex justify-center gap-10">
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
               <SmartDownload large autoStart={autoDownload} className="relative !bg-white !text-black !border-none !rounded-2xl px-16 py-8 text-xl font-bold shadow-2xl transition-transform hover:scale-[1.05]" />
            </div>
          </div>
        </motion.div>
      </motion.div>

    </section>
  )
}
