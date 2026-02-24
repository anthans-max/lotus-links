import AdminNavBar from '@/components/admin/AdminNavBar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminNavBar />
      {children}
    </div>
  )
}
