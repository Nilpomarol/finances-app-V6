import { useEffect, useState } from "react"
import { getPendingRecurringTemplates } from "@/lib/db/queries/recurring-templates"
import type { RecurringTemplate } from "@/types/database"

/** Detecta templates recurrents pendents i exposa l'estat per mostrar el modal. */
export function useRecurringPrompt(userId: string | null) {
  const [pendingTemplates, setPendingTemplates] = useState<RecurringTemplate[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!userId) return

    const today = new Date()
    const diaAvui = today.getDate()
    const mesActual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

    getPendingRecurringTemplates(userId).then(templates => {
      const pending = templates.filter(
        t => t.dia_del_mes <= diaAvui && t.darrer_mes_gestionat !== mesActual,
      )
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
