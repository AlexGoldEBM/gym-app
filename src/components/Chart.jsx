import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function MiniLine({ data, dataKey, color = '#3b82f6', unit = '' }) {
  if (!data || data.length < 2) {
    return <div className="h-40 grid place-items-center text-gray-600 text-sm">Not enough data to chart yet</div>
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#2a2a2a" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#aaa' }}
          formatter={(v) => [`${v}${unit}`, '']} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
