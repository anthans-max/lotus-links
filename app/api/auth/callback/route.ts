import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // If Supabase/Google returned an error directly
  if (errorParam) {
    console.error('OAuth error:', errorParam, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`
    )
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // May fail in certain contexts — session will still be valid
            }
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Code exchange failed:', error.message)
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed`
      )
    }

    // Upsert user profile from Google OAuth metadata
    const user = sessionData.user
    if (user) {
      const meta = user.user_metadata ?? {}
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: (meta.full_name ?? meta.name ?? null) as string | null,
          avatar_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
        },
        { onConflict: 'id' }
      )
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code and no error — shouldn't happen
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
