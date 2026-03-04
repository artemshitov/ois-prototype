import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '800'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Статистика по объявлению',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <head><script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script></head>
      <body className={manrope.className}>{children}</body>
    </html>
  )
}
