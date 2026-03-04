import StatisticsDrawer from '@/components/StatisticsDrawer'

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StatisticsDrawer activeTab="main" id={id} />
}
