const DAY_OF_WEEK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTH_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export function getDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${dt.getDate()} ${MONTH_GEN[dt.getMonth()]} ${dt.getFullYear()}, ${DAY_OF_WEEK[dt.getDay()]}`
}

export function formatNum(n: number, dec = 0): string {
  const s = n.toFixed(dec)
  const parts = s.split('.')
  const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
  return parts[1] !== undefined ? intFormatted + ',' + parts[1] : intFormatted
}
