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
        

        
        <div className="text-center mb-24 relative z-10 font-display">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border-[3px] border-black shadow-[4px_4px_0px_#000000] mb-8 font-mono">
            menu_pricing.json
          </span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold tracking-tight leading-[0.9] text-white"
          >
            Predictable <br/><span className="text-black bg-[#ff8ba7] px-6 py-2.5 inline-block rounded-full italic font-bold mt-2">intelligence.</span>
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
              <div className="border-[3px] border-black rounded-[2rem] h-full flex flex-col justify-between bg-[#13141f] overflow-hidden">
                
                {/* Windows 95 Style Title Bar */}
                <div className={`${plan.barColor} border-b-[3px] border-black px-5 py-3 flex justify-between items-center font-display`}>
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
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center font-black shrink-0 text-[8px] bg-[#09090e] ${plan.barColor.replace('bg-', 'text-')}`}>
                            âœ“
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className={`w-full py-4 rounded-full text-xs font-black uppercase tracking-wider transition-all border-[3px] border-black ${plan.premium ? 'bg-[#ff8ba7] text-black hover:bg-[#ff7a9b]' : 'bg-transparent text-white/40 hover:text-white/80'}`}>
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

