'use client'

import { useState, useRef, useLayoutEffect, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { buildCharts, aggregateWeekly, parseItemData, type ChartConfig, type SegmentKey, type WeekInfo, type RawItemData, type DynamicInfo } from '@/lib/data'
import { formatNum } from '@/lib/utils'
import item1Data from '@/lib/item_stats/item1.json'
import item2Data from '@/lib/item_stats/item2.json'
import item3Data from '@/lib/item_stats/item3.json'
import BarChart from './BarChart'
import VasGantt from './VasGantt'
import ChartTooltip, { type ActiveBar, type TooltipPos } from './ChartTooltip'
import ReportTab from './ReportTab'

function parseMarkdownInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>
    return part
  })
}

const ALL_ITEMS = [item1Data, item2Data, item3Data].map(d => parseItemData(d as unknown as RawItemData))

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_LONG  = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_LONG_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const DOW_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function pluralDays(n: number): string {
  const mod100 = n % 100
  const mod10  = n % 10
  if (mod100 >= 11 && mod100 <= 19) return `${n} дней`
  if (mod10 === 1) return `${n} день`
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`
  return `${n} дней`
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface HoverData {
  cfg: ChartConfig
  dayIdx: number
  barRect: DOMRect | null
  isTotalHover?: boolean
  vasHover?: boolean
}

const DRAWER_WIDTH = 920

const ITEM_IDS = ['item1', 'item2', 'item3']

const TAB_DEFS = [
  { id: 'main', label: 'Главное' },
  { id: 'statistics', label: 'Статистика' },
  { id: 'search-position', label: 'Место в поиске' },
  { id: 'competitors', label: 'Конкуренты' },
]

export default function StatisticsDrawer({ id = 'item1' }: { id?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const activeTab = segments.length >= 2 ? segments[1] : 'main'
  const tooltipBoxRef = useRef<HTMLDivElement>(null)
  const chartsWrapperRef = useRef<HTMLDivElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)
  const lastActiveRef = useRef<{ dayIdx: number; chartId: string } | null>(null)

  const selectedIdx = Math.max(0, ITEM_IDS.indexOf(id))
  const tabs = TAB_DEFS.map(t => ({ ...t, href: t.id === 'main' ? `/${id}` : `/${id}/${t.id}` }))
  const [hoverData, setHoverData] = useState<HoverData | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null)
  const [overlayX, setOverlayX] = useState<{ left: number; width: number } | null>(null)
  const [idCopied, setIdCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'days' | 'weeks'>('days')

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

  const totalBreakdown = useMemo(() => ({
    vasImpressions: displayData.reduce((s, d) => s + d.vasImpressions, 0),
    vasViews: displayData.reduce((s, d) => s + d.vasViews, 0),
    contactsShowPhone: displayData.reduce((s, d) => s + d.contactsShowPhone, 0),
    contactsMessenger: displayData.reduce((s, d) => s + d.contactsMessenger, 0),
    contactsShowPhoneAndMessenger: displayData.reduce((s, d) => s + d.contactsShowPhoneAndMessenger, 0),
    contactsSbcDiscount: displayData.reduce((s, d) => s + d.contactsSbcDiscount, 0),
  }), [displayData])

  const totalCharts = useMemo((): ChartConfig[] => {
    const norm = (v: number, max: number) => max > 0 ? Math.round(v / max * 100) : 0
    const { imp, views, contacts, spending } = parsedItem.totals
    const { vasImpressions, vasViews, contactsShowPhone, contactsMessenger, contactsShowPhoneAndMessenger, contactsSbcDiscount } = totalBreakdown
    return [
      {
        id: 'shows-total', yMax: imp,
        keys: ['g', 'b'] as SegmentKey[],
        labels: { g: 'Показы с продвижением', b: 'Показы без продвижения' },
        unit: '',
        data: [{ h: 100, g: norm(vasImpressions, imp), b: norm(imp - vasImpressions, imp) }],
      },
      {
        id: 'views-total', yMax: views,
        keys: ['g', 'b'] as SegmentKey[],
        labels: { g: 'Просмотры с продвижением', b: 'Просмотры без продвижения' },
        unit: '',
        data: [{ h: 100, g: norm(vasViews, views), b: norm(views - vasViews, views) }],
      },
      {
        id: 'contacts-total', yMax: contacts,
        keys: ['b', 'v', 'p', 't'] as SegmentKey[],
        labels: {
          b: 'Посмотрели телефон',
          v: 'Написали в\u00a0чат',
          p: 'Посмотрели телефон и\u00a0написали в\u00a0чат',
          t: 'Откликнулись на\u00a0скидку в\u00a0чате',
        },
        unit: '',
        data: [{ h: 100, g: 0, b: norm(contactsShowPhone, contacts), v: norm(contactsMessenger, contacts), p: norm(contactsShowPhoneAndMessenger, contacts), t: norm(contactsSbcDiscount, contacts) }],
      },
      {
        id: 'expenses-total', yMax: spending,
        keys: ['g'] as SegmentKey[],
        labels: { g: 'Расходы' },
        unit: '\u00a0₽',
        data: [{ h: 100, g: 100, b: 0 }],
      },
    ]
  }, [parsedItem.totals, totalBreakdown])

  useEffect(() => {
    lastActiveRef.current = null
    setHoverData(null)
    setTooltipPos(null)
    setOverlayX(null)
  }, [selectedIdx, viewMode])

  const activeDayIdx = hoverData && !hoverData.isTotalHover ? hoverData.dayIdx : null
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

  const activeDateLabelLong = activeDayIdx !== null
    ? (() => {
        if (viewMode === 'weeks' && weekInfo) {
          const w = weekInfo[activeDayIdx]
          const s = parseLocalDate(parsedItem.startDates[w.dayIndices[0]])
          const e = parseLocalDate(parsedItem.startDates[w.dayIndices[w.dayIndices.length - 1]])
          const n = w.dayIndices.length
          const range = s.getMonth() === e.getMonth()
            ? `${s.getDate()} \u2014 ${e.getDate()} ${MONTHS_LONG_GEN[e.getMonth()]}`
            : `${s.getDate()} ${MONTHS_LONG_GEN[s.getMonth()]} \u2014 ${e.getDate()} ${MONTHS_LONG_GEN[e.getMonth()]}`
          return `${pluralDays(n)}: ${range}`
        }
        const dt = parseLocalDate(parsedItem.startDates[activeDayIdx])
        return `${dt.getDate()} ${MONTHS_LONG_GEN[dt.getMonth()]}`
      })()
    : null

  const tooltipDateLabel = hoverData && !hoverData.isTotalHover
    ? viewMode === 'weeks' && weekInfo
      ? activeDateLabelLong ?? ''
      : (() => {
          const dt = parseLocalDate(parsedItem.startDates[hoverData.dayIdx])
          return `${dt.getDate()} ${MONTHS_LONG_GEN[dt.getMonth()]}, ${DOW_SHORT[dt.getDay()]}`
        })()
    : undefined

  const totals = parsedItem.totals
  const d = activeDayIdx !== null ? displayData[activeDayIdx] : null
  const imp      = d?.impressions ?? totals.imp
  const views    = d?.views       ?? totals.views
  const contacts = d?.contacts    ?? totals.contacts
  const spending = d?.spending    ?? totals.spending

  const vasWindowStart = new Date(parsedItem.startDates[0]).getTime() / 1000
  const vasWindowEnd   = new Date(parsedItem.startDates[parsedItem.startDates.length - 1]).getTime() / 1000 + 86400
  const dyn = activeDayIdx === null ? parsedItem.dynamics : { imp: null, views: null, contacts: null, spending: null }
  const metricSections: Array<{ name: string; metricValue: string; details: Array<{ icon: 'percent' | 'ruble'; value: string; tooltip: string }>; dynamic: DynamicInfo | null }> = [
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
        ...(imp > 0 && views > 0 ? [{ icon: 'percent' as const, value: `${formatNum(views / imp * 100, 1)}%`, tooltip: 'Конверсия из показа в просмотр' }] : []),
        ...(views > 0 ? [{ icon: 'ruble' as const, value: `${formatNum(spending / views, 2)}\u00a0₽`, tooltip: 'Цена просмотра' }] : []),
      ],
      dynamic: dyn.views,
    },
    {
      name: 'Контакты',
      metricValue: formatNum(contacts),
      details: [
        ...(views > 0 && contacts > 0 ? [{ icon: 'percent' as const, value: `${formatNum(contacts / views * 100, 1)}%`, tooltip: 'Конверсия из просмотра в контакт' }] : []),
        ...(contacts > 0 ? [{ icon: 'ruble' as const, value: `${formatNum(spending / contacts, 2)}\u00a0₽`, tooltip: 'Цена контакта' }] : []),
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
  const activeBar: ActiveBar | null = hoverData && !hoverData.vasHover
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
    if (x < 0 || x >= rect.width) {
      handleMouseLeave()
      return
    }
    const idx = Math.min(columnCount - 1, Math.floor(x / (rect.width / columnCount)))
    setHoverData(prev => {
      if (prev?.dayIdx === idx) return prev
      lastActiveRef.current = { dayIdx: idx, chartId: 'col' }
      return { cfg: prev?.cfg ?? charts[0], dayIdx: idx, barRect: prev?.barRect ?? null }
    })
  }, [charts, columnCount, handleMouseLeave])

  const handleVasMouseMove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const el = barsRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < 0 || x >= rect.width) return
    const idx = Math.min(columnCount - 1, Math.floor(x / (rect.width / columnCount)))
    setHoverData(prev => {
      if (prev?.dayIdx === idx && prev?.vasHover) return prev
      lastActiveRef.current = { dayIdx: idx, chartId: 'vas' }
      return { cfg: prev?.cfg ?? charts[0], dayIdx: idx, barRect: null, vasHover: true }
    })
  }, [charts, columnCount])

  useLayoutEffect(() => {
    if (!hoverData) {
      setTooltipPos(null)
      setOverlayX(null)
      return
    }
    const { dayIdx, barRect, isTotalHover } = hoverData
    // Overlay computed from dayIdx + barsRef — skip for total hover
    if (!isTotalHover && barsRef.current && chartsWrapperRef.current) {
      const barsRect = barsRef.current.getBoundingClientRect()
      const wrapperRect = chartsWrapperRef.current.getBoundingClientRect()
      const slotW = barsRect.width / columnCount
      setOverlayX({
        left: barsRect.left - wrapperRect.left + dayIdx * slotW,
        width: slotW,
      })
    } else if (isTotalHover) {
      setOverlayX(null)
    }
    // Tooltip only when hovering a bar (barRect is non-null)
    if (!tooltipBoxRef.current || !barRect) {
      setTooltipPos(null)
      return
    }
    const barCenterX = barRect.left + barRect.width / 2
    const barTopY = barRect.top
    const boxH = tooltipBoxRef.current.offsetHeight
    const boxW = ['shows', 'views', 'shows-total', 'views-total'].includes(hoverData.cfg.id) ? 290 : 340
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
            <div className="snippet-left">
              <div className="snippet-arrows">
                <button
                  className="snippet-arrow-btn"
                  disabled={selectedIdx === 0}
                  onClick={() => {
                    const newId = ITEM_IDS[selectedIdx - 1]
                    router.push(activeTab === 'main' ? `/${newId}` : `/${newId}/${activeTab}`)
                  }}
                  aria-label="Предыдущее объявление"
                >
                  <svg width="14" height="8" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="snippet-arrow-btn"
                  disabled={selectedIdx === ALL_ITEMS.length - 1}
                  onClick={() => {
                    const newId = ITEM_IDS[selectedIdx + 1]
                    router.push(activeTab === 'main' ? `/${newId}` : `/${newId}/${activeTab}`)
                  }}
                  aria-label="Следующее объявление"
                >
                  <svg width="14" height="8" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="snippet-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.imageUrl} alt={listing.title} />
              </div>
              <div className="snippet-text">
                <div className="snippet-info">
                  <div className="snippet-title">{listing.title}</div>
                  <div className="snippet-price">{listing.price}</div>
                  <div className="snippet-location">
                  <span>{listing.location}</span>
                  {listing.metro && (
                    <span className="snippet-metro">
                      <span className="snippet-metro-dot" style={{ background: listing.metro.color }} />
                      {listing.metro.name}
                    </span>
                  )}
                </div>
                </div>
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
            {(() => {
              const buttons = listing.buttons ?? []
              const [first, ...rest] = buttons
              const showMore = true
              return (
                <div className="snippet-controls">
                  {first && (
                    <button className={`btn btn-${first.variant}`} style={{ width: '100%' }}>{first.label}</button>
                  )}
                  {(rest.length > 0 || showMore) && (
                    <div className="snippet-controls-row">
                      {rest.map((btn, i) => (
                        <button key={btn.label} className={`btn btn-${btn.variant}`} style={i === 0 ? { flex: 1 } : undefined}>{btn.label}</button>
                      ))}
                      {showMore && (
                        <button className="btn btn-secondary btn-icon-square" aria-label="Ещё">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.1667 9.99674C14.1667 10.9134 14.9167 11.6634 15.8333 11.6634C16.75 11.6634 17.5 10.9134 17.5 9.99674C17.5 9.08008 16.75 8.33008 15.8333 8.33008C14.9167 8.33008 14.1667 9.08008 14.1667 9.99674ZM11.6667 9.99674C11.6667 9.08008 10.9167 8.33008 10 8.33008C9.08333 8.33008 8.33333 9.08008 8.33333 9.99674C8.33333 10.9134 9.08333 11.6634 10 11.6634C10.9167 11.6634 11.6667 10.9134 11.6667 9.99674ZM4.16667 8.33008C5.08333 8.33008 5.83333 9.08008 5.83333 9.99674C5.83333 10.9134 5.08333 11.6634 4.16667 11.6634C3.25 11.6634 2.5 10.9134 2.5 9.99674C2.5 9.08008 3.25 8.33008 4.16667 8.33008Z" fill="black"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {listing.status === 'rejected' && listing.rejectionReason && (
            listing.bannerStyle === 'heading' ? (
              <div className="rejection-banner rejection-banner--heading">
                <div className="rejection-banner-heading">Объявление не опубликовано</div>
                <div className="rejection-reason-content">
                  <div className="rejection-reason-title">{listing.rejectionReason.title}</div>
                  <div className="rejection-reason-body">
                    {listing.rejectionReason.body.split('\n\n').map((para, i) => (
                      <p key={i}>{parseMarkdownInline(para)}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rejection-banner">
                <div className="rejection-badge">Объявление не опубликовано</div>
                <div className="rejection-reason-content">
                  <div className="rejection-reason-title">{listing.rejectionReason.title}</div>
                  <div className="rejection-reason-body">
                    {listing.rejectionReason.body.split('\n\n').map((para, i) => (
                      <p key={i}>{parseMarkdownInline(para)}</p>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          <div className="tab-group">
            {tabs.map(tab => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`tab-group-tab${activeTab === tab.id ? ' active' : ''}`}
                scroll={false}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {activeTab === 'main' && (
            <ReportTab />
          )}


          {activeTab === 'statistics' && (
            <>
              <div className="filters">
                <span className="filters-label">{activeDateLabelLong ?? (() => {
                  const s = parseLocalDate(parsedItem.startDates[0])
                  const e = parseLocalDate(parsedItem.startDates[parsedItem.startDates.length - 1])
                  const n = parsedItem.startDates.length
                  const range = `${s.getDate()} ${MONTHS_LONG_GEN[s.getMonth()]} \u2014 ${e.getDate()} ${MONTHS_LONG_GEN[e.getMonth()]}`
                  return n > 1 ? `${pluralDays(n)}: ${range}` : range
                })()}</span>
                <div style={{ flex: 1 }} />
                <div className="segmented-control">
                  <button className={`segment${viewMode === 'days' ? ' active' : ''}`} onClick={() => setViewMode('days')}>По дням</button>
                  <button className={`segment${viewMode === 'weeks' ? ' active' : ''}`} onClick={() => setViewMode('weeks')}>По неделям</button>
                </div>
                <button className="date-picker">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="14" height="13" rx="2" />
                    <line x1="3" y1="9" x2="17" y2="9" />
                    <line x1="7" y1="2" x2="7" y2="5" />
                    <line x1="13" y1="2" x2="13" y2="5" />
                  </svg>
                  <span>{(() => {
                    const s = parseLocalDate(parsedItem.startDates[0])
                    const e = parseLocalDate(parsedItem.startDates[parsedItem.startDates.length - 1])
                    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} \u2014 ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}`
                  })()}</span>
                  <svg className="chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,4.5 6,7.5 9,4.5" />
                  </svg>
                </button>
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
                        <div
                          className="metric-value-row"
                          onMouseEnter={activeDayIdx === null && totalCharts[idx].keys.length > 1 ? (e) => {
                            setHoverData({ cfg: totalCharts[idx], dayIdx: 0, barRect: e.currentTarget.getBoundingClientRect(), isTotalHover: true })
                          } : undefined}
                          onMouseLeave={activeDayIdx === null && totalCharts[idx].keys.length > 1 ? handleMouseLeave : undefined}
                          style={activeDayIdx === null && totalCharts[idx].keys.length > 1 ? { cursor: 'default' } : undefined}
                        >
                          <span className="metric-number">{section.metricValue}</span>
                          {section.dynamic && (
                            <span className="metric-dynamic" style={{ color: section.name === 'Расходы' ? '#757575' : section.dynamic.color }}>
                              {section.dynamic.icon === 'up' ? '↑' : '↓'}{parseFloat(section.dynamic.title.replace(/\s/g, '').replace(',', '.')) > 99 ? '99%+' : section.dynamic.title}
                            </span>
                          )}
                        </div>
                        {section.details.length > 0 && (
                          <div className="metric-details">
                            {section.details.map(d => (
                              <span key={d.icon} className="metric-detail" data-tooltip={d.tooltip}>
                                {d.icon === 'percent' ? (
                                  <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M6 10.5L10 6.99997L10 4.5C10 4.22386 9.77614 4 9.5 4L0.5 4.00001C0.223858 4.00001 1.89661e-07 4.22386 9.48304e-08 4.50001L0 6.99997L4 10.5V14L6 15L6 10.5ZM1 6.5462L5 10.0462L9 6.54621V5L1 5.00001V6.5462Z" fill="#757575"/>
                                  </svg>
                                ) : (
                                  <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 8C12 11.3137 9.31371 14 6 14C2.68629 14 0 11.3137 0 8C0 4.68629 2.68629 2 6 2C9.31371 2 12 4.68629 12 8ZM11 8C11 10.7614 8.76142 13 6 13C3.23858 13 1 10.7614 1 8C1 5.23858 3.23858 3 6 3C8.76142 3 11 5.23858 11 8Z" fill="#757575"/>
                                    <path d="M7.9456 10H6.6284V5H5.6284V5.91093C5.6284 6.34859 5.40781 6.55208 5.08908 6.55208H4.53819V7.55208H5.64235L5.6284 10H4.3112V11H7.9456V10Z" fill="#757575"/>
                                  </svg>
                                )}
                                {d.value}
                              </span>
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
                        chartKey={viewMode}
                      />
                    </div>
                  </div>
                ))}

                {/* VAS + date scale */}
                <div className="sticky-bottom-block">
                  <div
                    style={{ marginLeft: 213, paddingTop: 2 }}
                    onMouseMove={handleVasMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <VasGantt vases={parsedItem.vases} windowStart={vasWindowStart} windowEnd={vasWindowEnd} />
                  </div>

                  <div className="sticky-date-scale">
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
                    {(() => {
                      const counts = new Map<number, number>()
                      if (viewMode === 'weeks' && weekInfo) {
                        for (const w of weekInfo) {
                          const m = parseLocalDate(parsedItem.startDates[w.dayIndices[0]]).getMonth()
                          counts.set(m, (counts.get(m) ?? 0) + 1)
                        }
                      } else {
                        for (const dateStr of parsedItem.startDates) {
                          const m = parseLocalDate(dateStr).getMonth()
                          counts.set(m, (counts.get(m) ?? 0) + 1)
                        }
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
            </>
          )}

        </div>
      </div>

      {/* Tooltip — fixed position, overlays everything including the drawer */}
      <ChartTooltip
        activeBar={activeBar}
        tooltipPos={tooltipPos}
        boxRef={tooltipBoxRef}
        width={activeBar && ['shows', 'views', 'shows-total', 'views-total'].includes(activeBar.cfg.id) ? 290 : 340}
        dateLabel={tooltipDateLabel}
      />
    </>
  )
}
