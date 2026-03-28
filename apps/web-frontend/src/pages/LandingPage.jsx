import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import Footer from '../components/Footer.jsx'
import HeroSection from '../components/HeroSection.jsx'
import Navbar from '../components/Navbar.jsx'
import SmartDownload from '../components/SmartDownload.jsx'
import { redirectToAuthForDownload } from '../utils/authRedirect.js'

import Hero3DBackground from '../components/Hero3DBackground.jsx'

const FEATURES = [
  {
    title: 'Aether Engine',
    tag: 'LOGIC SYNTHESIS',
    desc: 'Deep AST analysis and documentation synthesis for deterministic refactors. Understands context, not just characters.',
    img: "/assets/aether_ai_analysis_screenshot_1774455723029.png",
    specs: ["AST Parsing: 240k lines/s", "Token Context: 128k", "Inference: 4ms"]
  },
  {
    title: 'Temporal Telemetry',
    tag: 'DYNAMIC TRACE',
    desc: 'Real-time runtime tracing injected directly into your editor buffer. See slow paths before users complain.',
    img: "/assets/aether_performance_telemetry_screenshot_v2_1774455950701.png",
    specs: ["Resolution: 1ms", "Tracing: Zero-Overhead", "Visualization: FlameGraph"]
  },
  {
    title: 'Neural Terminal',
    tag: 'INTERFACE',
    desc: 'A voice-and-text interactive shell that generates its own logic and performs complex migrations autonomously.',
    img: "/assets/aether_holographic_terminal_screenshot_1774455838706.png",
    specs: ["Voice Engine: Whisper v3", "LLM: Groq Llama 3.1", "Speed: 100+ tokens/s"]
  }
]

function ScrollHUD() {
  const { scrollYProgress } = useScroll()
  const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 90 })
  const [percent, setPercent] = useState(0)
  const [jitter, setJitter] = useState(false)

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
        setPercent(Math.round(v * 100))
        setJitter(true)
        const timeout = setTimeout(() => setJitter(false), 500)
        return () => clearTimeout(timeout)
    })
    return unsub
  }, [scrollYProgress])
  
  return (
    <div className={`fixed bottom-10 right-10 z-50 flex flex-col items-center gap-4 group transition-transform duration-300 ${jitter ? 'translate-x-1' : ''}`}>
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 100 100" className="h-full w-full rotate-[-90deg]">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            className="text-white/10"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="#7c3aed"
            strokeWidth="2"
            fill="transparent"
            style={{ pathLength }}
            strokeDasharray="0 1"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-mono text-[10px] text-white/40 ${jitter ? 'animate-pulse' : ''}`}>
           {percent}%
        </div>
      </div>
      <div className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase group-hover:text-white/60 transition-colors">
         {jitter ? 'SYNCHING_PACKETS' : 'Scroll to Synch'}
      </div>
    </div>
  )
}

function VerticalScrubber() {
    const { scrollYProgress } = useScroll()
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
    
    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 h-[40vh] w-px bg-white/5 z-50 pointer-events-none hidden md:block">
            <motion.div 
                style={{ top: y }}
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#7c3aed] rounded-full shadow-[0_0_10px_#7c3aed]"
            />
        </div>
    )
}

export default function LandingPage() {
  const [searchParams] = useSearchParams()
  const { isSignedIn, isLoaded } = useUser()
  const downloadRedirected = useRef(false)
  
  const containerRef = useRef(null)

  const downloadQuery = searchParams.get('download') === 'true'

  useEffect(() => {
    if (!downloadQuery) {
      downloadRedirected.current = false
      return
    }
    if (!isLoaded || isSignedIn) return
    if (downloadRedirected.current) return
    downloadRedirected.current = true
    redirectToAuthForDownload()
  }, [downloadQuery, isLoaded, isSignedIn])

  return (
    <div className="min-h-screen bg-[#05050a] font-body text-white selection:bg-white selection:text-black overflow-x-hidden" ref={containerRef}>
      <Hero3DBackground />
      <Navbar />
      
      <ScrollHUD />
      <VerticalScrubber />

      <HeroSection autoDownload={downloadQuery && isSignedIn} />

      {/* Technical Schematic Sections (8bit.ai style) */}
      <section className="relative px-6 py-60 md:px-10 z-10 bg-transparent">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(#7c3aed 1px, transparent 0)',
            backgroundSize: '40px 40px'
         }}></div>

        <div className="max-w-[1400px] mx-auto">
          <div className="mb-40 flex flex-col md:flex-row justify-between items-end gap-10">
            <div>
              <div className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.6em] text-[#7c3aed]">Technical Specifications // v1.0.4</div>
              <h2 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold tracking-[-0.05em] leading-[0.85]">Structural <br/><span className="text-white/20 italic font-medium">Precision.</span></h2>
            </div>
            <p className="max-w-[400px] text-white/40 text-xl leading-relaxed text-right md:mb-12">
              Aether operates at the intersection of logical certainty and neural inference. Local-first, high-precision, zero-latency.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-40">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-20 items-center`}>
                <div className="w-full lg:w-1/2">
                   <div className="mb-8 flex items-center gap-4">
                      <div className="px-3 py-1 bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed] font-mono text-[9px] font-bold tracking-[0.2em] rounded">{f.tag}</div>
                      <div className="h-px flex-1 bg-white/5"></div>
                   </div>
                   <h3 className="font-display text-5xl font-extrabold tracking-tighter mb-8">{f.title}</h3>
                   <p className="text-white/40 text-2xl leading-relaxed mb-12 max-w-[500px]">{f.desc}</p>
                </div>

                <div className="w-full lg:w-1/2 relative group">
                  <div className="absolute -inset-10 bg-[#7c3aed]/5 blur-[100px] opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#0a0a0f] p-3 transition duration-700 group-hover:border-white/20 group-hover:scale-[1.01 shadow-2xl]">
                    <img src={f.img} alt={f.title} className="w-full h-auto rounded-[2.5rem] opacity-70 group-hover:opacity-100 transition duration-700" />
                    
                    {/* HUD Overlay Elements */}
                    <div className="absolute top-10 right-10 flex gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-[#7c3aed] animate-pulse"></div>
                       <div className="h-1.5 w-1.5 rounded-full bg-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Mantis/Nomercy style CTA */}
      <section className="relative py-60 bg-transparent border-t border-white/5">
        <div className="max-w-[1400px] mx-auto text-center">
            <h2 className="font-display text-[clamp(2.5rem,8vw,7rem)] font-extrabold tracking-[-0.05em] leading-[0.85] mb-20">
              The neural layer <br/><span className="italic font-medium text-white/20">is Aether.</span>
            </h2>
            <div className="flex justify-center">
               <SmartDownload large className="hover:scale-105 transition-transform duration-500" />
            </div>
        </div>
      </section>

      <div className="relative z-10 border-t border-white/5">
        <Footer />
      </div>
    </div>
  )
}
