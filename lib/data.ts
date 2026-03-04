export type SegmentKey = 'g' | 'b' | 'p' | 'v' | 't'

export interface DailyEntry {
  impressions: number
  vasImpressions: number
  views: number
  vasViews: number
  contacts: number
  spending: number
  contactsShowPhone: number
  contactsMessenger: number
  contactsShowPhoneAndMessenger: number
  contactsSbcDiscount: number
  [key: string]: unknown
}

// ── Raw JSON types (new API format) ─────────────────────────────────────────

interface RawDateValue {
  slug: string
  value: number | null
  missingValueTooltip?: string
}

interface RawDateEntry {
  start: string
  end: string
  services: unknown[]
  type: string
  values: RawDateValue[]
}

interface RawMetric {
  slug: string
  total: { value: number }
  summary?: {
    dynamic?: {
      text?: {
        attributes?: {
          dynamics?: { value?: { title?: string; list?: Array<Record<string, unknown>> } }
          icon?: { value?: { iconName?: string } }
        }
      }
    }
  }
  [key: string]: unknown
}

interface RawWidget {
  slug: string
  value: {
    attributes: {
      value: { value: { title: string } }
      [key: string]: unknown
    }
    text: string
    version: number
  }
  [key: string]: unknown
}

export interface RawVas {
  name: string
  startTime: number
  endTime: number
  price: number
  icon: { default: string; planned?: string; small?: string }
  slug: string
  type: string
}

export interface RawItemData {
  listing: {
    title: string
    price: string
    id: string
    location: string
    imageUrl: string
  }
  dates: RawDateEntry[]
  metrics: RawMetric[]
  vases: RawVas[]
  widgets: RawWidget[]
}

export interface DynamicInfo {
  title: string          // e.g. "537,3%"
  icon: 'up' | 'down'   // arrowUp → up, else down
  color: string          // hex color from fontColor
}

export interface ParsedItemData {
  listing: RawItemData['listing']
  data: DailyEntry[]
  startDates: string[]
  totals: { imp: number; views: number; contacts: number; spending: number }
  dynamics: { imp: DynamicInfo | null; views: DynamicInfo | null; contacts: DynamicInfo | null; spending: DynamicInfo | null }
  favorites: number
  vases: RawVas[]
}

function getRawVal(values: RawDateValue[], slug: string): number {
  return values.find(v => v.slug === slug)?.value ?? 0
}

function parseDynamic(metric: RawMetric | undefined): DynamicInfo | null {
  const attrs = metric?.summary?.dynamic?.text?.attributes
  if (!attrs) return null
  const title = attrs.dynamics?.value?.title
  if (!title) return null
  const iconName = attrs.icon?.value?.iconName ?? ''
  const colorEntry = attrs.dynamics?.value?.list?.find(
    (e: Record<string, unknown>) => e.type === 'fontColor'
  )
  const color = (colorEntry?.value as string | undefined) ?? '#757575'
  return { title, icon: iconName === 'arrowUp' ? 'up' : 'down', color }
}

