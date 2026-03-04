import { useState, useCallback } from "react"
import { syncDb } from "@/lib/db/client"

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sync = useCallback(async () => {
    setIsSyncing(true)
    setError(null)
    try {
      await syncDb()
      setLastSynced(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de sincronització"
      setError(message)
      console.error("[Sync]", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { isSyncing, lastSynced, error, sync }
}