import StatisticsDrawer from '@/components/StatisticsDrawer'

export default async function ItemTabPage({ params }: { params: Promise<{ id: string; tab: string }> }) {
  const { id, tab } = await params
  return <StatisticsDrawer activeTab={tab} id={id} />
}