export function parseItemData(raw: RawItemData): ParsedItemData {
  const last30 = raw.dates.slice(-30)

  const data: DailyEntry[] = last30.map(d => ({
    impressions:                  getRawVal(d.values, 'impressions'),
    vasImpressions:               getRawVal(d.values, 'vasImpressions'),
    views:                        getRawVal(d.values, 'views'),
    vasViews:                     getRawVal(d.values, 'vasViews'),
    contacts:                     getRawVal(d.values, 'contacts'),
    spending:                     getRawVal(d.values, 'allSpending') / 100,
    contactsShowPhone:            getRawVal(d.values, 'contactsShowPhone'),
    contactsMessenger:            getRawVal(d.values, 'contactsMessenger'),
    contactsShowPhoneAndMessenger: getRawVal(d.values, 'contactsShowPhoneAndMessenger'),
    contactsSbcDiscount:          getRawVal(d.values, 'contactsSbcDiscount'),
  }))

  const findMetric = (slug: string) => raw.metrics.find(m => m.slug === slug)
  const getMetric = (slug: string) => findMetric(slug)?.total.value ?? 0
  const totals = {
    imp:      getMetric('impressions'),
    views:    getMetric('views'),
    contacts: getMetric('contacts'),
    spending: getMetric('allSpending') / 100,
  }
  const dynamics = {
    imp:      parseDynamic(findMetric('impressions')),
    views:    parseDynamic(findMetric('views')),
    contacts: parseDynamic(findMetric('contacts')),
    spending: parseDynamic(findMetric('allSpending')),
  }

  const favWidget = raw.widgets.find(w => w.slug === 'favorites')
  const favStr = favWidget?.value?.attributes?.value?.value?.title ?? '0'
  const favorites = parseInt(favStr.replace(/[\s\u00a0]/g, ''), 10) || 0

  return {
    listing: raw.listing,
    data,
    startDates: last30.map(d => d.start),
    totals,
    dynamics,
    favorites,
    vases: raw.vases,
  }
}

export interface BarData {
  h: number
  g: number
  b: number
  p?: number
  v?: number
  t?: number
  [key: string]: number | undefined
}

export interface ChartConfig {
  id: string
  data: BarData[]
  yMax: number
  keys: SegmentKey[]
  labels: Partial<Record<SegmentKey, string>>
  unit: string
  strikethrough?: boolean
}


