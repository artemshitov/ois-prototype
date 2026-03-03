'use client'

import { useMemo, Fragment } from 'react'
import {
  getReportData,
  type StatusBadge,
  type FunnelColumn,
  type ToolItem,
} from '@/lib/reportData'
import { formatNum } from '@/lib/utils'

// ── Badge component ─────────────────────────────────────────────────────────

function Badge({ badge }: { badge: StatusBadge }) {
  return (
    <span className={`rpt-badge rpt-badge-${badge.type}`}>
      {badge.label}
    </span>
  )
}

// ── Tool icon ───────────────────────────────────────────────────────────────

function ToolIcon({ icon }: { icon: ToolItem['icon'] }) {
  if (icon === 'rocket') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#f2f1f0" />
        <path d="M12 6L14 10H10L12 6Z" fill="#757575" />
        <path d="M10 10H14V15H10V10Z" fill="#757575" />
        <path d="M11 15H13V18H11V15Z" fill="#757575" />
      </svg>
    )
  }
  if (icon === 'list') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#f2f1f0" />
        <path d="M8 8H16M8 12H16M8 16H14" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (icon === 'price') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#f2f1f0" />
        <text x="12" y="16" fontSize="12" fontWeight="700" fill="#757575" textAnchor="middle" fontFamily="Manrope">P</text>
      </svg>
    )
  }
  if (icon === 'mail') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#f2f1f0" />
        <path d="M7 9L12 12.5L17 9M7 9V16H17V9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return null
}

// ── Score circle ────────────────────────────────────────────────────────────

