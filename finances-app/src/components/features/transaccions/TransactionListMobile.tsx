/**
 * TransactionListMobile.tsx
 * Mobile-only transaction list. Rendered exclusively on small screens (<sm).
 * Each row: icon · concept + amount (line 1) · date · category · account (line 2) · tags (line 3, if any).
 */

import type { Transaction, TransactionWithRelations } from "@/types/database"
import { formatEuros, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import CategoryIcon from "@/components/shared/CategoryIcon"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ArrowUpDown,
  RefreshCw,
  Users,
  CalendarDays,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoveRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPUS_CONFIG: Record<
  Transaction["tipus"],
  { icon: React.ElementType; bg: string; iconColor: string; sign: string; amountColor: string }
> = {
  ingres: {
    icon: TrendingUp,
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    sign: "+",
    amountColor: "text-emerald-600 dark:text-emerald-400",
  },
  despesa: {
    icon: TrendingDown,
    bg: "bg-rose-50 dark:bg-rose-900/30",
    iconColor: "text-rose-500 dark:text-rose-400",
    sign: "-",
    amountColor: "text-rose-500 dark:text-rose-400",
  },
  transferencia: {
    icon: ArrowLeftRight,
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    sign: "",
    amountColor: "text-indigo-500 dark:text-indigo-400",
  },
}

const PAGE_SIZE = 25

const card =
  "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionListMobileProps {
  transactions: TransactionWithRelations[]
  isLoading?: boolean
  onView?: (tx: TransactionWithRelations) => void
  onEdit?: (tx: TransactionWithRelations) => void
  onDelete?: (tx: TransactionWithRelations) => void
  page?: number
  totalPages?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  className?: string
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex justify-between gap-3">
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-28 animate-pulse" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-14 animate-pulse" />
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-40 animate-pulse" />
      </div>
    </div>
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  onView,
  onEdit,
  onDelete,
}: {
  tx: TransactionWithRelations
  onView?: (tx: TransactionWithRelations) => void
  onEdit?: (tx: TransactionWithRelations) => void
  onDelete?: (tx: TransactionWithRelations) => void
}) {
  const { icon: Icon, bg, iconColor, sign, amountColor } = TIPUS_CONFIG[tx.tipus]
  const isTransfer = tx.tipus === "transferencia"
  const hasShared = tx.tipus === "despesa" && (tx.total_deutes ?? 0) > 0
  const amountPaid = hasShared ? tx.import_trs - (tx.total_deutes ?? 0) : null

  return (
    <div
      onClick={() => onView?.(tx)}
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0",
        onView && "cursor-pointer",
        hasShared && "bg-amber-50/50 dark:bg-amber-900/10"
      )}
    >
      {/* ── Icon ── */}
      <div className="shrink-0 mt-[3px]">
        {tx.categoria_id && tx.categoria_icona && !isTransfer ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            {/* Tinted bg using the category colour at low opacity */}
            <div
              className="absolute inset-0 opacity-10 dark:opacity-20"
              style={{ backgroundColor: tx.categoria_color ?? "#6366f1" }}
            />
            <CategoryIcon
              icona={tx.categoria_icona}
              color={tx.categoria_color ?? "#6366f1"}
              size="sm"
            />
          </div>
        ) : (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bg)}>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-w-0">

        {/* Line 1: concept + amount */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
            {tx.concepte}
          </p>
          <div className="shrink-0 text-right leading-tight">
            {hasShared ? (
              <>
                <span className="text-[13.5px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  -{formatEuros(amountPaid!)}
                </span>
                <span className="block text-[10px] tabular-nums text-amber-400/80 dark:text-amber-600 line-through leading-none mt-0.5">
                  {formatEuros(tx.import_trs)}
                </span>
              </>
            ) : (
              <span className={cn("text-[13.5px] font-bold tabular-nums", amountColor)}>
                {sign}{formatEuros(tx.import_trs)}
              </span>
            )}
          </div>
        </div>

        {/* Line 2: date · category · account · tags — all on one line */}
        <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
            {formatDate(tx.data)}
          </span>

          {isTransfer ? (
            tx.compte_nom && (
              <>
                <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
                <span className="flex items-center gap-0.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: tx.compte_color ?? "#6366f1" }}
                  />
                  <span className="max-w-[55px] truncate">{tx.compte_nom}</span>
                  <MoveRight className="w-2.5 h-2.5 text-indigo-400 mx-0.5 shrink-0" />
                  <span className="max-w-[55px] truncate">{tx.compte_desti_nom}</span>
                </span>
              </>
            )
          ) : (
            <>
              {tx.categoria_nom && (
                <>
                  <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[72px]">
                    {tx.categoria_nom}
                  </span>
                </>
              )}
              {tx.compte_nom && (
                <>
                  <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: tx.compte_color ?? "#6366f1" }}
                    />
                    <span className="truncate max-w-[65px]">{tx.compte_nom}</span>
                  </span>
                </>
              )}
            </>
          )}

          {/* Tags inline — clipped by overflow-hidden on the parent */}
          {tx.esdeveniment_nom && (
            <>
              <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 leading-none shrink-0">
                <CalendarDays className="w-2.5 h-2.5 shrink-0" />
                {tx.esdeveniment_nom}
              </span>
            </>
          )}
          {hasShared && (
            <>
              <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md bg-amber-50 dark:bg-amber-900/30 text-[10px] font-semibold text-amber-600 dark:text-amber-400 leading-none shrink-0">
                <Users className="w-2.5 h-2.5 shrink-0" />
                Compartida
              </span>
            </>
          )}
          {!!tx.recurrent && (
            <>
              <span className="text-[11px] text-slate-300 dark:text-slate-700 shrink-0">·</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none shrink-0">
                <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                Recurrent
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 mt-[3px] -mr-1"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(tx)}>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600"
                onClick={() => onDelete(tx)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TransactionListMobile({
  transactions,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  page = 0,
  totalPages = 1,
  totalCount,
  onPageChange,
  className,
}: TransactionListMobileProps) {

  if (isLoading) {
    return (
      <div className={cn(card, "overflow-hidden")}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className={cn(card)}>
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <ArrowUpDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Cap transacció</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 max-w-[200px]">
            Canvia els filtres o afegeix una nova transacció.
          </p>
        </div>
      </div>
    )
  }

  const firstItem = page * PAGE_SIZE + 1
  const lastItem = Math.min((page + 1) * PAGE_SIZE, totalCount ?? transactions.length)

  return (
    <div className={cn("space-y-3 pb-20", className)}>
      <div className={cn(card, "overflow-hidden")}>
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {firstItem}–{lastItem}{" "}
            <span className="text-slate-300 dark:text-slate-600">de</span>{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {totalCount ?? transactions.length}
            </span>
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm"
              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(0)} disabled={page === 0}>
              <ChevronLeft className="w-3 h-3 -mr-1" /><ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm"
              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1.5 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm"
              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm"
              className="h-7 w-7 p-0 border-slate-200 dark:border-slate-700"
              onClick={() => onPageChange(totalPages - 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-3 h-3 -mr-1" /><ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}