import { useStore } from '../store'
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border2)',
      borderRadius: 6, padding: '8px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill, marginBottom: 2 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export default function BarChart() {
  const hourlyStats = useStore(s => s.hourlyStats)

  const data = hourlyStats?.buckets ?? []
  const hasData = data.some(b => b.snake + b.cat + b.pest + b.other > 0)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Detection Activity · Today
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
          {[
            { color: 'var(--critical)', label: 'Snake' },
            { color: 'var(--moderate)', label: 'Cat' },
            { color: 'var(--low)', label: 'Pest' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
              <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {!hasData ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
            No detections today
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={100}>
            <ReBarChart data={data} barSize={4} barGap={1}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: '#6b7380', fontFamily: 'Space Mono' }}
                axisLine={false} tickLine={false}
                interval={1}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="snake" fill="#ff4444" radius={[2, 2, 0, 0]} name="Snake" />
              <Bar dataKey="cat"   fill="#ffaa00" radius={[2, 2, 0, 0]} name="Cat" />
              <Bar dataKey="pest"  fill="#4488ff" radius={[2, 2, 0, 0]} name="Pest" />
              <Bar dataKey="other" fill="#6b7380" radius={[2, 2, 0, 0]} name="Other" />
            </ReBarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
