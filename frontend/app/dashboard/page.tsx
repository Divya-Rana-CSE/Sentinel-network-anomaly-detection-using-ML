'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { StatsCard } from '@/components/dashboard/stats-card'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card } from '@/components/ui/card'
import { Activity, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Alert {
  timestamp: string
  prediction: string
  confidence: number
  protocol: string
  service: string
  flag: string
  description: string | null
}

interface DashboardData {
  totals: {
    total: number
    attacks: number
    normal: number
    attack_rate: number
    last_detection: string | null
  }
  by_class: Record<string, number>
  timeseries: Array<{ minute: string; total: number; attacks: number }>
  recent_alerts: Alert[]
}

const API = 'http://localhost:5000'

const CLASS_COLORS: Record<string, string> = {
  Normal: '#00ffcc',
  DoS: '#ff4444',
  Probe: '#ffaa00',
  R2L: '#ff66cc',
  U2R: '#aa44ff',
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return 'No data yet'
  const t = new Date(ts.replace(' ', 'T')).getTime()
  if (isNaN(t)) return ts
  const diff = Date.now() - t
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  return ts
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch(`${API}/api/dashboard`)
        if (!res.ok) throw new Error('fetch failed')
        const json: DashboardData = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Backend unreachable. Is the Flask server running?')
      }
    }
    fetchData()
    const id = setInterval(fetchData, 3000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const totals = data?.totals
  const distribution = Object.entries(data?.by_class ?? {}).map(([name, value]) => ({
    name,
    value,
    fill: CLASS_COLORS[name] ?? '#888',
  }))
  const timeseries = data?.timeseries ?? []
  const alerts = data?.recent_alerts ?? []

  return (
    <ProtectedRoute requiresDetection={true}>
      <AppLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time view of all detections from uploads and live streaming
            </p>
          </div>

          {error && (
            <Card className="p-4 border-destructive/50 bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={<Activity className="w-6 h-6" />}
              label="Total Connections"
              value={(totals?.total ?? 0).toLocaleString()}
              subtext="analyzed"
            />
            <StatsCard
              icon={<AlertTriangle className="w-6 h-6" />}
              label="Attacks Detected"
              value={(totals?.attacks ?? 0).toLocaleString()}
              subtext={`${totals?.attack_rate ?? 0}% of traffic`}
            />
            <StatsCard
              icon={<ShieldCheck className="w-6 h-6" />}
              label="Normal Traffic"
              value={(totals?.normal ?? 0).toLocaleString()}
              subtext="benign connections"
            />
            <StatsCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Last Detection"
              value={formatRelativeTime(totals?.last_detection ?? null)}
              subtext="most recent"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Series */}
            <Card className="lg:col-span-2 p-6 border-border bg-card">
              <h2 className="text-lg font-semibold mb-4">Detections Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="minute" stroke="hsl(0 0% 50%)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(0 0% 50%)" style={{ fontSize: '12px' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 10%)',
                      border: '1px solid hsl(0 0% 20%)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="hsl(186 100% 50%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attacks"
                    name="Attacks"
                    stroke="hsl(0 84% 60%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              {timeseries.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  No detections yet — upload a file or start the live stream
                </p>
              )}
            </Card>

            {/* Class Distribution */}
            <Card className="p-6 border-border bg-card">
              <h2 className="text-lg font-semibold mb-4">Class Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {distribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 10%)',
                      border: '1px solid hsl(0 0% 20%)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {distribution.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  No data yet
                </p>
              )}
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Attack Alerts</h2>
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attacks recorded yet
                </p>
              )}
              {alerts.map((alert, idx) => (
                <div
                  key={`${alert.timestamp}-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-destructive animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      <span className="text-destructive">{alert.prediction}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="font-mono">{alert.protocol}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="font-mono">{alert.service}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="font-mono">{alert.flag}</span>
                    </p>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.timestamp} · confidence {alert.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
