"use client"

import { Bar, BarChart, CartesianGrid, XAxis, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart'

export interface ChartResultData {
  type: string; // 'chart'
  chartType: string; // 'line' | 'bar' | 'area' | 'pie'
  data: { series: Record<string, unknown[]> };
}

interface Chart2Props {
  height?: number;
  result?: ChartResultData | null;
  loading?: boolean;
  error?: string | null;
}

export function Chart2({ height = 240, result, loading, error }: Chart2Props) {
  const safeHeight = Math.max(height, 120)

  if (loading) return <div className="text-xs text-gray-500">Ładowanie danych...</div>
  if (error) return <div className="text-xs text-red-500">Błąd: {error}</div>
  if (!result) return <div className="text-xs text-gray-500">Brak danych</div>

  const { series, } = result.data
  const keys = Object.keys(series)
  if (keys.length < 2) return <div className="text-xs text-gray-500">Nieprawidłowy format serii</div>
  const xKey = keys[0]
  const valueKeys = keys.slice(1)

  const len = series[xKey].length
  const data = Array.from({ length: len }).map((_, i) => {
    const row: Record<string, unknown> = {}
    keys.forEach(k => { row[k] = series[k][i] })
    return row
  })

  const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

  const sampleX = series[xKey][0]
  const isDateLike = typeof sampleX === 'string' && /\d{4}-\d{2}-\d{2}/.test(sampleX)
  const formatXTick = (val: unknown) => {
    if (isDateLike && typeof val === 'string') return val.slice(5)
    return String(val)
  }

  let chartNode: React.ReactNode = null
  switch (result.chartType) {
    case 'line':
    case 'linear':
      chartNode = (
        <LineChart accessibilityLayer data={data} >
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXTick} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          {valueKeys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={`var(--chart-${(i % 6) + 1})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          <Legend verticalAlign="top" height={24} />
        </LineChart>
      )
      break
    case 'bar':
      chartNode = (
        <BarChart accessibilityLayer data={data} >
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXTick} />
          <YAxis tickLine={false} axisLine={false}  width={56} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          {valueKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={`var(--chart-${(i % 6) + 1})`}
              radius={4}
              isAnimationActive={false}
            />
          ))}
          <Legend verticalAlign="top" height={24} />
        </BarChart>
      )
      break
    case 'area':
      chartNode = (
        <AreaChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXTick} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={56} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          {valueKeys.map((k, i) => (
            <Area
              key={k}
              dataKey={k}
              stroke={`var(--chart-${(i % 6) + 1})`}
              fill={`var(--chart-${(i % 6) + 1})`}
              strokeWidth={2}
              type="monotone"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
          ))}
          <Legend verticalAlign="top" height={24} />
        </AreaChart>
      )
      break
    case 'pie':
      const valueKey = valueKeys[0]
      chartNode = (
        <PieChart margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={xKey}
            outerRadius={Math.min(safeHeight / 2, 120)}
            isAnimationActive={false}
          >
            {data.map((_, i) => <Cell key={i} fill={`var(--chart-${(i % 6) + 1})`} />)}
          </Pie>
          <Legend />
        </PieChart>
      )
      break
    default:
      chartNode = <div className="text-xs text-gray-500">Nieobsługiwany typ wykresu: {result.chartType}</div>
  }

  return (
    <div className="w-full flex-1 flex items-stretch">
      <ChartContainer config={chartConfig} style={{ height: safeHeight, width: '100%' }} className="w-full">
        {chartNode}
      </ChartContainer>
    </div>
  )
}
