import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { getPeople } from "@/lib/db/queries/people"

export interface DebtSummary {
  persona_id: string
  nom: string
  balance: number
  direction: 'et_deuen' | 'deus' | 'saldat'
}

export function useDebts() {
  const { userId } = useAuthStore()
  const [debts, setDebts] = useState<DebtSummary[]>([])
  const [totalEtDeuen, setTotalEtDeuen] = useState(0)
  const [totalDeus, setTotalDeus] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    getPeople(userId).then(people => {
      const result: DebtSummary[] = people
        .filter(p => !p.amagat && Math.abs(p.balance) > 0.01)
        .map((p): DebtSummary => {
          const direction: DebtSummary["direction"] =
            p.balance > 0 ? "et_deuen" : p.balance < 0 ? "deus" : "saldat"

          return {
            persona_id: p.id,
            nom: p.nom,
            balance: p.balance,
            direction,
          }
        })
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

      setDebts(result)
      setTotalEtDeuen(result.filter(d => d.direction === 'et_deuen').reduce((s, d) => s + d.balance, 0))
      setTotalDeus(result.filter(d => d.direction === 'deus').reduce((s, d) => s + Math.abs(d.balance), 0))
      setIsLoading(false)
    })
  }, [userId])

  return { debts, totalEtDeuen, totalDeus, isLoading }
}
