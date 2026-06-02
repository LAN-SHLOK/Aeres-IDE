import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const PLANS = [
  {
    name: 'Standard Package',
    price: '0',
    description: 'Perfect for individual developers and open source contributors.',
    features: [
      'Basic Aeres AI assistance',
      'Local static analysis',
      'Git UI integration',
      'Community support'
    ],
    buttonText: 'Get Started',
    premium: false,
    barColor: 'bg-[#ff8ba7]' // Pink titlebar
  },
  {
    name: 'Pro Package',
    price: '20',
    description: 'Advanced productivity for professionals and high-velocity teams.',
    features: [
      'Everything in Standard',
      'Advanced documentation scraper',
      'Production telemetry ingestion',
      'Mutation testing (idle CPU)',
      'Priority email support'
    ],
    buttonText: 'Upgrade to Pro',
    premium: true,
    barColor: 'bg-[#fef08a]' // Yellow titlebar
  },
  {
    name: 'Enterprise Package',
    price: '100',
    description: 'Scale intelligence across your entire organization.',
    features: [
      'Everything in Pro',
      'Private model fine-tuning',
      'SSO & Advanced Security',
      'Dedicated success manager',
      'Custom SLAs'
    ],
    buttonText: 'Contact Sales',
    premium: false,
    barColor: 'bg-[#2dd4bf]' // Teal titlebar
  }
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#09090e] font-body text-[#fffdf9] selection:bg-purple-500/20 selection:text-purple-300">
      <Navbar />
      
      <section className="relative pt-40 pb-32 px-6 md:px-10 overflow-hidden max-w-[1400px] mx-auto">
        
        {/* Floating developer star and bracket stickers */}
        <div className="absolute top-[20%] left-10 w-12 h-12 text-[#ff8ba7] hidden hidden md:block" style={{ animationDelay: '0.2s' }}>
          {/* Code Bracket SVG */}
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 3L1.5 12 8 21h3l-6.5-9L11 3H8zm8 0l6.5 9-6.5 9h-3l6.5-9-6.5-9h3z" />
          </svg>
        </div>
        <div className="absolute top-[15%] right-16 w-10 h-10 text-[#c084fc] hidden hidden md:block" style={{ animationDelay: '0.7s' }}>
          {/* Floppy Disk SVG */}
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 12v7H5v-7h14zm2-5.586v13.586a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h10.586a2 2 0 011.414.586l4 4zM17 12H7v6h10v-6zM15 4H5v4h10V4z" />
          </svg>
        </div>
        
        <div className="text-center mb-24 relative z-10 font-display">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border border-white/10 shadow-[3px_3px_0px_#000000] mb-8 font-mono">
            menu_pricing.json
          </span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold tracking-tight leading-[0.9] text-white"
          >
            Predictable <br/><span className="text-black bg-[#ff8ba7] border border-white/10 px-6 py-2.5 inline-block shadow-[5px_5px_0px_#000000] rounded-[2.5rem] italic font-bold mt-2">intelligence.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#fffdf9]/70 text-base max-w-[540px] mx-auto leading-relaxed font-sans font-semibold mt-6"
          >
            Transparent pricing for teams that crave speed and precision. No hidden fees, just pure, self-correcting logic.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-[1200px] mx-auto relative z-10">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {/* Cozy Dialog card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl h-full flex flex-col justify-between bg-[#13141f] border border-white/10">
                
                {/* Windows 95 Style Title Bar */}
                <div className={`${plan.barColor} border-b-4 border-black px-5 py-3 flex justify-between items-center font-display`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-black tracking-wide">{plan.name}</span>
                  </div>
                  {/* Cozy controls removed */}
                </div>

                {/* Main Card Content */}
                <div className="p-8 flex-1 flex flex-col justify-between bg-[#13141f]">
                  <div>
                    <div className="flex items-baseline gap-1 mb-6 font-display">
                      <span className="text-[3.5rem] font-bold tracking-tight text-white leading-none">${plan.price}</span>
                      <span className="text-white/40 text-sm font-bold">/mo</span>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed mb-8 font-sans font-bold">{plan.description}</p>
                    
                    <div className="space-y-4 mb-10">
                      {plan.features.map(feature => (
                        <div key={feature} className="flex items-center gap-3 text-xs text-white/80 font-sans font-bold">
                          {/* Retro check indicator */}
                          <div className="w-5 h-5 rounded-xl border border-white/10 bg-[#1b1c2b] flex items-center justify-center shadow-[2px_2px_0px_#000000] text-[#ff8ba7] font-black shrink-0 text-[10px]">
                            âœ“
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className={`w-full py-4 text-xs font-black uppercase tracking-wider ${plan.premium ? 'bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'kawaii-btn-cream bg-[#1b1c2b] text-white hover:bg-[#2c2d3e]'}`}>
                    {plan.buttonText}
                  </button>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

