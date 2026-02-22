// Mobile-first score entry for chaperones
// TODO: Replace with full design from chaperone-scoreentry.jsx reference

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function ScoreEntryPage({ params }: Props) {
  const { groupId } = await params

  return (
    <main className="min-h-screen bg-forest-900 px-4 py-8">
      <h1 className="font-display text-2xl text-cream-50">Score Entry</h1>
      <p className="mt-1 text-sm text-cream-200">Group: {groupId}</p>
      {/* Hole-by-hole score entry — coming next */}
    </main>
  )
}
