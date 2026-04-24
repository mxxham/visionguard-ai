import { useStore } from '../store'
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
      fontFamily: 'var(--font-mono)', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill, marginBottom: 3 }}>
          {p.name}: <strong>{p.value}</strong>
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
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            Detection Activity
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Today by hour</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          {[
            { color: 'var(--critical)', label: 'Snake' },
            { color: 'var(--moderate)', label: 'Cat' },
            { color: 'var(--low)', label: 'Pest' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)', fontWeight: 500 }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 3, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 12px' }}>
        {!hasData ? (
          <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
            No detections today
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={110}>
            <ReBarChart data={data} barSize={5} barGap={2}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'IBM Plex Mono' }}
                axisLine={false} tickLine={false}
                interval={1}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
              <Bar dataKey="snake" fill="#dc2626" radius={[3, 3, 0, 0]} name="Snake" />
              <Bar dataKey="cat"   fill="#d97706" radius={[3, 3, 0, 0]} name="Cat" />
              <Bar dataKey="pest"  fill="#2563eb" radius={[3, 3, 0, 0]} name="Pest" />
              <Bar dataKey="other" fill="#94a3b8" radius={[3, 3, 0, 0]} name="Other" />
            </ReBarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
