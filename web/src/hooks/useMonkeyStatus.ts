import { useState, useEffect, useRef } from 'react'
import { api } from '@/api/client'

export type ModelStatus = 'idle' | 'loading' | 'inferring'

export interface MonkeyStatus {
  healthy: boolean
  model_status: ModelStatus
  current_model: string | null
  queue_size: number
}

const DEFAULT_STATUS: MonkeyStatus = {
  healthy: false,
  model_status: 'idle',
  current_model: null,
  queue_size: 0,
}

export function useMonkeyStatus() {
  const [status, setStatus] = useState<MonkeyStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // /instance-info から instance_id と monkey_url を取得
      let instanceId: string
      let monkeyUrl: string
      try {
        const info = await api.getInstanceInfo()
        instanceId = info.instance_id
        monkeyUrl = info.monkey_url
      } catch {
        return
      }

      // monkey_url が未設定なら何もしない
      if (!monkeyUrl) return

      // http(s) → ws(s) に変換
      const wsUrl = monkeyUrl.replace(/^http/, 'ws') + '/ws/status'

      function connect() {
        if (cancelled) return
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!cancelled) setConnected(true)
        }

        ws.onmessage = (event) => {
          if (cancelled) return
          try {
            const instances: Array<MonkeyStatus & { instance_id: string }> = JSON.parse(event.data)
            const mine = instances.find((i) => i.instance_id === instanceId)
            setStatus(mine ?? { ...DEFAULT_STATUS })
          } catch {
            // ignore parse error
          }
        }

        ws.onclose = () => {
          if (cancelled) return
          setConnected(false)
          // 5秒後に再接続
          setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          ws.close()
        }
      }

      connect()
    }

    init()

    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [])

  return { status, connected }
}
