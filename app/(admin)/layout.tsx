// Admin route group layout — wraps /login and /dashboard
// Auth guard is handled in middleware.ts
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
