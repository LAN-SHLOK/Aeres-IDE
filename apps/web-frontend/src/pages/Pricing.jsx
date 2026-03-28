import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const PLANS = [
  {
    name: 'Standard',
    price: '0',
    description: 'Perfect for individual developers and open source contributors.',
    features: [
      'Basic Aether AI assistance',
      'Local static analysis',
      'Git UI integration',
      'Community support'
    ],
    buttonText: 'Get Started',
    premium: false
  },
  {
    name: 'Pro',
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
    premium: true
  },
  {
    name: 'Enterprise',
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
    premium: false
  }
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#05050a] font-body text-white selection:bg-white selection:text-black">
      <Navbar />
      
      <section className="relative pt-40 pb-32 px-6 md:px-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#7c3aed] opacity-[0.05] blur-[120px] pointer-events-none rounded-[100%]"></div>
        
        <div className="max-w-[1200px] mx-auto text-center mb-24 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold tracking-tighter leading-[0.9] mb-8"
          >
            Predictable <br/><span className="text-white/20 italic font-medium">intelligence.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/40 text-[1.25rem] max-w-[600px] mx-auto leading-relaxed"
          >
            Transparent pricing for teams that crave speed and precision. No hidden fees, just pure logic.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1240px] mx-auto relative z-10">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0f]/40 backdrop-blur-3xl p-10 flex flex-col justify-between ${plan.premium ? 'border-white/20 shadow-[0_0_50px_rgba(124,58,237,0.15)] ring-1 ring-white/10' : ''}`}
            >
              {plan.premium && (
                <div className="absolute top-6 right-6 inline-flex rounded-full bg-[#7c3aed] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Most Popular
                </div>
              )}
              
              <div>
                <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[3.5rem] font-bold tracking-tighter">${plan.price}</span>
                  <span className="text-white/30 text-sm">/mo</span>
                </div>
                <p className="text-white/40 text-sm leading-relaxed mb-8">{plan.description}</p>
                
                <div className="space-y-4 mb-10">
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-center gap-3 text-sm text-white/70">
                      <svg className="h-4 w-4 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <button className={`w-full rounded-2xl py-4 font-bold text-sm transition-all duration-300 ${plan.premium ? 'bg-white text-black hover:scale-[1.02]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>
                {plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
