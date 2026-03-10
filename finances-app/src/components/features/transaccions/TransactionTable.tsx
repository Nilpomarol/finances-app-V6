import type { Transaction, TransactionWithRelations } from "@/types/database"
import { formatEuros, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import CategoryIcon from "@/components/shared/CategoryIcon"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  Users,
  CalendarDays,
} from "lucide-react"

const TIPUS_CONFIG: Record<
  Transaction["tipus"],
  { icon: React.ElementType; bg: string; iconColor: string; sign: string }
> = {
  ingres: {
    icon: TrendingUp,
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    sign: "+",
  },
  despesa: {
    icon: TrendingDown,
    bg: "bg-rose-50 dark:bg-rose-900/30",
    iconColor: "text-rose-500 dark:text-rose-400",
    sign: "-",
  },
  transferencia: {
    icon: ArrowLeftRight,
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    sign: "",
  },
}

export interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  isLoading?: boolean
  onView?: (tx: TransactionWithRelations) => void
  onEdit?: (tx: TransactionWithRelations) => void
  onDelete?: (tx: TransactionWithRelations) => void
  page?: number
  totalPages?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  showAccount?: boolean
  showCategory?: boolean
  showEvent?: boolean
}

const PAGE_SIZE = 25
const PAGE_SIZE_SKELETON = 6

