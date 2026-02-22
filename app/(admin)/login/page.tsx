import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LoginCard from '@/components/admin/LoginCard'

export const metadata: Metadata = {
  title: 'Admin Login',
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Already signed in — go straight to dashboard
  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return <LoginCard error={error} />
}