export interface WeekInfo {
  label: string        // e.g. "2\u20148"
  dayIndices: number[] // indices into the 30-day array
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Group daily entries into 7-day chunks starting from the last day, discarding incomplete remainder. */
export function aggregateWeekly(data: DailyEntry[], startDates: string[]): { data: DailyEntry[]; weeks: WeekInfo[] } {
  const total = data.length
  const fullWeeks = Math.floor(total / 7)
  const skip = total - fullWeeks * 7 // discard incomplete days at the start

  const groups: number[][] = []
  for (let w = 0; w < fullWeeks; w++) {
    const start = skip + w * 7
    const indices: number[] = []
    for (let d = 0; d < 7; d++) indices.push(start + d)
    groups.push(indices)
  }

  const aggregated: DailyEntry[] = groups.map(indices => {
    const entries = indices.map(i => data[i])
    return {
      impressions:                  entries.reduce((s, e) => s + e.impressions, 0),
      vasImpressions:               entries.reduce((s, e) => s + e.vasImpressions, 0),
      views:                        entries.reduce((s, e) => s + e.views, 0),
      vasViews:                     entries.reduce((s, e) => s + e.vasViews, 0),
      contacts:                     entries.reduce((s, e) => s + e.contacts, 0),
      spending:                     entries.reduce((s, e) => s + e.spending, 0),
      contactsShowPhone:            entries.reduce((s, e) => s + e.contactsShowPhone, 0),
      contactsMessenger:            entries.reduce((s, e) => s + e.contactsMessenger, 0),
      contactsShowPhoneAndMessenger: entries.reduce((s, e) => s + e.contactsShowPhoneAndMessenger, 0),
      contactsSbcDiscount:          entries.reduce((s, e) => s + e.contactsSbcDiscount, 0),
    }
  })

  const weeks: WeekInfo[] = groups.map(indices => {
    const s = parseLocalDate(startDates[indices[0]])
    const e = parseLocalDate(startDates[indices[indices.length - 1]])
    return {
      label: `${s.getDate()}\u2014${e.getDate()}`,
      dayIndices: indices,
    }
  })

  return { data: aggregated, weeks }
}

export const COLOR_HEX: Record<SegmentKey, string> = {
  g: '#45ed6f',
  b: '#45c1ff',
  p: '#f59fad',
  v: '#b088f9',
  t: '#ffd599',
}

export const COLOR_CLASS: Record<SegmentKey, string> = {
  g: 'bar-green',
  b: 'bar-blue',
  p: 'bar-pink',
  v: 'bar-purple',
  t: 'bar-beige',
}

// impressions — max 992 (Feb 16), scale = 100/992
// g = vasImpressions (с продвижением), b = impressions − vasImpressions (органические)
const showsData: BarData[] = [
  {h:31,g:10,b:21}, {h:27,g:10,b:17}, {h:21,g:10,b:11}, {h:24,g:9,b:15},  {h:21,g:9,b:12},
  {h:19,g:10,b:9},  {h:19,g:11,b:8},  {h:26,g:14,b:12}, {h:49,g:18,b:31}, {h:51,g:22,b:29},
  {h:47,g:22,b:25}, {h:49,g:21,b:28}, {h:61,g:23,b:38}, {h:46,g:22,b:24}, {h:63,g:14,b:49},
  {h:52,g:16,b:36}, {h:48,g:18,b:30}, {h:60,g:16,b:44}, {h:55,g:18,b:37}, {h:80,g:26,b:54},
  {h:100,g:21,b:79},{h:62,g:17,b:45}, {h:36,g:11,b:25}, {h:48,g:17,b:31}, {h:43,g:13,b:30},
  {h:41,g:16,b:25}, {h:37,g:18,b:19}, {h:51,g:18,b:33}, {h:48,g:19,b:29}, {h:45,g:12,b:33},
]

// views — max 96 (Feb 16), scale = 100/96
// g = vasViews, b = views − vasViews
const viewsData: BarData[] = [
  {h:65,g:8,b:57},  {h:58,g:10,b:48}, {h:47,g:6,b:41},  {h:60,g:11,b:49}, {h:42,g:10,b:32},
  {h:35,g:10,b:25}, {h:41,g:9,b:32},  {h:41,g:8,b:33},  {h:83,g:21,b:62}, {h:66,g:19,b:47},
  {h:61,g:11,b:50}, {h:60,g:16,b:44}, {h:79,g:26,b:53}, {h:69,g:15,b:54}, {h:60,g:18,b:42},
  {h:58,g:13,b:45}, {h:52,g:21,b:31}, {h:68,g:14,b:54}, {h:51,g:11,b:40}, {h:83,g:22,b:61},
  {h:100,g:22,b:78},{h:49,g:10,b:39}, {h:31,g:7,b:24},  {h:39,g:6,b:33},  {h:58,g:16,b:42},
  {h:49,g:14,b:35}, {h:41,g:10,b:31}, {h:59,g:15,b:44}, {h:74,g:27,b:47}, {h:80,g:22,b:58},
]

// contacts — max 4, scale = 100/4 = 25; h=2 is visual minimum for zero days
const contactsData: BarData[] = [
  {h:25,g:0,b:25},  {h:25,g:0,b:25},  {h:0,g:0,b:0},    {h:0,g:0,b:0},    {h:25,g:0,b:25},
  {h:25,g:0,b:25},  {h:0,g:0,b:0},    {h:0,g:0,b:0},    {h:25,g:0,b:25},  {h:0,g:0,b:0},
  {h:25,g:0,b:25},  {h:0,g:0,b:0},    {h:25,g:0,b:25},  {h:0,g:0,b:0},    {h:25,g:0,b:25},
  {h:0,g:0,b:0},    {h:0,g:0,b:0},    {h:100,g:0,b:100},{h:0,g:0,b:0},    {h:25,g:0,b:25},
  {h:50,g:0,b:50},  {h:0,g:0,b:0},    {h:0,g:0,b:0},    {h:0,g:0,b:0},    {h:0,g:0,b:0},
  {h:50,g:0,b:50},  {h:0,g:0,b:0},    {h:25,g:0,b:25},  {h:100,g:0,b:100},{h:50,g:0,b:50},
]

// spending — max 1152 (Feb 16), scale = 100/1152
const expensesData: BarData[] = [
  {h:29,g:29,b:0}, {h:29,g:29,b:0}, {h:22,g:22,b:0}, {h:30,g:30,b:0}, {h:19,g:19,b:0},
  {h:18,g:18,b:0}, {h:20,g:20,b:0}, {h:25,g:25,b:0}, {h:82,g:82,b:0}, {h:62,g:62,b:0},
  {h:61,g:61,b:0}, {h:51,g:51,b:0}, {h:75,g:75,b:0}, {h:58,g:58,b:0}, {h:44,g:44,b:0},
  {h:53,g:53,b:0}, {h:52,g:52,b:0}, {h:64,g:64,b:0}, {h:51,g:51,b:0}, {h:82,g:82,b:0},
  {h:100,g:100,b:0},{h:47,g:47,b:0},{h:31,g:31,b:0}, {h:38,g:38,b:0}, {h:58,g:58,b:0},
  {h:46,g:46,b:0}, {h:41,g:41,b:0}, {h:59,g:59,b:0}, {h:73,g:73,b:0}, {h:75,g:75,b:0},
]

export const CHARTS: ChartConfig[] = [
  {
    id: 'shows',
    data: showsData,
    yMax: 992,
    keys: ['g', 'b'],
    labels: { g: 'Показы с продвижением', b: 'Показы без продвижения' },
    unit: '',
  },
  {
    id: 'views',
    data: viewsData,
    yMax: 96,
    keys: ['g', 'b'],
    labels: { g: 'Просмотры с продвижением', b: 'Просмотры без продвижения' },
    unit: '',
  },
  {
    id: 'contacts',
    data: contactsData,
    yMax: 4,
    keys: ['b'],
    labels: { b: 'Контакты' },
    unit: '',
  },
  {
    id: 'expenses',
    data: expensesData,
    yMax: 1152,
    keys: ['g'],
    labels: { g: 'Расходы' },
    unit: '\u00a0₽',
  },
]

export function buildCharts(data: DailyEntry[]): ChartConfig[] {
  const norm = (v: number, max: number) => max > 0 ? Math.round(v / max * 100) : 0

  const maxImp      = Math.max(...data.map(d => d.impressions))
  const maxViews    = Math.max(...data.map(d => d.views))
  const maxContacts = Math.max(...data.map(d => d.contacts))
  const maxSpending = Math.max(...data.map(d => d.spending))

  return [
    {
      id: 'shows',
      yMax: maxImp,
      keys: ['g', 'b'],
      labels: { g: 'Показы с продвижением', b: 'Показы без продвижения' },
      unit: '',
      data: data.map(d => ({
        h: norm(d.impressions, maxImp),
        g: norm(d.vasImpressions, maxImp),
        b: norm(d.impressions - d.vasImpressions, maxImp),
      })),
    },
    {
      id: 'views',
      yMax: maxViews,
      keys: ['g', 'b'],
      labels: { g: 'Просмотры с продвижением', b: 'Просмотры без продвижения' },
      unit: '',
      data: data.map(d => ({
        h: norm(d.views, maxViews),
        g: norm(d.vasViews, maxViews),
        b: norm(d.views - d.vasViews, maxViews),
      })),
    },
    {
      id: 'contacts',
      yMax: maxContacts,
      keys: ['b', 'v', 'p', 't'],
      labels: {
        b: 'Посмотрели телефон',
        v: 'Написали в\u00a0чат',
        p: 'Посмотрели телефон и\u00a0написали в\u00a0чат',
        t: 'Откликнулись на\u00a0скидку в\u00a0чате',
      },
      unit: '',
      data: data.map(d => ({
        h: norm(d.contacts, maxContacts),
        g: 0,
        b: norm(d.contactsShowPhone, maxContacts),
        v: norm(d.contactsMessenger, maxContacts),
        p: norm(d.contactsShowPhoneAndMessenger, maxContacts),
        t: norm(d.contactsSbcDiscount, maxContacts),
      })),
    },
    {
      id: 'expenses',
      yMax: maxSpending,
      keys: ['b'],
      labels: { b: 'Расходы' },
      unit: '\u00a0₽',
      data: data.map(d => ({
        h: norm(d.spending, maxSpending),
        g: 0,
        b: norm(d.spending, maxSpending),
      })),
    },
  ]
}