const card =
  "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({
  showAccount,
  showCategory,
}: {
  showAccount: boolean
  showCategory: boolean
}) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <td className="px-3 py-3.5 w-[90px]">
        <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full w-16 animate-pulse" />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full w-36 animate-pulse" />
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-20 animate-pulse" />
          </div>
        </div>
      </td>
      {showAccount && (
        <td className="px-5 py-3.5 hidden md:table-cell">
          <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full w-28 animate-pulse" />
        </td>
      )}
      {showCategory && (
        <td className="px-5 py-3.5 hidden lg:table-cell">
          <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full w-20 animate-pulse" />
        </td>
      )}
      <td className="px-5 py-3.5">
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-20 ml-auto animate-pulse" />
      </td>
      <td className="px-4 py-3.5 w-16" />
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionTable({
  transactions,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  page = 0,
  totalPages = 1,
  totalCount,
  onPageChange,
  showAccount = true,
  showCategory = true,
  showEvent = false,
}: TransactionTableProps) {
  const firstItem = page * PAGE_SIZE + 1
  const lastItem = Math.min((page + 1) * PAGE_SIZE, totalCount ?? transactions.length)

  if (isLoading) {
    return (
      <div className={cn(card, "overflow-hidden")}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[90px]">Data</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Transacció</th>
              {showAccount && <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden md:table-cell">Compte</th>}
              {showCategory && <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden lg:table-cell">Categoria</th>}
              <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Import</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PAGE_SIZE_SKELETON }).map((_, i) => (
              <SkeletonRow key={i} showAccount={showAccount} showCategory={showCategory} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className={cn(card)}>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <ArrowUpDown className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cap transacció trobada</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1.5 max-w-xs">
            Prova a canviar els filtres o crea una nova transacció.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={cn(card, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[90px]">
                  Data
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Transacció
                </th>
                {showAccount && (
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden md:table-cell">
                    Compte
                  </th>
                )}
                {showCategory && (
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden lg:table-cell">
                    Categoria
                  </th>
                )}
                {showEvent && (
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden lg:table-cell">
                    Esdeveniment
                  </th>
                )}
                <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Import
                </th>
                {(onEdit || onDelete) && <th className="w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => {
                const { icon: Icon, bg, iconColor, sign } = TIPUS_CONFIG[tx.tipus]
                const isTransfer = tx.tipus === "transferencia"
                const hasSharedExpense =
                  tx.tipus === "despesa" && (tx.total_deutes ?? 0) > 0
                const amountPaid = hasSharedExpense
                  ? tx.import_trs - (tx.total_deutes ?? 0)
                  : null

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onView?.(tx)}
                    className={cn(
                      "transition-colors duration-100 group",
                      onView && "cursor-pointer",
                      hasSharedExpense
                        ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {/* ── Data ── */}
                    <td className="px-3 py-3.5 whitespace-nowrap w-[90px]">
                      <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatDate(tx.data)}
                      </span>
                    </td>

                    {/* ── Transacció ── */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {tx.categoria_id && tx.categoria_icona && !isTransfer ? (
                          <CategoryIcon
                            icona={tx.categoria_icona}
                            color={tx.categoria_color ?? "#6366f1"}
                            size="sm"
                          />
                        ) : (
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                            <Icon className={cn("w-4 h-4", iconColor)} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold truncate max-w-[320px] text-slate-900 dark:text-white leading-snug">
                            {tx.concepte}
                          </p>
                          {(tx.esdeveniment_nom || hasSharedExpense || !!tx.recurrent) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {tx.esdeveniment_nom && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                  <CalendarDays className="w-3 h-3 shrink-0" />
                                  {tx.esdeveniment_nom}
                                </span>
                              )}
                              {hasSharedExpense && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Users className="w-3 h-3 shrink-0" />
                                  Compartida
                                </span>
                              )}
                              {!!tx.recurrent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  <RefreshCw className="w-3 h-3 shrink-0" />
                                  Recurrent
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ── Compte ── */}
                    {showAccount && (
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {isTransfer ? (
                          tx.compte_nom ? (
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.compte_color ?? "#6366f1" }} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[110px]">{tx.compte_nom}</span>
                              </div>
                              <div className="flex items-center gap-1 pl-0.5">
                                <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 ml-[3px]" />
                                <ArrowDownRight className="w-3 h-3 text-indigo-400 dark:text-indigo-500 -ml-0.5" />
                              </div>
                              {tx.compte_desti_nom && (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-2 h-2 rounded-full shrink-0 ring-1 ring-indigo-300 dark:ring-indigo-600" style={{ backgroundColor: tx.compte_color ?? "#6366f1" }} />
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[110px]">{tx.compte_desti_nom}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                          )
                        ) : tx.compte_nom ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.compte_color ?? "#6366f1" }} />
                            <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{tx.compte_nom}</span>
                          </div>
                        ) : tx.pagat_per_nom ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 shrink-0 text-violet-400 dark:text-violet-500" />
                            <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[120px] italic">{tx.pagat_per_nom}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                    )}

                    {/* ── Categoria ── */}
                    {showCategory && (
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {isTransfer ? (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        ) : tx.categoria_nom ? (
                          <div className="flex items-center gap-2">
                            {tx.categoria_icona && (
                              <CategoryIcon
                                icona={tx.categoria_icona}
                                color={tx.categoria_color ?? "#6366f1"}
                                size="sm"
                              />
                            )}
                            <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                              {tx.categoria_nom}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                    )}

                    {/* ── Esdeveniment ── */}
                    {showEvent && (
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {tx.esdeveniment_nom ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <CalendarDays className="w-3 h-3 shrink-0" />
                            {tx.esdeveniment_nom}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                    )}

                    {/* ── Import ── */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {hasSharedExpense ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[17px] font-bold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                            -{formatEuros(amountPaid!)}
                          </span>
                          <span className="text-xs tabular-nums text-amber-400 dark:text-amber-600 line-through">
                            {formatEuros(tx.import_trs)}
                          </span>
                        </div>
                      ) : isTransfer ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
                          <span className="text-[17px] font-bold tabular-nums tracking-tight text-indigo-500 dark:text-indigo-400">
                            {formatEuros(tx.import_trs)}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "text-[17px] font-bold tabular-nums tracking-tight",
                            tx.tipus === "ingres" && "text-emerald-600 dark:text-emerald-400",
                            tx.tipus === "despesa" && "text-rose-500 dark:text-rose-400",
                          )}
                        >
                          {sign}{formatEuros(tx.import_trs)}
                        </span>
                      )}
                    </td>

                    {/* ── Accions ── */}
                    {(onEdit || onDelete) && (
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {onEdit && (
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              onClick={() => onEdit(tx)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              onClick={() => onDelete(tx)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Paginació ── */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {firstItem}–{lastItem}{" "}
            <span className="text-slate-300 dark:text-slate-600">de</span>{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {totalCount ?? transactions.length}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(0)} disabled={page === 0} title="Primera pàgina">
              <ChevronLeft className="w-3 h-3 -mr-1" /><ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-sm border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-2 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" className="h-8 px-3 text-sm border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
              Següent<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(totalPages - 1)} disabled={page >= totalPages - 1} title="Última pàgina">
              <ChevronRight className="w-3 h-3 -mr-1" /><ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}