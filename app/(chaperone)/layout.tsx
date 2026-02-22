// Chaperone route group — PIN-based access, no Supabase Auth session required
export default function ChaperoneLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
