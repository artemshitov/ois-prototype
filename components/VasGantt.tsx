'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatNum } from '@/lib/utils'

interface VasEntry {
  name: string
  startTime: number
  endTime: number
  price: number
  icon: { default: string }
}

const BARS_W = 603  // px, matches .bars width

interface Segment {
  leftPct: number
  widthPct: number
  price: number
  showIcon: boolean
  iconUrl: string
  stitchedLeft: boolean
  stitchedRight: boolean
  vasEntry: VasEntry
}

interface Row {
  name: string
  segments: Segment[]
}

interface Props {
  vases: VasEntry[]
  windowStart: number  // Unix timestamp (UTC) of start of first displayed day
  windowEnd: number    // Unix timestamp (UTC) of start of day after last displayed day
}

const ROW_H   = 18
const ROW_GAP = 8

const MONTH_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatTs(ts: number): string {
  const d = new Date(ts * 1000)
  const day = d.getDate()
  const mon = MONTH_GEN[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${mon} ${hh}:${mm}`
}

export default function VasGantt({ vases, windowStart, windowEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number; ts: number; hoveredVas: VasEntry } | null>(null)

  if (!vases.length) return null

  const toPct = (ts: number) => Math.max(0, Math.min(1, (ts - windowStart) / (windowEnd - windowStart)))

  const rowMap = new Map<string, VasEntry[]>()
  for (const v of vases) {
    if (!rowMap.has(v.name)) rowMap.set(v.name, [])
    rowMap.get(v.name)!.push(v)
  }

  const rows: Row[] = []
  for (const [name, group] of rowMap) {
    const sorted = [...group].sort((a, b) => a.startTime - b.startTime)
    const segments: Segment[] = sorted.map((v, i) => {
      const leftPct      = toPct(v.startTime)
      const rightPct     = toPct(v.endTime)
      const stitchedLeft  = i > 0 && sorted[i - 1].endTime === v.startTime
      const stitchedRight = i < sorted.length - 1 && v.endTime === sorted[i + 1].startTime
      return {
        leftPct,
        widthPct: rightPct - leftPct,
        price: v.price,
        showIcon: !stitchedLeft,
        iconUrl: v.icon.default,
        stitchedLeft,
        stitchedRight,
        vasEntry: v,
      }
    })
    rows.push({ name, segments })
  }

  const totalH = rows.length * ROW_H + Math.max(0, rows.length - 1) * ROW_GAP

  const activeVasList = tooltipAnchor
    ? [...vases]
        .filter(v => v === tooltipAnchor.hoveredVas || (v.startTime <= tooltipAnchor.ts && v.endTime > tooltipAnchor.ts))
        .sort((a, b) => a.startTime - b.startTime)
    : []

  return (
    <div ref={containerRef} style={{ position: 'relative', height: totalH }}>
      {rows.map((row, ri) => (
        <div
          key={row.name}
          style={{ position: 'absolute', top: ri * (ROW_H + ROW_GAP), left: 0, right: 0, height: ROW_H }}
        >
          <div style={{ position: 'relative', width: '100%', height: ROW_H }}>
            {row.segments.map((seg, si) => {
              const GAP = 2
              const minWidthPct = 18 / BARS_W
              const gapPct    = GAP / BARS_W
              const leftPct   = seg.leftPct  + (seg.stitchedLeft  ? gapPct : 0)
              const rawWidthPct = seg.widthPct - (seg.stitchedLeft ? gapPct : 0)
              const widthPct  = !seg.stitchedRight ? Math.max(rawWidthPct, minWidthPct) : rawWidthPct
              const widthPx   = widthPct * BARS_W
              const showPrice = seg.price > 0 && widthPx > (seg.showIcon ? 40 : 28)
              const rL = seg.stitchedLeft  ? 4 : 10
              const rR = seg.stitchedRight ? 4 : 10
              return (
                <div
                  key={si}
                  onMouseMove={(e) => {
                    const containerRect = containerRef.current?.getBoundingClientRect()
                    if (!containerRect) return
                    const ts = windowStart + (e.clientX - containerRect.left) / containerRect.width * (windowEnd - windowStart)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltipAnchor({ x: e.clientX, y: rect.top, ts, hoveredVas: seg.vasEntry })
                  }}
                  onMouseLeave={() => setTooltipAnchor(null)}
                  style={{
                    position: 'absolute',
                    left: `${leftPct * 100}%`,
                    width: `${widthPct * 100}%`,
                    height: ROW_H,
                    background: '#D2FCC4',
                    borderRadius: `${rL}px ${rR}px ${rR}px ${rL}px`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: seg.showIcon ? 1 : 6,
                    paddingRight: 6,
                    gap: 3,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    cursor: 'default',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {seg.showIcon && <img src={seg.iconUrl} alt="" width={16} height={16} style={{ flexShrink: 0 }} />}
                  {showPrice && (
                    <span style={{ fontSize: 11, fontWeight: 500, lineHeight: '14px', color: '#00B253', whiteSpace: 'nowrap' }}>
                      {formatNum(seg.price, 0)}&nbsp;₽
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {tooltipAnchor && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltipAnchor.x,
            top: tooltipAnchor.y - 8,
            transform: 'translate(-50%, -100%)',
            background: '#fff',
            borderRadius: 28,
            padding: '16px 20px',
            boxShadow: '0px 1px 3px rgba(0,0,0,0.05), 0px 4px 24px rgba(0,0,0,0.12)',
            zIndex: 200,
            pointerEvents: 'none',
            minWidth: 220,
          }}
        >
          {activeVasList.map((v, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginTop: i > 0 ? 8 : 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.icon.default} alt="" width={20} height={20} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: '16px', color: '#000' }}>
                  {v.name}{v.price > 0 ? `, ${formatNum(v.price, 0)}\u00a0₽` : ''}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: '16px', color: '#757575' }}>
                  {formatTs(v.startTime)}&nbsp;—&nbsp;{formatTs(v.endTime)}
                </div>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
