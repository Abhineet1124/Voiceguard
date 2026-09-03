import { useState, useEffect } from 'react'
import { Shield, BarChart3, FileAudio, AlertCircle } from 'lucide-react'
import Dashboard from "./Dashboard";
import AnalysisPage from "./AnalysisPage";
import axios from 'axios'

type Page = 'dashboard' | 'analyze' | 'incidents' | 'analytics'

interface HealthStatus {
  status: string
  database: string
  model_status: string
  version: string
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
  const checkHealth = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/health')
      setHealth(res.data)
      setConnected(true)
    } catch (error) {
      console.error('Backend health check failed:', error)
      setConnected(false)
    }
  }

  checkHealth()

  // Check every 15 seconds instead of every 5 seconds
  const interval = setInterval(checkHealth, 15000)

  return () => clearInterval(interval)
}, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-500" />
            <div>
              <h1 className="text-2xl font-bold">VoiceGuard</h1>
              <p className="text-xs text-slate-400">Detect. Verify. Prevent.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{connected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!connected && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium">Backend not connected</p>
              <p className="text-sm text-slate-400">Ensure FastAPI is running on http://localhost:8000</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { id: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3 },
            { id: 'analyze' as Page, label: 'Analyze Voice', icon: FileAudio },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`p-4 rounded-lg border transition-all ${
                currentPage === id
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-2" />
              <div className="text-sm font-medium">{label}</div>
            </button>
          ))}
        </div>

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'analyze' && <AnalysisPage />}
      </div>
    </div>
  )
}
