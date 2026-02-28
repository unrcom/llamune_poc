import { Link, useLocation } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { useMonkeyStatus } from '@/hooks/useMonkeyStatus'

interface LayoutProps {
  children: React.ReactNode
}

const MODEL_STATUS_LABEL: Record<string, string> = {
  idle: 'アイドル',
  loading: 'ロード中',
  inferring: '推論中',
}

const MODEL_STATUS_COLOR: Record<string, string> = {
  idle: 'bg-green-100 text-green-800',
  loading: 'bg-yellow-100 text-yellow-800',
  inferring: 'bg-blue-100 text-blue-800',
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { status, connected } = useMonkeyStatus()

  const navItems = [
    { path: '/', label: 'ホーム' },
    { path: '/logs', label: 'ログ一覧' },
    { path: '/setup', label: '設定' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-bold text-lg tracking-tight">
              llamune_poc
            </Link>
            {/* monkey ステータスバッジ */}
            {connected && status ? (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  status.healthy
                    ? MODEL_STATUS_COLOR[status.model_status] ?? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {status.healthy
                  ? MODEL_STATUS_LABEL[status.model_status] ?? status.model_status
                  : '応答なし'}
              </span>
            ) : connected ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                未登録
              </span>
            ) : null}
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <Separator />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
