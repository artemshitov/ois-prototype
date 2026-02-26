import { formatNum } from '@/lib/utils'

interface VasEntry {
  name: string
  startTime: number
  endTime: number
  price: number
  icon: { default: string }
}

const BARS_W = 627  // px, matches .bars width


interface Segment {
  leftPct: number
  widthPct: number
  price: number
  showIcon: boolean
  iconUrl: string
  stitchedLeft: boolean
  stitchedRight: boolean
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

const ROW_H   = 16
const ROW_GAP = 8

export default function VasGantt({ vases, windowStart, windowEnd }: Props) {
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
      }
    })
    rows.push({ name, segments })
  }

  const totalH = rows.length * ROW_H + Math.max(0, rows.length - 1) * ROW_GAP

  return (
    <div style={{ position: 'relative', height: totalH }}>
      {rows.map((row, ri) => (
        <div
          key={row.name}
          style={{ position: 'absolute', top: ri * (ROW_H + ROW_GAP), left: 16, right: 0, height: ROW_H }}
        >
          <div style={{ position: 'relative', width: '100%', height: ROW_H }}>
            {row.segments.map((seg, si) => {
              const GAP = 2
              const oneDayPct = 86400 / (windowEnd - windowStart)
              const gapPct    = GAP / BARS_W
              const leftPct   = seg.leftPct  + (seg.stitchedLeft  ? gapPct : 0)
              const rawWidthPct = seg.widthPct - (seg.stitchedLeft ? gapPct : 0)
              const widthPct  = !seg.stitchedRight ? Math.max(rawWidthPct, oneDayPct) : rawWidthPct
              const widthPx   = widthPct * BARS_W
              const showPrice = seg.price > 0 && widthPx > (seg.showIcon ? 40 : 28)
              const rL = seg.stitchedLeft  ? 4 : 10
              const rR = seg.stitchedRight ? 4 : 10
              return (
                <div
                  key={si}
                  style={{
                    position: 'absolute',
                    left: `${leftPct * 100}%`,
                    width: `${widthPct * 100}%`,
                    height: ROW_H,
                    background: '#D2FCC4',
                    borderRadius: `${rL}px ${rR}px ${rR}px ${rL}px`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: seg.showIcon ? 2 : 6,
                    paddingRight: 6,
                    gap: 3,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {seg.showIcon && <img src={seg.iconUrl} alt="" width={12} height={12} style={{ flexShrink: 0 }} />}
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
    </div>
  )
}
