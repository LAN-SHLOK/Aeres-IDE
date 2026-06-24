import { SignOutButton, useAuth, useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import SmartDownload from '../components/SmartDownload.jsx'
import { setAuthToken } from '../utils/apiClient.js'
import Navbar from '../components/Navbar.jsx'

export default function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    getToken().then((token) => {
      if (token) setAuthToken(token)
    })
  }, [getToken])

  // 1. Expressive split character words for welcome header
  const renderExpressiveHeader = () => {
    const text = `Welcome, ${user?.firstName || 'developer'}`
    return text.split(" ").map((word, i) => (
      <span
        key={i}
        className="char-reveal inline-block text-white animate-pulse"
        style={{ animationDelay: `${i * 0.1}s` }}
      >
        {word}&nbsp;
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-[#09090e] font-body text-[#fffdf9] selection:bg-purple-500/20 selection:text-purple-300 pb-20">
      
      {/* Floating Glassmorphic Ambient Bubble in the Dashboard background */}
      <div className="absolute top-[20%] left-[8%] w-24 h-24 rounded-full glassmorphic-layer pointer-events-none hidden hidden md:block" style={{ animationDelay: '0.2s' }} />

      <Navbar />

      <div className="mx-auto max-w-2xl pt-40 px-6 relative z-10">
        
        {/* Welcome Header Badge */}
        <div className="text-center mb-12 font-display">
          <span className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black bg-[#fae3d9] border border-white/10 shadow-[3px_3px_0px_#000000] mb-6 font-mono">
            control_panel
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {renderExpressiveHeader()}
          </h1>
          <p className="mt-6 text-white/60 text-sm font-semibold max-w-md mx-auto leading-relaxed">
            Your Aeres workspace credentials are fully provisioned and ready for local development.
          </p>
        </div>

        {/* Dashboard Control Box styled as Kawaii Y2K Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mb-8 bg-[#13141f] border border-white/10">
          {/* Custom Window Title bar */}
          <div className="bg-[#fef08a] border-b-4 border-black px-5 py-3 flex justify-between items-center font-display">
            <span className="text-xs font-black uppercase text-black tracking-wide">user_credentials.log</span>
            {/* Cozy controls removed */}
          </div>

          <div className="p-8 bg-[#13141f]">
            <div className="flex flex-col sm:flex-row gap-6 justify-between sm:items-center">
              
              {/* Account Email details with Neumorphic pressed overlay */}
              <div className="flex-1">
                <span className="text-[10px] font-black text-white/40 tracking-wider uppercase font-mono block mb-1">REGISTERED EMAIL</span>
                <div className="bg-[#09090e] border border-white/10 px-4 py-2.5 rounded-full text-xs font-black truncate max-w-xs sm:max-w-sm text-white select-all">
                  {user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>

              {/* Status badge */}
              <div className="shrink-0">
                <span className="text-[10px] font-black text-white/40 tracking-wider uppercase font-mono block mb-1">DAEMON STATUS</span>
                <div className="bg-[#2dd4bf] border border-white/10 shadow-[2.5px_2.5px_0px_#000000] text-black px-5 py-2.5 rounded-full text-xs font-black inline-flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ACTIVE
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Download Box Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl bg-[#13141f] border border-white/10">
          <div className="bg-[#2dd4bf] border-b-4 border-black px-5 py-3 flex justify-between items-center font-display">
            <span className="text-xs font-black uppercase text-black tracking-wide">install_packages</span>
            {/* Cozy controls removed */}
          </div>

          <div className="p-8 bg-[#13141f]">
            <h2 className="font-display text-xl font-black text-white mb-2">Download Aeres Desktop</h2>
            <p className="text-white/60 text-xs font-semibold leading-relaxed mb-6 font-sans">
              Choose your operating system architecture bundle below. Run the compiled asset to spin up your local multi-agent workspace.
            </p>

            {/* SmartDownload button - now perfectly styled without nested layout double border bug */}
            <div className="mb-6 flex justify-center">
              <SmartDownload className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-6 py-3.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-xs uppercase tracking-wider font-display font-bold transition-all hover:-translate-y-0.5" />
            </div>

            {/* Verification instruction block */}
            <div className="bg-[#1b1c2b] border border-white/10 p-4 rounded-3xl relative overflow-hidden font-sans">
              <span className="text-[#ff8ba7] font-black text-xs block mb-1 font-display">Launching Instruction</span>
              <span className="text-white/65 text-[11px] font-bold leading-relaxed block">
                After installing, launch Aeres IDE client and choose &quot;Login via Browser&quot; inside the sidebar to automatically sync and register this workspace account.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

