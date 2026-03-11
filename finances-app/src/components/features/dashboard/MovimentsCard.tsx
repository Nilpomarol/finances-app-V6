import { Link } from "react-router-dom"
import { Wallet, ArrowRight, TrendingUp, Users } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { TransactionWithRelations } from "@/types/database"

interface MovimentsCardProps {
  transactions: TransactionWithRelations[]
  onTransactionClick: (tx: TransactionWithRelations) => void
  className?: string
}

export function MovimentsCard({ transactions, onTransactionClick, className }: MovimentsCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 flex flex-col",
      "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Últims Moviments</h2>
          <p className="text-xs text-slate-400 mt-0.5">{transactions.length} transaccions recents</p>
        </div>
        <Link
          to="/transaccions"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Veure tot <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Cap moviment encara</p>
            <p className="text-xs text-slate-400 mt-1">Les transaccions apareixeran aquí</p>
          </div>
        ) : transactions.map(tx => {
          const myRealCost = tx.tipus === "despesa"
            ? tx.import_trs - (tx.total_deutes || 0)
            : tx.import_trs
          const isShared = (tx.total_deutes || 0) > 0 && tx.tipus === "despesa"
          const txDate = new Date(tx.data)
          const day = new Intl.DateTimeFormat("ca-ES", { day: "2-digit" }).format(txDate)
          const mon = new Intl.DateTimeFormat("ca-ES", { month: "short" }).format(txDate)

          return (
            <div
              key={tx.id}
              className="flex items-center gap-5 px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => onTransactionClick(tx)}
            >
              {/* Date */}
              <div className="w-10 text-center shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">{mon}</div>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 tabular-nums leading-tight">{day}</div>
              </div>

              <div className="w-px h-9 bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">{tx.concepte}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {tx.compte_nom ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" />{tx.compte_nom}
                    </span>
                  ) : tx.pagat_per_nom ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 italic">
                      <Users className="w-3 h-3" />{tx.pagat_per_nom}
                    </span>
                  ) : null}
                  {tx.categoria_nom && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 border"
                      style={{
                        color: tx.categoria_color || "#94a3b8",
                        backgroundColor: `${tx.categoria_color || "#94a3b8"}12`,
                        borderColor: `${tx.categoria_color || "#94a3b8"}35`,
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tx.categoria_color || "#94a3b8" }}
                      />
                      {tx.categoria_nom}
                    </span>
                  )}
                  {tx.esdeveniment_nom && (
                    <span className="inline-flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                      ✦ {tx.esdeveniment_nom}
                    </span>
                  )}
                  {isShared && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-2.5 py-0.5">
                      <Users className="w-3 h-3" /> Compartit
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                {isShared ? (
                  <>
                    <span className="font-bold text-sm text-rose-600 tabular-nums">
                      −{formatEuros(myRealCost)}
                    </span>
                    <span className="text-xs text-slate-400 line-through tabular-nums mt-0.5">
                      {formatEuros(tx.import_trs)}
                    </span>
                  </>
                ) : (
                  <span className={cn(
                    "font-bold text-sm tabular-nums",
                    tx.tipus === "ingres" ? "text-emerald-600" :
                    tx.tipus === "despesa" ? "text-rose-500" : "text-sky-600"
                  )}>
                    {tx.tipus === "ingres" ? "+" : tx.tipus === "despesa" ? "−" : ""}
                    {formatEuros(tx.import_trs)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}