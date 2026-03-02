import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import CreateLeagueForm from '@/components/admin/CreateLeagueForm'

export const metadata: Metadata = {
  title: 'Create League',
}

export default async function NewLeaguePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only owners and new users (no memberships) can create leagues
  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  if (user.email !== superAdmin) {
    const { data: myAdminRows } = await supabase
      .from('league_admins')
      .select('role')
      .eq('email', user.email!)
    const rows = myAdminRows ?? []
    const canCreate = rows.length === 0 || rows.some((r: any) => r.role === 'owner')
    if (!canCreate) redirect('/dashboard/leagues')
  }

  return (
    <div className="section fade-up">
      <PageHeader
        title="Create League"
        backHref="/dashboard/leagues"
        backLabel="Leagues"
      />
      <CreateLeagueForm userEmail={user.email || ''} />
    </div>
  )
}
