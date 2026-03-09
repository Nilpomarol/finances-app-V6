import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { getTransactionSplits } from "@/lib/db/queries/transactions"
import { TransactionDetailHeader } from "./TransactionDetailHeader"
import { TransactionDetailRows } from "./TransactionDetailRows"
import { TransactionSplitList } from "./TransactionSplitList"
import type { TransactionWithRelations, TransactionSplit, Person } from "@/types/database"

interface TransactionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionWithRelations | null
  onEdit: (tx: TransactionWithRelations) => void
  onDelete: (tx: TransactionWithRelations) => void
  people?: Person[]
}

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transaction: tx,
  onEdit,
  onDelete,
  people = [],
}: TransactionDetailModalProps) {
  const [splits, setSplits] = useState<TransactionSplit[]>([])

  useEffect(() => {
    if (!tx || !isOpen) { setSplits([]); return }
    if (tx.tipus === "despesa" && (tx.total_deutes ?? 0) > 0) {
      getTransactionSplits(tx.id).then(setSplits)
    } else {
      setSplits([])
    }
  }, [tx, isOpen])

  if (!tx) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[390px] p-0 overflow-hidden gap-0 rounded-2xl border-0 shadow-2xl [&>button:last-of-type]:hidden">

        <TransactionDetailHeader tx={tx} onClose={onClose} />
        <TransactionDetailRows tx={tx} />
        <TransactionSplitList splits={splits} people={people} />

        {/* Footer actions */}
        <div className="grid grid-cols-2 gap-2 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:border-rose-900 dark:hover:bg-rose-900/20 font-medium rounded-xl transition-all"
            onClick={() => { onClose(); onDelete(tx) }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Eliminar
          </Button>
          <Button
            size="sm"
            className="h-10 font-medium rounded-xl transition-all"
            onClick={() => onEdit(tx)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}