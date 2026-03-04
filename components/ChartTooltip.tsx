import type React from 'react'
import type { RefObject } from 'react'
import { type ChartConfig, COLOR_HEX } from '@/lib/data'
import { formatNum } from '@/lib/utils'

export interface ActiveBar {
  cfg: ChartConfig
  dayIdx: number
}

export interface TooltipPos {
  left: number
  top: number
}

interface ChartTooltipProps {
  activeBar: ActiveBar | null
  tooltipPos: TooltipPos | null
  boxRef: RefObject<HTMLDivElement | null>
  width?: number
  dateLabel?: string
}

export default function ChartTooltip({ activeBar, tooltipPos, boxRef, width = 340, dateLabel }: ChartTooltipProps) {
  if (!activeBar) return null

  const { cfg, dayIdx } = activeBar
  const data = cfg.data[dayIdx]
  const scale = cfg.yMax / 100
  const dec = cfg.unit ? 2 : 0

  const rows = cfg.keys.map(k => ({
    k,
    val: ((data as Record<string, number>)[k] || 0) * scale,
    label: cfg.labels[k] ?? '',
  }))

  const wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 120,
    pointerEvents: 'none',
    left: tooltipPos?.left ?? 0,
    top: tooltipPos?.top ?? 0,
    visibility: tooltipPos ? 'visible' : 'hidden',
  }

  return (
    <div style={wrapperStyle}>
      <div className="tooltip-box" ref={boxRef} style={{ width }}>
        {dateLabel && (
          <div className="tooltip-header">
            <span className="tooltip-date">{dateLabel}</span>
          </div>
        )}
        <div className="tooltip-rows">
          {rows.map(({ k, val, label }) => (
            <div key={k} className="tooltip-row">
              <div className="tooltip-dot" style={{ background: COLOR_HEX[k] }} />
              <div className="tooltip-param">
                <span className="tooltip-param-text">{label}</span>
                <div className="tooltip-dash-line" />
              </div>
              <span className="tooltip-value">
                {formatNum(val, dec)}{cfg.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