function ScoreCircle({ percent }: { percent: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c * (1 - percent / 100)
  const color = percent >= 80 ? '#00b253' : percent >= 40 ? '#FF8C00' : '#FF4053'
  return (
    <div className="rpt-card-score">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ebeae8" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="rpt-card-score-num">{percent}%</span>
    </div>
  )
}

// ── Column section ──────────────────────────────────────────────────────────

function Column({ col }: { col: FunnelColumn }) {
  return (
    <div className="rpt-col">
      {/* Left: info */}
      <div className="rpt-col-left">
        <div className="rpt-col-top">
          <div className="rpt-col-title-row">
            <span className="rpt-col-title">{col.title}</span>
            {col.hasInfoIcon && (
              <svg width="16" height="16" viewBox="0 0 16 16" className="rpt-col-info-icon">
                <circle cx="8" cy="8" r="7" fill="none" stroke="#FF4053" strokeWidth="1.5" />
                <text x="8" y="12" fontSize="10" fontWeight="700" fill="#FF4053" textAnchor="middle" fontFamily="Manrope">!</text>
              </svg>
            )}
            <Badge badge={col.badge} />
          </div>
          <span className="rpt-col-subtitle">{col.subtitle}</span>
        </div>

        <div className="rpt-col-metrics">
          {col.metrics.map((m, i) => (
            <div className="rpt-col-metric-row" key={i}>
              <span className="rpt-col-metric-label">{m.label}</span>
              <span className={`rpt-col-metric-value${m.bold ? ' rpt-col-metric-value-bold' : ''}`}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <p className="rpt-col-growth">{col.growthPotential}</p>
      </div>

      {/* Right: tools */}
      <div className="rpt-col-right">
        {col.tools.map((tool, i) => (
          <a className="rpt-col-tool-row" key={i} href="#">
            <div className="rpt-col-tool-icon-wrap">
              <ToolIcon icon={tool.icon} />
              {tool.hasDot && <span className="rpt-col-tool-dot" />}
            </div>
            <span className="rpt-col-tool-label">{tool.label}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rpt-col-tool-chevron">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function ReportTab() {
  const data = useMemo(() => getReportData(), [])

  return (
    <div className="rpt">
      {/* Unified hero + funnel card */}
      <div className="rpt-unified-card">

        {/* Zone A: score summary */}
        <div className="rpt-card-hero">
          <div className="rpt-card-hero-left">
            <ScoreCircle percent={data.scorePercent} />
            <div className="rpt-card-text">
              <h2 className="rpt-card-title">{data.heroTitle}</h2>
              <p className="rpt-card-subtitle">{data.heroText}</p>
            </div>
          </div>
          <div className="rpt-hero-badge">
            <div className="rpt-hero-badge-img" />
            <span className="rpt-hero-badge-text">{data.topBadge.title}</span>
            {data.topBadge.hasArrow && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rpt-hero-badge-arrow">
                <path d="M8 5L13 10L8 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="rpt-card-sep" />

        {/* Zone B: funnel stages */}
        <div className="rpt-card-funnel">
          {data.stages.map((stage, i) => {
            const col = data.columns.find(c => c.id === stage.id)
            const badge = col?.badge
            const isLast = i === data.stages.length - 1
            const rateWarn = stage.rateToNext != null
              && stage.benchRateToNext != null
              && stage.rateToNext < stage.benchRateToNext * 0.7

            return (
              <Fragment key={stage.id}>
                <div className={`rpt-card-stage${badge ? ` rpt-card-stage-${badge.type}` : ''}`}>
                  <div className="rpt-card-stage-num">{formatNum(stage.count)}</div>
                  <div className="rpt-card-stage-label">{stage.countLabel}</div>
                  {badge && (
                    <div className="rpt-card-stage-badge">
                      <Badge badge={badge} />
                    </div>
                  )}
                </div>
                {!isLast && stage.rateToNext != null && (
                  <div className={`rpt-card-arrow${rateWarn ? ' rpt-card-arrow-warn' : ''}`}>
                    <span className="rpt-card-arrow-rate">
                      {stage.rateToNext.toFixed(1).replace('.', ',')}%
                    </span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>

      </div>

      {/* Section: Объявление */}
      <div className="rpt-section">
        <h3 className="rpt-section-title">Объявление</h3>

        <div className="rpt-rows">
          {data.columns.map((col) => (
            <Column key={col.id} col={col} />
          ))}
        </div>
      </div>

      {/* Section: Профиль */}
      <div className="rpt-section">
        <h3 className="rpt-section-title">Профиль</h3>

        <div className="rpt-rows">
          <div className="rpt-col">
            <div className="rpt-col-left">
              <div className="rpt-col-top">
                <div className="rpt-col-title-row">
                  <span className="rpt-col-title">{data.profile.label}</span>
                  <Badge badge={data.profile.badge} />
                </div>
              </div>
              <div className="rpt-col-metrics">
                <div className="rpt-col-metric-row">
                  <span className="rpt-col-metric-label">Ваш показатель</span>
                  <span className="rpt-col-metric-value rpt-col-metric-value-bold">{data.profile.value}</span>
                </div>
              </div>
              <div className="rpt-progress-track rpt-progress-track-mt">
                <div
                  className="rpt-progress-fill rpt-progress-fill-green"
                  style={{ width: `${data.profile.progress}%` }}
                />
              </div>
            </div>
            <div className="rpt-col-right">
              <a className="rpt-col-tool-row" href="#">
                <ToolIcon icon="list" />
                <span className="rpt-col-tool-label">Уровень сервиса</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rpt-col-tool-chevron">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Внешние факторы */}
      <div className="rpt-section rpt-section-external">
        <h3 className="rpt-section-title">Внешние факторы</h3>

        <div className="rpt-rows">
          <div className="rpt-col">
            <div className="rpt-col-left">
              <div className="rpt-col-top">
                <div className="rpt-col-title-row">
                  <span className="rpt-col-title">{data.external.label}</span>
                  <Badge badge={data.external.badge} />
                </div>
              </div>
              <div className="rpt-col-metrics">
                <div className="rpt-col-metric-row">
                  <span className="rpt-col-metric-label">Текущий уровень</span>
                  <span className="rpt-col-metric-value rpt-col-metric-value-bold">{data.external.value}</span>
                </div>
              </div>
              <div className="rpt-progress-track rpt-progress-track-mt">
                <div
                  className="rpt-progress-fill rpt-progress-fill-blue"
                  style={{ width: `${(data.external.progress / data.external.maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="rpt-col-right">
              <a className="rpt-col-tool-row" href="#">
                <ToolIcon icon="list" />
                <span className="rpt-col-tool-label">{data.external.linkLabel}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rpt-col-tool-chevron">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
