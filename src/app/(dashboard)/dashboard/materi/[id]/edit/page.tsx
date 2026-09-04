import { redirect } from 'next/navigation'

interface LegacyEditMateriPageProps {
  params: Promise<{ id: string }>
}

export default async function LegacyDashboardMateriEditPage({ params }: LegacyEditMateriPageProps) {
  const { id } = await params
  redirect(`/dashboard/artikel/${id}/edit`)
}
