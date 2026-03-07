import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { getCategories } from "@/lib/db/queries/categories"
import { getTransactions } from "@/lib/db/queries/transactions"
import type { Category } from "@/types/database"

export interface BudgetStatus {
  categoria_id: string
  nom: string
  color: string
  icona: string
  pressupost_mensual: number
  gastat: number
  percentatge: number
  estat: 'ok' | 'warning' | 'exceeded'
}

export function useBudgets() {
  const { userId } = useAuthStore()
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()

    Promise.all([
      getCategories(userId),
      getTransactions({ userId, dateStart: firstDay, dateEnd: lastDay, excludeLiquidacions: true, tipus: 'despesa' })
    ]).then(([categories, transactions]) => {
      const categoriesWithBudget = categories.filter(
        (c: Category) => c.tipus === 'despesa' && c.pressupost_mensual && c.pressupost_mensual > 0
      )

      const result: BudgetStatus[] = categoriesWithBudget.map((cat: Category) => {
        const gastat = transactions
          .filter((t: any) => t.categoria_id === cat.id)
          .reduce((sum: number, t: any) => sum + t.import_trs, 0)

        const percentatge = (gastat / cat.pressupost_mensual!) * 100
        let estat: 'ok' | 'warning' | 'exceeded' = 'ok'
        if (percentatge >= 100) estat = 'exceeded'
        else if (percentatge >= 80) estat = 'warning'

        return {
          categoria_id: cat.id,
          nom: cat.nom,
          color: cat.color,
          icona: cat.icona,
          pressupost_mensual: cat.pressupost_mensual!,
          gastat,
          percentatge,
          estat
        }
      })

      setBudgets(result.sort((a, b) => b.percentatge - a.percentatge))
      setIsLoading(false)
    })
  }, [userId])

  return { budgets, isLoading }
}
