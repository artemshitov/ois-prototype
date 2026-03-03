export interface FunnelStage {
  id: 'visibility' | 'attractiveness' | 'conversion'
  name: string
  status: 'good' | 'warning' | 'critical'
  impactWeight: 'high' | 'medium' | 'low'

  // User's metric vs benchmark — two numbers side by side
  you: { value: string; label?: string }
  benchmark: { value: string; label?: string }

  // Funnel numbers: absolute count passing through this stage
  count: number
  countLabel: string

  // Benchmark absolute count (what similar listings get at this stage)
  benchCount: number

  // Conversion rate to next stage (not present on last stage)
  rateToNext?: number
  benchRateToNext?: number

  // Advice
  advice: string
  adviceLink?: { label: string; href: string }
  actionButton?: { label: string }
}

// ── New report data types ──────────────────────────────────────────────────

export type StatusType = 'good' | 'warning' | 'critical'

export interface StatusBadge {
  label: string
  type: StatusType
}

export interface MetricRow {
  label: string
  value: string
  bold?: boolean
}

export interface ToolItem {
  icon: 'rocket' | 'list' | 'price' | 'mail'
  label: string
  hasDot?: boolean
  actionLabel?: string
}

export interface FunnelColumn {
  id: string
  title: string
  subtitle: string
  hasInfoIcon?: boolean
  badge: StatusBadge
  growthPotential: string
  metrics: MetricRow[]
  tools: ToolItem[]
}

export interface ProfileSection {
  badge: StatusBadge
  label: string
  value: string
  progress: number // 0–100
}

export interface ExternalFactor {
  badge: StatusBadge
  label: string
  value: string
  progress: number // 0–10
  maxValue: number
  linkLabel: string
}

export interface NewReportData {
  // Hero
  scorePercent: number
  heroTitle: string
  heroText: string
  topBadge: {
    title: string
    hasArrow: boolean
  }

  // Funnel
  stages: FunnelStage[]

  // Columns
  columns: FunnelColumn[]

  // Profile
  profile: ProfileSection

  // External
  external: ExternalFactor
}

export function getReportData(): NewReportData {
  return {
    scorePercent: 40,
    heroTitle: 'Реализовано 40% потенциала',
    heroText: 'Конверсия в контакт — узкое место. Фокус здесь.',
    topBadge: {
      title: 'Топ локомотивов',
      hasArrow: true,
    },

    stages: [
      {
        id: 'visibility',
        name: 'Показы',
        status: 'warning',
        impactWeight: 'medium',
        you: { value: '15 место' },
        benchmark: { value: '16 место' },
        count: 1840,
        countLabel: 'показов',
        benchCount: 1840,
        rateToNext: 9.2,
        benchRateToNext: 12,
        advice: '',
      },
      {
        id: 'attractiveness',
        name: 'Просмотры',
        status: 'good',
        impactWeight: 'low',
        you: { value: '7%' },
        benchmark: { value: '6,7%' },
        count: 170,
        countLabel: 'просмотров',
        benchCount: 221,
        rateToNext: 7.4,
        benchRateToNext: 46,
        advice: '',
      },
      {
        id: 'conversion',
        name: 'Контакты',
        status: 'critical',
        impactWeight: 'high',
        you: { value: '0,5%' },
        benchmark: { value: '1,2%' },
        count: 13,
        countLabel: 'контактов',
        benchCount: 102,
        advice: '',
      },
    ],

    columns: [
      {
        id: 'visibility',
        title: 'Видимость',
        subtitle: 'Позиция в поиске и зона долистывания',
        badge: { label: 'Требует внимания', type: 'warning' },
        growthPotential: 'Можно подняться на 1 позицию за неделю',
        metrics: [
          { label: 'Ваша позиция', value: '15 место', bold: true },
          { label: 'Зона долистывания', value: 'с 16 места' },
        ],
        tools: [
          { icon: 'rocket', label: 'Услуги продвижения', hasDot: true },
          { icon: 'list', label: 'Авито Реклама', hasDot: true },
          { icon: 'price', label: 'Управление ценой' },
        ],
      },
      {
        id: 'attractiveness',
        title: 'Открываемость',
        subtitle: 'Конверсия из показа в просмотр карточки',
        badge: { label: 'Всё отлично', type: 'good' },
        growthPotential: 'Вы уже выше среднего — продолжайте в том же темпе',
        metrics: [
          { label: 'Вы', value: '7%', bold: true },
          { label: 'Конкуренты в среднем', value: '6,7%' },
          { label: 'Топ-5% лучших', value: '7,01%' },
        ],
        tools: [
          { icon: 'rocket', label: 'Услуги продвижения', hasDot: true },
          { icon: 'list', label: 'Советы по контенту' },
        ],
      },
      {
        id: 'conversion',
        title: 'Конверсия в контакт',
        subtitle: 'Звонок, заявка или бронирование',
        hasInfoIcon: true,
        badge: { label: 'Узкое место', type: 'critical' },
        growthPotential: 'До +2 контактов в неделю — рост в 2 раза',
        metrics: [
          { label: 'Вы', value: '0,5%', bold: true },
          { label: 'Конкуренты в среднем', value: '1,2%' },
          { label: 'Топ-5% лучших', value: '2,1%' },
        ],
        tools: [
          { icon: 'mail', label: 'Рассылка по базе' },
          { icon: 'list', label: 'Спецпредложение' },
          { icon: 'list', label: 'Советы по контенту' },
        ],
      },
    ],

    profile: {
      badge: { label: 'Всё отлично', type: 'good' },
      label: 'Уровень сервиса',
      value: '100%',
      progress: 100,
    },

    external: {
      badge: { label: 'Сейчас низкий сезон для этой категории', type: 'warning' },
      label: 'Уровень спроса',
      value: '5 из 10',
      progress: 5,
      maxValue: 10,
      linkLabel: 'Аналитика спроса',
    },
  }
}
