import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, BarChart2 } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useFilterStore } from "@/store/filterStore"
import { getTransactions, deleteTransaction } from "@/lib/db/queries/transactions"
import TransactionListMobile from "@/components/features/transaccions/TransactionListMobile"
import DynamicIcon from "@/components/shared/DynamicIcon"
import type { TransactionWithRelations } from "@/types/database"

const TransactionDetailModal = lazy(
  () => import("@/components/features/transaccions/TransactionDetailModal")
)

const PAGE_SIZE = 25

export interface EntityTransactionsEntity {
  type: "category" | "account"
  id: string
  name: string
  color?: string
  iconName?: string
}

interface EntityTransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  entity: EntityTransactionsEntity | null
}

export default function EntityTransactionsModal({
  isOpen,
  onClose,
  entity,
}: EntityTransactionsModalProps) {
  const { userId } = useAuthStore()
  const { setCategoriaIds, setCompteIds } = useFilterStore()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [viewingTx, setViewingTx] = useState<TransactionWithRelations | null>(null)

  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  const loadTransactions = useCallback(async () => {
    if (!userId || !entity) return
    setIsLoading(true)
    try {
      const opts =
        entity.type === "category"
          ? { userId, categoriaId: entity.id, limit: 1000 }
          : { userId, compteId: entity.id, limit: 1000 }
      setTransactions(await getTransactions(opts))
    } finally {
      setIsLoading(false)
    }
  }, [userId, entity])

  useEffect(() => {
    if (!isOpen || !entity || !userId) {
      setTransactions([])
      setPage(0)
      setViewingTx(null)
      return
    }
    setPage(0)
    loadTransactions()
  }, [isOpen, entity, userId, loadTransactions])

  const handleDelete = async (tx: TransactionWithRelations) => {
    if (!userId) return
    setViewingTx(null)
    await deleteTransaction(tx.id, userId)
    await loadTransactions()
  }

  if (!entity) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 shadow-2xl max-h-[85dvh] flex flex-col [&>button:last-of-type]:hidden">

          {/* Colored header banner */}
          <div
            className="shrink-0 px-5 pt-5 pb-4"
            style={{ backgroundColor: entity.color ? entity.color + "30" : undefined }}
          >
            <div className="flex items-center gap-3">
              {/* Entity icon / color dot */}
              {entity.iconName && entity.color ? (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: entity.color + "55" }}
                >
                  <DynamicIcon
                    name={entity.iconName}
                    className="w-5 h-5"
                    style={{ color: entity.color }}
                  />
                </div>
              ) : entity.color ? (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: entity.color + "55" }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: entity.color }}
                  />
                </div>
              ) : null}

              {/* Title + count */}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-slate-900 dark:text-white truncate leading-tight">
                  {entity.name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: entity.color ?? undefined }}>
                  {isLoading ? "Carregant..." : `${transactions.length} transaccions`}
                </p>
              </div>

              {/* Analysis link */}
              <button
                onClick={() => {
                  onClose()
                  if (entity.type === "category") setCategoriaIds([entity.id])
                  else setCompteIds([entity.id])
                  navigate("/analisi")
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70 shrink-0"
                style={{ backgroundColor: entity.color ? entity.color + "30" : "#f1f5f9", color: entity.color ?? "#94a3b8" }}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Anàlisi
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 shrink-0"
                style={{ backgroundColor: entity.color ? entity.color + "30" : "#f1f5f9" }}
              >
                <X className="w-4 h-4" style={{ color: entity.color ?? "#94a3b8" }} />
              </button>
            </div>
          </div>

          {/* Tinted divider */}
          <div
            className="h-px shrink-0"
            style={{ backgroundColor: entity.color ? entity.color + "55" : "#f1f5f9" }}
          />

          {/* Body — scrollable transaction list, no extra bottom padding */}
          <div className="overflow-y-auto flex-1 min-h-0 p-3 pb-3">
            <TransactionListMobile
              transactions={paginated}
              isLoading={isLoading}
              onView={setViewingTx}
              page={page}
              totalPages={totalPages}
              totalCount={transactions.length}
              onPageChange={setPage}
              className="pb-0"
            />
          </div>

        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        <TransactionDetailModal
          isOpen={!!viewingTx}
          onClose={() => setViewingTx(null)}
          transaction={viewingTx}
          onEdit={() => setViewingTx(null)}
          onDelete={handleDelete}
        />
      </Suspense>
    </>
  )
}