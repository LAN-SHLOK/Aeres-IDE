export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-[#13141f] border-t-4 border-black font-display text-white px-6 py-8 md:px-12 relative overflow-hidden">

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col items-start col-span-1 md:col-span-1">
            <span className="font-black text-2xl tracking-tighter mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-[#ff8ba7] rounded-full"></div>
              Aeres
            </span>
            <p className="text-white/60 text-xs font-semibold leading-relaxed font-sans mb-6">
              A high-fidelity development sandbox built for offline-first speed, intelligence, and seamless code orchestration.
            </p>
            <div className="flex gap-3">
              {['Twitter', 'GitHub', 'Discord'].map((social, i) => (
                <button key={i} className="px-3 py-1.5 rounded-lg bg-[#1b1c2b] text-[10px] font-black uppercase hover:bg-[#ff8ba7] hover:text-black transition-colors">
                  {social}
                </button>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-black text-[#2dd4bf] uppercase tracking-wider text-[11px] mb-2 font-mono">Product</h4>
            {['Download', 'Pricing', 'Changelog', 'Extensions'].map((link, i) => (
              <a key={i} href="#" className="text-white/60 text-xs font-bold hover:text-white transition-colors">{link}</a>
            ))}
          </div>

          {/* Links Column 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-black text-[#fef08a] uppercase tracking-wider text-[11px] mb-2 font-mono">Resources</h4>
            {['Documentation', 'API Reference', 'Community', 'Blog'].map((link, i) => (
              <a key={i} href="#" className="text-white/60 text-xs font-bold hover:text-white transition-colors">{link}</a>
            ))}
          </div>

          {/* Links Column 3 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-black text-[#c084fc] uppercase tracking-wider text-[11px] mb-2 font-mono">Legal</h4>
            {['Privacy Policy', 'Terms of Service', 'Security', 'License'].map((link, i) => (
              <a key={i} href="#" className="text-white/60 text-xs font-bold hover:text-white transition-colors">{link}</a>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t-2 border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-white/40">
          <span>Â© {year} Aeres IDE. All rights reserved.</span>
          <span className="uppercase tracking-widest font-black text-[#ff8ba7]">
            Code at the speed of thought.
          </span>
        </div>
      </div>
    </footer>
  )
}

