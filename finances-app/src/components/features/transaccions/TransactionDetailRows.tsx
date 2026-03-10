import { CalendarDays, MoveRight, StickyNote, Tag, Users, Wallet } from "lucide-react"
import { formatDate } from "@/lib/utils"
import CategoryIcon from "@/components/shared/CategoryIcon"
import { DetailRow } from "./shared/DetailRow"
import type { TransactionWithRelations } from "@/types/database"

interface TransactionDetailRowsProps {
  tx: TransactionWithRelations
}

export function TransactionDetailRows({ tx }: TransactionDetailRowsProps) {
  const isTransfer = tx.tipus === "transferencia"

  return (
    <div className="px-6 py-2 bg-white dark:bg-slate-900">
      <DetailRow icon={CalendarDays} label="Data">
        {formatDate(tx.data)}
      </DetailRow>

      {isTransfer ? (
        <DetailRow icon={Wallet} label="Comptes">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="flex items-center gap-1.5">
              {tx.compte_color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.compte_color }} />
              )}
              <span className="text-slate-800 dark:text-slate-200">{tx.compte_nom ?? "—"}</span>
            </span>
            <MoveRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="flex items-center gap-1.5">
              {tx.compte_color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.compte_color }} />
              )}
              <span className="text-slate-800 dark:text-slate-200">{tx.compte_desti_nom ?? "—"}</span>
            </span>
          </div>
        </DetailRow>
      ) : (
        <DetailRow icon={Wallet} label="Compte">
          {tx.compte_nom ? (
            <span className="flex items-center gap-1.5 justify-end">
              {tx.compte_color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tx.compte_color }} />
              )}
              {tx.compte_nom}
            </span>
          ) : tx.pagat_per_nom ? (
            <span className="flex items-center gap-1.5 justify-end">
              <Users className="w-3.5 h-3.5 text-violet-400 dark:text-violet-500 shrink-0" />
              <span className="italic">{tx.pagat_per_nom}</span>
            </span>
          ) : (
            <span>—</span>
          )}
        </DetailRow>
      )}

      {!isTransfer && tx.categoria_nom && (
        <DetailRow icon={Tag} label="Categoria">
          <span className="flex items-center gap-1.5 justify-end">
            {tx.categoria_icona && (
              <CategoryIcon
                icona={tx.categoria_icona}
                color={tx.categoria_color ?? "#6366f1"}
                size="sm"
              />
            )}
            {tx.categoria_nom}
          </span>
        </DetailRow>
      )}

      {tx.esdeveniment_nom && (
        <DetailRow icon={CalendarDays} label="Esdeveniment">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
            {tx.esdeveniment_nom}
          </span>
        </DetailRow>
      )}

      {tx.event_tag_nom && (
        <DetailRow icon={Tag} label="Etiqueta">
          <span className="inline-flex items-center gap-1.5">
            {tx.event_tag_color && (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tx.event_tag_color }} />
            )}
            {tx.event_tag_nom}
          </span>
        </DetailRow>
      )}

      {tx.persona_nom && (
        <DetailRow icon={Users} label="Liquidació">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tx.persona_nom}</span>
        </DetailRow>
      )}

      {tx.notes && (
        <div className="py-3 border-b border-slate-100 dark:border-slate-800/80">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5" />
            Notes
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {tx.notes}
          </p>
        </div>
      )}
    </div>
  )
}