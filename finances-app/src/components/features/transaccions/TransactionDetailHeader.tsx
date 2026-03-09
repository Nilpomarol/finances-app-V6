import { cn } from "@/lib/utils"
import { formatEuros } from "@/lib/utils"
import { RefreshCw, Users, X } from "lucide-react"
import CategoryIcon from "@/components/shared/CategoryIcon"
import { TIPUS_CONFIG } from "./shared/tipusConfig"
import type { TransactionWithRelations } from "@/types/database"

interface TransactionDetailHeaderProps {
  tx: TransactionWithRelations
  onClose: () => void
}

export function TransactionDetailHeader({ tx, onClose }: TransactionDetailHeaderProps) {
  const { icon: Icon, headerBg, headerBgDark, iconBg, amountColor, sign, label, badge } =
    TIPUS_CONFIG[tx.tipus]

  const isTransfer = tx.tipus === "transferencia"
  const hasShared = tx.tipus === "despesa" && (tx.total_deutes ?? 0) > 0
  const amountPaid = hasShared ? tx.import_trs - (tx.total_deutes ?? 0) : null

  return (
    <div className={cn("px-6 pt-8 pb-6 relative overflow-hidden", headerBg, headerBgDark)}>
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        aria-label="Tancar"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {tx.categoria_id && tx.categoria_icona && !isTransfer ? (
            <CategoryIcon icona={tx.categoria_icona} color="white" size="md" />
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Amount + concept */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn("text-3xl font-black tabular-nums tracking-tight leading-none", amountColor)}>
              {hasShared
                ? `-${formatEuros(amountPaid!)}`
                : isTransfer
                ? formatEuros(tx.import_trs)
                : `${sign}${formatEuros(tx.import_trs)}`}
            </span>
            {hasShared && (
              <span className="text-sm tabular-nums text-white/50 line-through">
                {formatEuros(tx.import_trs)}
              </span>
            )}
          </div>
          <p className="text-base font-bold text-white mt-1.5 truncate">{tx.concepte}</p>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", badge)}>
              {label}
            </span>
            {!!tx.recurrent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
                <RefreshCw className="w-2.5 h-2.5" />
                Recurrent
              </span>
            )}
            {hasShared && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
                <Users className="w-2.5 h-2.5" />
                Compartida
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}