import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { TuningDetailPage } from '@/pages/TuningDetailPage'
import { ChatPage } from '@/pages/ChatPage'
import { SetupPage } from '@/pages/SetupPage'
import { LoginPage } from '@/pages/LoginPage'
import { WorkflowPage } from '@/pages/WorkflowPage'
import { LogDetailPage } from '@/pages/LogDetailPage'
import { LogsPage } from '@/pages/LogsPage'
import { getToken } from '@/api/client'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())

  function handleLogin() {
    setLoggedIn(true)
  }

  function handleLogout() {
    import('@/api/client').then(({ clearTokens }) => clearTokens())
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
          <Route path="/tuning/:id" element={<TuningDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/workflow/:pocId" element={<WorkflowPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
