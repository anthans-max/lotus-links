import { createClient } from '@/lib/supabase/client'

const BUCKET = 'logos'
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

export async function uploadLogo(file: File, leagueId: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Accepted: PNG, JPG, SVG, WEBP')
  }

  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 2MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const filename = `${leagueId}-${Date.now()}.${ext}`

  const supabase = createClient()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename)

  return publicUrl
}

export async function removeLogo(url: string) {
  const supabase = createClient()

  // Extract filename from the public URL
  const parts = url.split(`/storage/v1/object/public/${BUCKET}/`)
  if (parts.length < 2) return

  const filename = parts[1]

  await supabase.storage
    .from(BUCKET)
    .remove([filename])
}
