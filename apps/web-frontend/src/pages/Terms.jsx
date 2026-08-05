import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#09090e] text-white font-sans selection:bg-[#ff8ba7] selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-[800px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-6">
            Terms of Service
          </h1>
          <div className="text-white/40 text-sm font-bold font-mono tracking-widest uppercase mb-12">
            Last Updated: August 5, 2026
          </div>

          <div className="prose prose-invert prose-p:text-white/70 prose-p:font-semibold prose-p:leading-relaxed prose-headings:font-display prose-headings:font-black prose-a:text-[#2dd4bf] max-w-none">
            <h2 className="text-2xl mt-12 mb-6">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using the Aeres IDE ("Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.
            </p>

            <h2 className="text-2xl mt-12 mb-6">2. License to Use</h2>
            <p>
              Aeres IDE is provided under the MIT License. You are free to use, modify, and distribute the Software, subject to the conditions detailed in the LICENSE file included in the source code repository.
            </p>

            <h2 className="text-2xl mt-12 mb-6">3. API Keys and Third-Party Services</h2>
            <p>
              The Software allows you to input your own API keys (e.g., Groq) to enable AI functionalities. You are solely responsible for keeping your API keys secure and for any charges incurred on your third-party accounts through the use of the Software.
            </p>
            
            <h2 className="text-2xl mt-12 mb-6">4. Disclaimer of Warranty</h2>
            <p>
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
