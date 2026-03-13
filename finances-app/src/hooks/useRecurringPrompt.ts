import { useEffect, useState } from "react"
import { getPendingRecurringTemplates } from "@/lib/db/queries/recurring-templates"
import type { RecurringTemplate } from "@/types/database"

/** Detecta templates recurrents pendents i exposa l'estat per mostrar el modal.
 *  Comprova si la transacció ja existeix al mes actual (font de veritat) en lloc
 *  de dependre únicament del camp darrer_mes_gestionat. */
export function useRecurringPrompt(userId: string | null) {
  const [pendingTemplates, setPendingTemplates] = useState<RecurringTemplate[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!userId) return

    const today = new Date()
    const diaAvui = today.getDate()
    const year = today.getFullYear()
    const month = today.getMonth() // 0-indexed
    const mesActual = `${year}-${String(month + 1).padStart(2, "0")}`
    const firstDayMs = new Date(year, month, 1).getTime()
    const lastDayMs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()

    getPendingRecurringTemplates(
      userId,
      diaAvui,
      mesActual,
      firstDayMs,
      lastDayMs,
      daysInCurrentMonth,
    ).then(pending => {
      if (pending.length > 0) {
        setPendingTemplates(pending)
        setShowModal(true)
      }
    })
  }, [userId])

  function removeTemplate(templateId: string) {
    setPendingTemplates(prev => {
      const next = prev.filter(t => t.id !== templateId)
      if (next.length === 0) setShowModal(false)
      return next
    })
  }

  return { pendingTemplates, showModal, setShowModal, removeTemplate }
}
