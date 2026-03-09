import { useState } from "react"
import { formatEuros } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface CategoryRow {
  id: string
  nom: string
  color: string
  total: number
}

interface CategoriesCardProps {
  despeses: CategoryRow[]
  ingressos: CategoryRow[]
  totalDespeses: number
  totalIngressos: number
  nomMes: string
  className?: string
}

export function CategoriesCard({
  despeses,
  ingressos,
  totalDespeses,
  totalIngressos,
  nomMes,
  className,
}: CategoriesCardProps) {
  const [tab, setTab] = useState<"despeses" | "ingressos">("despeses")
  const breakdown = tab === "despeses" ? despeses : ingressos
  const total = tab === "despeses" ? totalDespeses : totalIngressos

  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 flex flex-col",
      "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden",
      className
    )}>
      {/* Header — title + tab switcher on the same line */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Categories</h2>
          <p className="text-xs text-slate-400 mt-0.5">{nomMes}</p>
        </div>

        {/* Inline pill switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setTab("despeses")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition-all",
              tab === "despeses"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Despeses
          </button>
          <button
            onClick={() => setTab("ingressos")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition-all",
              tab === "ingressos"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            Ingressos
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto">
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">
            Cap {tab === "despeses" ? "despesa" : "ingrés"} registrat.
          </p>
        ) : breakdown.map(cat => {
          const pct = total > 0 ? (cat.total / total) * 100 : 0
          return (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-semibold text-slate-800 truncate">{cat.nom}</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                  {formatEuros(cat.total)}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-4">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-8 text-right shrink-0 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}