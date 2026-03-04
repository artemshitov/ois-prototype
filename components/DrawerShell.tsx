'use client'

import { useParams } from 'next/navigation'
import StatisticsDrawer from './StatisticsDrawer'

export default function DrawerShell() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : 'item1'
  return <StatisticsDrawer id={id} />
}
