import { useStore } from '../store'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'

const SEV_COLOR = { critical: 'var(--critical)', moderate: 'var(--moderate)', low: 'var(--low)' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border2)',
      borderRadius: 6, padding: '8px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || p.stroke, marginBottom: 2 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 18, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color || 'var(--accent)' }} />
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: color || 'var(--accent)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const alerts      = useStore(s => s.alerts)
  const hourlyStats = useStore(s => s.hourlyStats)
  const stats       = useStore(s => s.stats)

  // Compute species distribution
  const speciesCounts = {}
  alerts.forEach(a => {
    const s = a.detection?.species
    if (s) speciesCounts[s] = (speciesCounts[s] || 0) + 1
  })
  const pieData = Object.entries(speciesCounts).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['var(--critical)', 'var(--moderate)', 'var(--low)', '#00e5a0', '#a855f7', '#ec4899']

  // Severity breakdown
  const sevCounts = {
    critical: alerts.filter(a => a.detection?.severity === 'critical').length,
    moderate: alerts.filter(a => a.detection?.severity === 'moderate').length,
    low:      alerts.filter(a => a.detection?.severity === 'low').length,
  }

  const hourlyData = hourlyStats?.buckets ?? []

  // Detection rate over time (cumulative from hourly)
  let cum = 0
  const trendData = hourlyData.map(b => {
    const total = (b.snake || 0) + (b.cat || 0) + (b.pest || 0) + (b.other || 0)
    cum += total
    return { hour: b.hour, total, cumulative: cum }
  })

  const totalDetections = alerts.length
  const ackRate = totalDetections > 0 ? Math.round((alerts.filter(a => a.acknowledged).length / totalDetections) * 100) : 0
  const avgConf = totalDetections > 0
    ? Math.round((alerts.reduce((s, a) => s + (a.detection?.confidence ?? 0), 0) / totalDetections) * 100)
    : 0

  return (
    <main style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Analytics
      </h2>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatBox label="Total Detections" value={totalDetections} color="var(--accent)" sub="All time" />
        <StatBox label="Critical" value={sevCounts.critical} color="var(--critical)" sub={`${Math.round((sevCounts.critical/Math.max(totalDetections,1))*100)}% of total`} />
        <StatBox label="Ack Rate" value={`${ackRate}%`} color="var(--accent)" sub="Acknowledged" />
        <StatBox label="Avg Confidence" value={`${avgConf}%`} color="var(--low)" sub="Detection accuracy" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Hourly bar chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Detections by Hour
          </div>
          <div style={{ padding: 16 }}>
            {hourlyData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={hourlyData} barSize={5} barGap={1}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="snake" fill="var(--critical)" radius={[2,2,0,0]} name="Snake" stackId="a" />
                  <Bar dataKey="cat"   fill="var(--moderate)" radius={[2,2,0,0]} name="Cat"   stackId="a" />
                  <Bar dataKey="pest"  fill="var(--low)" radius={[2,2,0,0]} name="Pest"  stackId="a" />
                  <Bar dataKey="other" fill="var(--muted)" radius={[2,2,0,0]} name="Other" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Species pie */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Species Distribution
          </div>
          <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>No detections yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`} labelLine={false} fontSize={9}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Trend line */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Detection Trend (Cumulative)
        </div>
        <div style={{ padding: '16px 18px' }}>
          {trendData.every(d => d.total === 0) ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={trendData}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Line type="monotone" dataKey="cumulative" stroke="var(--accent)" strokeWidth={2} dot={false} name="Cumulative" />
                <Line type="monotone" dataKey="total" stroke="var(--critical)" strokeWidth={1.5} dot={false} name="Per Hour" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Severity breakdown */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Severity Breakdown
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(sevCounts).map(([sev, count]) => {
            const pct = totalDetections > 0 ? (count / totalDetections) * 100 : 0
            return (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: SEV_COLOR[sev], textTransform: 'uppercase', width: 70 }}>{sev}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--border2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: SEV_COLOR[sev], borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', width: 40, textAlign: 'right' }}>{count}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', width: 36 }}>{Math.round(pct)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}