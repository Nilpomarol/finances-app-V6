import { Users } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import type { TransactionSplit, Person } from "@/types/database"

interface TransactionSplitListProps {
  splits: TransactionSplit[]
  people: Person[]
}

export function TransactionSplitList({ splits, people }: TransactionSplitListProps) {
  if (splits.length === 0) return null

  const personName = (personaId: string) =>
    people.find((p) => p.id === personaId)?.nom ?? personaId

  return (
    <div className="px-6 pb-3 bg-white dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Han de pagar
      </p>
      <div className="space-y-1.5">
        {splits.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-3.5 py-2.5"
          >
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {personName(s.persona_id)}
            </span>
            <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatEuros(s.import_degut)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}