import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { ChatPage } from '@/pages/ChatPage'
import { LogsPage } from '@/pages/LogsPage'
import { LogDetailPage } from '@/pages/LogDetailPage'
import { SetupPage } from '@/pages/SetupPage'
import { LoginPage } from '@/pages/LoginPage'
import { getToken } from '@/api/client'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())

  function handleLogin() {
    setLoggedIn(true)
  }

  function handleLogout() {
    import('@/api/client').then(({ clearToken }) => clearToken())
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
