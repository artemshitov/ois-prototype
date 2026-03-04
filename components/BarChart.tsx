'use client'

import { ChartConfig, COLOR_CLASS } from '@/lib/data'

interface BarChartProps {
  cfg: ChartConfig
  activeDayIdx: number | null
  onBarHover: (cfg: ChartConfig, dayIdx: number, barEl: HTMLElement) => void
  yTopLabel: string
  yBottomLabel?: string
  barsRef?: React.RefObject<HTMLDivElement | null>
  chartKey?: string
}

export default function BarChart({
  cfg,
  activeDayIdx,
  onBarHover,
  yTopLabel,
  yBottomLabel = '0',
  barsRef,
  chartKey,
}: BarChartProps) {
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const bar = (e.target as HTMLElement).closest<HTMLElement>('.bar')
    if (!bar) return
    const idx = parseInt(bar.dataset['index'] ?? '0', 10)
    onBarHover(cfg, idx, bar)
  }

  return (
    <div className="chart-area">
      <div className="chart-container">
        <div className="y-axis">
          <span>{yTopLabel}</span>
          <span>{yBottomLabel}</span>
        </div>
        <div
          ref={barsRef}
          className={`bars${activeDayIdx !== null ? ' has-hover' : ''}`}
          onMouseMove={handleMouseMove}
        >
          {cfg.data.map((item, i) => (
            <div
              key={chartKey !== undefined ? `${chartKey}-${i}` : i}
              className={`bar${activeDayIdx === i ? ' day-highlighted' : ''}`}
              data-index={i}
            >
              <div className="bar-fill" style={{ height: Math.max(item.h, 2), transitionDelay: `${i * 7}ms`, animationDelay: `${i * 7}ms` }}>
                {cfg.keys.map(k => {
                  const flex = (item as Record<string, number>)[k] || 0
                  if (flex <= 0) return null
                  return (
                    <div
                      key={k}
                      className={`bar-segment ${COLOR_CLASS[k]}`}
                      style={{ flex }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
