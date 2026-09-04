import { redirect } from 'next/navigation'

interface LegacyRenunganSlugPageProps {
  params: Promise<{ slug: string }>
}

export default async function LegacyRenunganSlugPage({ params }: LegacyRenunganSlugPageProps) {
  const { slug } = await params
  redirect(`/artikel/${slug}`)
}
