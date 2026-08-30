import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import axios from 'axios'

interface Analysis {
  id: string
  filename: string
  label: string
  confidence: number
  risk_level: string
  created_at: string
}

export default function Dashboard() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [stats, setStats] = useState({ total: 0, genuine: 0, suspicious: 0, high_risk: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/analyses?limit=100')
        setAnalyses(res.data)
        
        const genuine = res.data.filter((a: Analysis) => a.label === 'real').length
        const suspicious = res.data.filter((a: Analysis) => a.label === 'synthetic').length
        const high_risk = res.data.filter((a: Analysis) => a.risk_level === 'high' || a.risk_level === 'critical').length
        
        setStats({
          total: res.data.length,
          genuine,
          suspicious,
          high_risk
        })
      } catch (error) {
        console.error('Failed to fetch analyses:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalyses()
  }, [])

  const statsCards = [
    { label: 'Total Analyses', value: stats.total, color: 'cyan' },
    { label: 'Genuine Voices', value: stats.genuine, color: 'green' },
    { label: 'Suspicious', value: stats.suspicious, color: 'orange' },
    { label: 'High Risk', value: stats.high_risk, color: 'red' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {statsCards.map(({ label, value, color }) => (
          <div key={label} className={`card bg-gradient-to-br from-${color}-900/20 to-${color}-800/10 border-${color}-700/50`}>
            <div className="text-sm text-slate-400 mb-1">{label}</div>
            <div className="text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Detection Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Genuine', value: stats.genuine, fill: '#22c55e' },
              { name: 'Synthetic', value: stats.suspicious, fill: '#ef4444' },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="value" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Analyses</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : analyses.length > 0 ? (
              analyses.slice(0, 5).map(analysis => (
                <div key={analysis.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex justify-between items-start">
                    <div className="text-sm">
                      <p className="font-medium">{analysis.filename}</p>
                      <p className="text-xs text-slate-400">{new Date(analysis.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      analysis.label === 'real' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                    }`}>
                      {analysis.label === 'real' ? 'Genuine' : 'Suspicious'}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Confidence: {(analysis.confidence * 100).toFixed(1)}%</span>
                    <span className="text-slate-400">Risk: {analysis.risk_level.toUpperCase()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No analyses yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
