'use client'

import { useState, useEffect, useRef } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Zap, Activity, Play, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RecentItem {
  timestamp: string
  prediction: string
  confidence: number
  is_attack?: boolean
  protocol: string
  service: string
  flag: string
  description?: string | null
  recommendation?: string | null
}

interface StreamStatus {
  running: boolean
  started_at: string | null
  interval: number
  total: number
  attacks: number
  normal: number
  attack_rate: number
  recent: RecentItem[]
}

interface ChartPoint {
  timestamp: string
  normalTraffic: number
  anomalousTraffic: number
}

const API = 'http://localhost:5000'

export default function LiveMonitoringPage() {
  const [status, setStatus] = useState<StreamStatus | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastTotalsRef = useRef({ normal: 0, attacks: 0 })

  // Poll status every 2s
  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API}/api/stream/status`)
        if (!res.ok) throw new Error('status fetch failed')
        const data: StreamStatus = await res.json()
        if (cancelled) return
        setStatus(data)
        setError(null)

        // Build a rolling chart of deltas per poll window
        const last = lastTotalsRef.current
        const dNormal = Math.max(0, data.normal - last.normal)
        const dAttacks = Math.max(0, data.attacks - last.attacks)
        if (data.running) {
          setChartData((prev) => {
            const next = [
              ...prev,
              {
                timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                normalTraffic: dNormal,
                anomalousTraffic: dAttacks,
              },
            ]
            return next.slice(-20)
          })
        }
        // If session was reset (total dropped to 0), reset baselines + chart
        if (data.total === 0) {
          lastTotalsRef.current = { normal: 0, attacks: 0 }
          setChartData([])
        } else {
          lastTotalsRef.current = { normal: data.normal, attacks: data.attacks }
        }
      } catch (e: any) {
        if (!cancelled) setError('Backend unreachable. Is the Flask server running?')
      }
    }

    fetchStatus()
    const id = setInterval(fetchStatus, 2000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const startStream = async () => {
    setBusy(true)
    try {
      await fetch(`${API}/api/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: 1.5 }),
      })
      lastTotalsRef.current = { normal: 0, attacks: 0 }
      setChartData([])
    } catch (e) {
      setError('Failed to start stream')
    } finally {
      setBusy(false)
    }
  }

  const stopStream = async () => {
    setBusy(true)
    try {
      await fetch(`${API}/api/stream/stop`, { method: 'POST' })
    } catch (e) {
      setError('Failed to stop stream')
    } finally {
      setBusy(false)
    }
  }

  const isRunning = !!status?.running
  const total = status?.total ?? 0
  const attacks = status?.attacks ?? 0
  const normal = status?.normal ?? 0
  const attackRate = status?.attack_rate ?? 0
  const recent = status?.recent ?? []

  return (
    <ProtectedRoute requiresDetection={true}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Live Monitoring</h1>
              <p className="text-muted-foreground mt-1">
                Simulated live feed — predictions are real, traffic is streamed from held-out test data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-sm font-medium">
                  {isRunning ? 'Stream Active' : 'Stream Idle'}
                </span>
              </div>
              {isRunning ? (
                <Button onClick={stopStream} disabled={busy} variant="outline" className="border-destructive/50 hover:bg-destructive/10">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={startStream} disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Play className="w-4 h-4 mr-2" />
                  Start Stream
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Card className="p-4 border-destructive/50 bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1">Total Processed</p>
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground mt-1">this session</p>
            </Card>
            <Card className="p-4 border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1">Normal</p>
              <p className="text-2xl font-bold text-foreground">{normal}</p>
              <p className="text-xs text-green-500 mt-1">benign connections</p>
            </Card>
            <Card className="p-4 border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1">Attacks</p>
              <p className="text-2xl font-bold text-foreground">{attacks}</p>
              <p className="text-xs text-destructive mt-1">flagged threats</p>
            </Card>
            <Card className="p-4 border-border bg-card">
              <p className="text-sm text-muted-foreground mb-1">Attack Rate</p>
              <p className="text-2xl font-bold text-foreground">{attackRate.toFixed(1)}%</p>
              <p className={`text-xs mt-1 ${attackRate > 50 ? 'text-destructive' : 'text-green-500'}`}>
                {attackRate > 50 ? 'HIGH' : 'NORMAL'}
              </p>
            </Card>
          </div>

          {/* Live Chart */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Traffic Per Poll Window</h2>
              <Badge variant="outline" className={isRunning ? 'animate-pulse' : ''}>
                <Zap className="w-3 h-3 mr-1" />
                {isRunning ? 'Live' : 'Idle'}
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="hsl(0 0% 50%)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="hsl(0 0% 50%)"
                  style={{ fontSize: '12px' }}
                  allowDecimals={false}
                  label={{ value: 'Connections', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 10%)',
                    border: '1px solid hsl(0 0% 20%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar
                  dataKey="normalTraffic"
                  name="Normal"
                  fill="hsl(164 100% 50%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="anomalousTraffic"
                  name="Attack"
                  fill="hsl(0 84% 60%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            {chartData.length === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {isRunning ? 'Collecting first samples...' : 'Click "Start Stream" to begin'}
              </p>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 border-border bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Predictions
            </h2>
            <div className="space-y-2">
              {recent.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No predictions yet
                </p>
              )}
              {recent.map((item, idx) => {
                const label = (item.prediction || '').toLowerCase()
                const isAttack = item.is_attack ?? (label !== 'normal' && label !== '0' && label !== '')
                return (
                  <div
                    key={`${item.timestamp}-${idx}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border hover:border-primary/50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                        isAttack ? 'bg-destructive' : 'bg-green-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        <span className={isAttack ? 'text-destructive' : 'text-green-500'}>
                          {item.prediction}
                        </span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-mono">{item.protocol}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-mono">{item.service}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-mono">{item.flag}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.timestamp} · confidence {item.confidence.toFixed(1)}%
                      </p>
                      {isAttack && item.description && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-foreground">
                            <span className="text-muted-foreground">Why: </span>
                            {item.description}
                          </p>
                          {item.recommendation && (
                            <p className="text-xs text-foreground">
                              <span className="text-muted-foreground">Action: </span>
                              {item.recommendation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
