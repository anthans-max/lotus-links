import AdminNavBar from '@/components/admin/AdminNavBar'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AdminNavBar />
      <div style={{ flex: 1 }}>{children}</div>
      <PoweredByFooter />
    </div>
  )
}
