'use client'

import { useState, useRef, useLayoutEffect, useCallback, useMemo, useEffect } from 'react'
import { buildCharts, aggregateWeekly, parseItemData, type ChartConfig, type WeekInfo, type RawItemData, type DynamicInfo } from '@/lib/data'
import { formatNum } from '@/lib/utils'
import item1Data from '@/lib/item_stats/item1.json'
import item2Data from '@/lib/item_stats/item2.json'
import item3Data from '@/lib/item_stats/item3.json'
import BarChart from './BarChart'
import VasGantt from './VasGantt'
import ChartTooltip, { type ActiveBar, type TooltipPos } from './ChartTooltip'

const ALL_ITEMS = [item1Data, item2Data, item3Data].map(d => parseItemData(d as unknown as RawItemData))

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_LONG  = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface HoverData {
  cfg: ChartConfig
  dayIdx: number
  barRect: DOMRect | null
}

const DRAWER_WIDTH = 920

export default function StatisticsDrawer() {
  const tooltipBoxRef = useRef<HTMLDivElement>(null)
  const chartsWrapperRef = useRef<HTMLDivElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)
  const lastActiveRef = useRef<{ dayIdx: number; chartId: string } | null>(null)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [hoverData, setHoverData] = useState<HoverData | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null)
  const [overlayX, setOverlayX] = useState<{ left: number; width: number } | null>(null)
  const [idCopied, setIdCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'days' | 'weeks'>('days')
  const [activeTab, setActiveTab] = useState('statistics')

  const parsedItem = ALL_ITEMS[selectedIdx]
  const listing = parsedItem.listing

  const { displayData, weekInfo, columnCount } = useMemo(() => {
    if (viewMode === 'weeks') {
      const result = aggregateWeekly(parsedItem.data, parsedItem.startDates)
      return { displayData: result.data, weekInfo: result.weeks, columnCount: result.data.length }
    }
    return { displayData: parsedItem.data, weekInfo: null as WeekInfo[] | null, columnCount: 30 }
  }, [viewMode, parsedItem])

  const charts = useMemo(() => buildCharts(displayData), [displayData])
  const chartYLabels = useMemo(() => charts.map(c => formatNum(c.yMax)), [charts])

  useEffect(() => {
    lastActiveRef.current = null
    setHoverData(null)
    setTooltipPos(null)
    setOverlayX(null)
  }, [selectedIdx, viewMode])

  const activeDayIdx = hoverData?.dayIdx ?? null
  const activeDateLabel = activeDayIdx !== null
    ? (() => {
        if (viewMode === 'weeks' && weekInfo) {
          const w = weekInfo[activeDayIdx]
          const s = parseLocalDate(parsedItem.startDates[w.dayIndices[0]])
          const e = parseLocalDate(parsedItem.startDates[w.dayIndices[w.dayIndices.length - 1]])
          if (s.getMonth() === e.getMonth()) {
            return `${s.getDate()} \u2014 ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`
          }
          return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} \u2014 ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`
        }
        const dt = parseLocalDate(parsedItem.startDates[activeDayIdx])
        return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`
      })()
    : null

  const totals = parsedItem.totals
  const d = activeDayIdx !== null ? displayData[activeDayIdx] : null
  const imp      = d?.impressions ?? totals.imp
  const views    = d?.views       ?? totals.views
  const contacts = d?.contacts    ?? totals.contacts
  const spending = d?.spending    ?? totals.spending

  const vasWindowStart = new Date(parsedItem.startDates[0]).getTime() / 1000
  const vasWindowEnd   = new Date(parsedItem.startDates[parsedItem.startDates.length - 1]).getTime() / 1000 + 86400
  const dyn = activeDayIdx === null ? parsedItem.dynamics : { imp: null, views: null, contacts: null, spending: null }
  const metricSections: Array<{ name: string; metricValue: string; details: string[]; dynamic: DynamicInfo | null }> = [
    {
      name: 'Показы',
      metricValue: formatNum(imp),
      details: [],
      dynamic: dyn.imp,
    },
    {
      name: 'Просмотры',
      metricValue: formatNum(views),
      details: [
        ...(imp > 0 && views > 0 ? [`${formatNum(views / imp * 100, 1)}% показов`] : []),
        ...(views > 0 ? [`${formatNum(spending / views, 2)}\u00a0₽ за просмотр`] : []),
      ],
      dynamic: dyn.views,
    },
    {
      name: 'Контакты',
      metricValue: formatNum(contacts),
      details: [
        ...(views > 0 && contacts > 0 ? [`${formatNum(contacts / views * 100, 1)}% просмотров`] : []),
        ...(contacts > 0 ? [`${formatNum(spending / contacts, 2)}\u00a0₽ за контакт`] : []),
      ],
      dynamic: dyn.contacts,
    },
    {
      name: 'Расходы',
      metricValue: `${formatNum(spending, 2)}\u00a0₽`,
      details: [],
      dynamic: dyn.spending,
    },
  ]
  const activeBar: ActiveBar | null = hoverData
    ? { cfg: hoverData.cfg, dayIdx: hoverData.dayIdx }
    : null

  const handleBarHover = useCallback((cfg: ChartConfig, dayIdx: number, barEl: HTMLElement) => {
    const last = lastActiveRef.current
    if (last?.dayIdx === dayIdx && last?.chartId === cfg.id) return
    lastActiveRef.current = { dayIdx, chartId: cfg.id }
    setHoverData({ cfg, dayIdx, barRect: barEl.getBoundingClientRect() })
  }, [])

  const handleMouseLeave = useCallback(() => {
    lastActiveRef.current = null
    setHoverData(null)
    setTooltipPos(null)
    setOverlayX(null)
  }, [])

  const handleColumnMouseMove = useCallback((e: React.MouseEvent) => {
    const el = barsRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < 0 || x >= rect.width) return
    const idx = Math.min(columnCount - 1, Math.floor(x / (rect.width / columnCount)))
    setHoverData(prev => {
      if (prev?.dayIdx === idx) return prev
      lastActiveRef.current = { dayIdx: idx, chartId: 'col' }
      return { cfg: prev?.cfg ?? charts[0], dayIdx: idx, barRect: prev?.barRect ?? null }
    })
  }, [charts, columnCount])

  useLayoutEffect(() => {
    if (!hoverData) {
      setTooltipPos(null)
      setOverlayX(null)
      return
    }
    const { dayIdx, barRect } = hoverData
    // Overlay computed from dayIdx + barsRef — works from any hover zone
    if (barsRef.current && chartsWrapperRef.current) {
      const barsRect = barsRef.current.getBoundingClientRect()
      const wrapperRect = chartsWrapperRef.current.getBoundingClientRect()
      const slotW = barsRect.width / columnCount
      setOverlayX({
        left: barsRect.left - wrapperRect.left + dayIdx * slotW,
        width: slotW,
      })
    }
    // Tooltip only when hovering a bar (barRect is non-null)
    if (!tooltipBoxRef.current || !barRect) {
      setTooltipPos(null)
      return
    }
    const barCenterX = barRect.left + barRect.width / 2
    const barTopY = barRect.top
    const boxH = tooltipBoxRef.current.offsetHeight
    const boxW = 440
    const drawerLeft = window.innerWidth - DRAWER_WIDTH
    let left = barCenterX - boxW / 2
    left = Math.max(drawerLeft + 10, Math.min(window.innerWidth - boxW - 10, left))
    let top = barTopY - boxH - 16
    top = Math.max(10, top)
    setTooltipPos({ left, top })
  }, [hoverData, columnCount])

  return (
    <>
      <div className="backdrop" />

      <button className="close-btn">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 17.8856L25.7238 27.6095L27.6095 25.7239L17.8856 16L27.6095 6.27615L25.7238 4.39053L16 14.1144L6.27612 4.39053L4.3905 6.27615L14.1144 16L4.3905 25.7239L6.27612 27.6095L16 17.8856Z" fill="white"/>
        </svg>
      </button>

      <div className="drawer">
        <div className="drawer-content">
          <div className="footer">
            <div className="product-info">
              <div className="product-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.imageUrl} alt={listing.title} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              </div>
              <div className="product-text">
                <div className="product-price">{listing.price}</div>
                <div className="product-title">{listing.title}</div>
                <div className="product-location">{listing.location}</div>
                <div
                  className={`product-id${idCopied ? ' copied' : ''}`}
                  onClick={() => {
                    navigator.clipboard.writeText(String(listing.id))
                    setIdCopied(true)
                  }}
                  onMouseLeave={() => setIdCopied(false)}
                >
                  <span>{idCopied ? 'ID скопирован' : `ID ${listing.id}`}</span>
                  <svg className="product-id-icon copy-icon" width="11" height="16" viewBox="0 0 11 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip_copy)">
                      <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5C3 3.22386 3.22386 3 3.5 3H10V11.5C10 11.7761 9.77614 12 9.5 12H3V3.5ZM4 4V11H9V4H4ZM1 6H2V13H7V14H1V6Z" fill="currentColor"/>
                    </g>
                    <defs>
                      <clipPath id="clip_copy">
                        <rect width="11" height="16" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                  <svg className="product-id-icon success-icon" width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip_success)">
                      <path d="M9.38867 7.58887L5.5 11.4775L3.11133 9.08887L3.88867 8.31152L5.5 9.92285L8.61133 6.81152L9.38867 7.58887Z" fill="currentColor"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M6 3C9.31371 3 12 5.68629 12 9C12 12.3137 9.31371 15 6 15C2.68629 15 0 12.3137 0 9C0 5.68629 2.68629 3 6 3ZM6 4.09961C3.2938 4.09961 1.09961 6.2938 1.09961 9C1.09961 11.7062 3.2938 13.9004 6 13.9004C8.7062 13.9004 10.9004 11.7062 10.9004 9C10.9004 6.2938 8.7062 4.09961 6 4.09961Z" fill="currentColor"/>
                    </g>
                    <defs>
                      <clipPath id="clip_success">
                        <rect width="12" height="16" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="listing-nav">
                <button
                  className="listing-nav-btn"
                  disabled={selectedIdx === 0}
                  onClick={() => setSelectedIdx(i => i - 1)}
                  aria-label="Предыдущее объявление"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="10,3 5,8 10,13"/></svg>
                </button>
                <span className="listing-nav-counter">{selectedIdx + 1}&nbsp;/&nbsp;{ALL_ITEMS.length}</span>
                <button
                  className="listing-nav-btn"
                  disabled={selectedIdx === ALL_ITEMS.length - 1}
                  onClick={() => setSelectedIdx(i => i + 1)}
                  aria-label="Следующее объявление"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,3 11,8 6,13"/></svg>
                </button>
              </div>
              <div className="footer-buttons">
                <button className="btn btn-secondary">Редактировать</button>
                <button className="btn btn-primary">Продвинуть</button>
              </div>
            </div>
          </div>

          <div className="tab-group">
            {[
              { id: 'main', label: 'Главное' },
              { id: 'statistics', label: 'Статистика' },
              { id: 'search-position', label: 'Место в поиске' },
              { id: 'competitors', label: 'Конкуренты' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-group-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filters">
            <button className="date-picker">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="14" height="13" rx="2" />
                <line x1="3" y1="9" x2="17" y2="9" />
                <line x1="7" y1="2" x2="7" y2="5" />
                <line x1="13" y1="2" x2="13" y2="5" />
              </svg>
              <span>{activeDateLabel ?? (() => {
                const s = parseLocalDate(parsedItem.startDates[0])
                const e = parseLocalDate(parsedItem.startDates[parsedItem.startDates.length - 1])
                return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} \u2014 ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`
              })()}</span>
              <svg className="chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,4.5 6,7.5 9,4.5" />
              </svg>
            </button>
            <div className="segmented-control">
              <button className={`segment${viewMode === 'days' ? ' active' : ''}`} onClick={() => setViewMode('days')}>По дням</button>
              <button className={`segment${viewMode === 'weeks' ? ' active' : ''}`} onClick={() => setViewMode('weeks')}>По неделям</button>
            </div>
          </div>

          <div onMouseLeave={handleMouseLeave} onMouseMove={handleColumnMouseMove} style={{ cursor: 'pointer' }}>
          <div className="charts-wrapper" ref={chartsWrapperRef}>
            {overlayX && (
              <div
                className="charts-col-overlay"
                style={{ left: overlayX.left, width: overlayX.width }}
              />
            )}
            {metricSections.map((section, idx) => (
              <div key={section.name} className="chart-section">
                <div className="chart-row">
                  <div className="metric-info">
                    <div className="metric-name">
                      <span className="metric-name-text">{section.name}</span>
                      <svg width="8" height="16" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#chevron-clip)">
                          <path fillRule="evenodd" clipRule="evenodd" d="M3.99996 9.9799L1.38407 7.79999L0.615845 8.72185L3.99996 11.5419L7.38407 8.72185L6.61584 7.79999L3.99996 9.9799Z" fill="black"/>
                        </g>
                        <defs>
                          <clipPath id="chevron-clip">
                            <rect width="8" height="16" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <div className="metric-value-row">
                      <span className="metric-number">{section.metricValue}</span>
                      {section.dynamic && (
                        <span className="metric-dynamic" style={{ color: section.dynamic.color }}>
                          {section.dynamic.icon === 'up' ? '↑' : '↓'}{section.dynamic.title}
                        </span>
                      )}
                    </div>
                    {section.details.length > 0 && (
                      <div className="metric-details">
                        {section.details.map(d => (
                          <span key={d} className="metric-detail">{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <BarChart
                    cfg={charts[idx]}
                    activeDayIdx={activeDayIdx}
                    onBarHover={handleBarHover}
                    yTopLabel={chartYLabels[idx]}
                    barsRef={idx === 0 ? barsRef : undefined}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* VAS + date scale — sticky together above footer */}
          <div className="sticky-bottom-block">
            {/* VAS bars — no header */}
            <div style={{ position: 'relative', marginLeft: 177, width: 643 }}>
              <VasGantt vases={parsedItem.vases} windowStart={vasWindowStart} windowEnd={vasWindowEnd} />
              {overlayX && (
                <div
                  className="date-scale-overlay"
                  style={{ left: overlayX.left - 177, width: overlayX.width }}
                />
              )}
            </div>

            {/* Date scale */}
            <div className="sticky-date-scale">
              {overlayX && (
                <div
                  className="date-scale-overlay"
                  style={{ left: overlayX.left - 177, width: overlayX.width }}
                />
              )}
              <div className="date-scale">
                {viewMode === 'weeks' && weekInfo ? (
                  weekInfo.map((w, i) => (
                    <div
                      key={i}
                      className={`date-label visible${activeDayIdx === i ? ' day-active' : ''}`}
                    >
                      <span>{w.label}</span>
                    </div>
                  ))
                ) : (
                  parsedItem.startDates.map((dateStr, i) => {
                    const dt = parseLocalDate(dateStr)
                    const dow = dt.getDay()
                    const isWeekend = dow === 0 || dow === 6
                    return (
                      <div
                        key={i}
                        className={`date-label${isWeekend ? ' date-weekend' : ' visible'}${activeDayIdx === i ? ' day-active' : ''}`}
                      >
                        <span>{dt.getDate()}</span>
                      </div>
                    )
                  })
                )}
              </div>
              {viewMode === 'days' && (() => {
                const counts = new Map<number, number>()
                for (const dateStr of parsedItem.startDates) {
                  const m = parseLocalDate(dateStr).getMonth()
                  counts.set(m, (counts.get(m) ?? 0) + 1)
                }
                return (
                  <div className="month-labels">
                    {[...counts.entries()].map(([m, count]) => (
                      <span key={m} className="month-label" style={{ flex: count }}>{MONTHS_LONG[m]}</span>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
          </div>

          {/* Widgets */}
          <div className="widgets">
            <div className="widget-card">
              <div className="widget-header">
                <span className="widget-name">Избранное</span>
                <svg className="widget-arrow" viewBox="0 0 20 20" fill="none" stroke="#757575" strokeWidth="2">
                  <polyline points="8,5 13,10 8,15" />
                </svg>
              </div>
              <div>
                <div className="metric-value-row">
                  <span className="widget-value">{formatNum(parsedItem.favorites)}</span>
                  <span className="widget-dynamic"></span>
                </div>
              </div>
            </div>
            <div className="widget-card">
              <div className="widget-header">
                <span className="widget-name">Расходы</span>
                <svg className="widget-arrow" viewBox="0 0 20 20" fill="none" stroke="#757575" strokeWidth="2">
                  <polyline points="8,5 13,10 8,15" />
                </svg>
              </div>
              <div>
                <div className="metric-value-row">
                  <span className="widget-value">{formatNum(totals.spending, 2)}&nbsp;₽</span>
                  <span className="widget-dynamic"></span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tooltip — fixed position, overlays everything including the drawer */}
      <ChartTooltip
        activeBar={activeBar}
        tooltipPos={tooltipPos}
        boxRef={tooltipBoxRef}
      />
    </>
  )
}
