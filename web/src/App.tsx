import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { ChatPage } from '@/pages/ChatPage'
import { LogsPage } from '@/pages/LogsPage'
import { LogDetailPage } from '@/pages/LogDetailPage'
import { SetupPage } from '@/pages/SetupPage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route path="/setup" element={<SetupPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
