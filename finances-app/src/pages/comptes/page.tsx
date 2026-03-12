import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import {
  getAccounts,
  deleteAccount,
  accountHasTransactions,
  deleteAccountWithTransactions,
  deleteAccountUnlinking,
  deleteAccountTransferring,
  recalculateAllBalances,
} from "@/lib/db/queries/accounts"
import { formatEuros } from "@/lib/utils"
import type { Account } from "@/types/database"
import AccountModal from "@/components/features/comptes/AccountModal"
import DeleteAccountModal from "@/components/features/comptes/DeleteAccountModal"
import EntityTransactionsModal from "@/components/shared/EntityTransactionsModal"
import type { EntityTransactionsEntity } from "@/components/shared/EntityTransactionsModal"
import { Button } from "@/components/ui/button"
import { Plus, Wallet, PiggyBank, Banknote, BarChart3, RefreshCw, Landmark } from "lucide-react"
import { ItemActions } from "@/components/shared/ItemActions"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/shared/EmptyState"
import { useToast } from "@/hooks/use-toast"

const TIPUS_LABELS: Record<Account["tipus"], string> = {
  banc: "Compte Bancari",
  estalvi: "Estalvis",
  efectiu: "Efectiu",
  inversio: "Inversió",
}

const TIPUS_ICONS: Record<Account["tipus"], React.ReactNode> = {
  banc: <Banknote className="w-5 h-5" />,
  estalvi: <PiggyBank className="w-5 h-5" />,
  efectiu: <Wallet className="w-5 h-5" />,
  inversio: <BarChart3 className="w-5 h-5" />,
}

const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden"

export default function ComptesPage() {
  const { userId } = useAuthStore()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState(false)

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Account | undefined>()
  const [txEntity, setTxEntity] = useState<EntityTransactionsEntity | null>(null)

  const loadAccounts = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await getAccounts(userId)
      setAccounts(data)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    window.addEventListener("finances:refresc", loadAccounts)
    return () => window.removeEventListener("finances:refresc", loadAccounts)
  }, [loadAccounts])

  const handleRecalculate = async () => {
    if (!userId) return
    setIsRecalculating(true)
    try {
      await recalculateAllBalances(userId)
      await loadAccounts()
      toast({ title: "Saldos recalculats correctament" })
    } catch {
      toast({ variant: "destructive", title: "Error en recalcular els saldos" })
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setShowAccountModal(true)
  }

  const handleDelete = async (account: Account) => {
    if (!userId) return
    const hasTransactions = await accountHasTransactions(account.id, userId)
    if (hasTransactions) {
      setDeletingAccount(account)
      setShowDeleteModal(true)
    } else {
      await deleteAccount(account.id, userId)
      loadAccounts()
    }
  }

  const handleDeleteConfirm = async (
    option: "cancel" | "delete-all" | "unlink" | "transfer",
    targetAccountId?: string
  ) => {
    if (!userId || !deletingAccount) return
    switch (option) {
      case "delete-all":
        await deleteAccountWithTransactions(deletingAccount.id, userId)
        break
      case "unlink":
        await deleteAccountUnlinking(deletingAccount.id, userId)
        break
      case "transfer":
        if (targetAccountId) {
          await deleteAccountTransferring(deletingAccount.id, targetAccountId, userId)
        }
        break
    }
    loadAccounts()
  }

  const patrimoniTotal = accounts.reduce((sum, a) => sum + a.saldo, 0)
  const positiveAccounts = accounts.filter((a) => a.saldo > 0)

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Finances personals
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Comptes
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="sm:hidden shrink-0"
            aria-label="Recalcular saldos"
          >
            <RefreshCw className={cn("w-4 h-4", isRecalculating && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="hidden sm:flex h-10 px-5 text-sm font-semibold"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRecalculating && "animate-spin")} />
            Recalcular saldos
          </Button>
          <Button
            onClick={() => {
              setEditingAccount(undefined)
              setShowAccountModal(true)
            }}
            className="h-10 px-5 text-sm font-semibold shrink-0"
          >
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nou compte</span>
          </Button>
        </div>
      </div>

      {/* ── PATRIMONI SUMMARY CARD ──────────────────────────────────────────── */}
      {!isLoading && accounts.length > 0 && (
        <div className={cn(card, "p-6 sm:p-8")}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Patrimoni Total
              </p>
              <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
                {formatEuros(patrimoniTotal)}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {accounts.length} {accounts.length === 1 ? "compte actiu" : "comptes actius"}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
          </div>

          {patrimoniTotal > 0 && positiveAccounts.length > 0 && (
            <div className="space-y-3">
              {/* Stacked distribution bar */}
              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                {positiveAccounts.map((a) => (
                  <div
                    key={a.id}
                    className="transition-all"
                    style={{
                      width: `${(a.saldo / patrimoniTotal) * 100}%`,
                      backgroundColor: a.color,
                    }}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {accounts.map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="font-medium">{a.nom}</span>
                    <span className="tabular-nums text-slate-400">{formatEuros(a.saldo)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACCOUNTS GRID ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 h-44"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-12 h-12" />}
          title="Cap compte creat"
          description="Crea el teu primer compte per començar a registrar transaccions"
          action={
            <Button
              onClick={() => {
                setEditingAccount(undefined)
                setShowAccountModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Crear compte
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const percentage =
              patrimoniTotal !== 0
                ? Math.max(0, Math.min(100, (account.saldo / patrimoniTotal) * 100))
                : 0

            return (
              <div
                key={account.id}
                onClick={() =>
                  setTxEntity({
                    type: "account",
                    id: account.id,
                    name: account.nom,
                    color: account.color,
                  })
                }
                className={cn(
                  card,
                  "group relative flex flex-col gap-6 p-6",
                  "hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                )}
              >
                {/* Top color strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: account.color }}
                />

                {/* Header: icon + info + actions */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: account.color + "15", color: account.color }}
                    >
                      {TIPUS_ICONS[account.tipus]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {TIPUS_LABELS[account.tipus]}
                      </p>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">
                        {account.nom}
                      </p>
                    </div>
                  </div>
                  <ItemActions
                    onEdit={() => handleEdit(account)}
                    onDelete={() => handleDelete(account)}
                  />
                </div>

                {/* Balance */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Saldo actual
                  </p>
                  <p
                    className={cn(
                      "text-[2rem] font-bold tracking-tight tabular-nums leading-none",
                      account.saldo < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"
                    )}
                  >
                    {formatEuros(account.saldo)}
                  </p>
                </div>

                {/* Progress bar */}
                {patrimoniTotal > 0 && account.saldo > 0 && (
                  <div className="mt-auto space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Del patrimoni
                      </span>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: account.color }}
                      >
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: account.color }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={loadAccounts}
        account={editingAccount}
      />

      {deletingAccount && (
        <DeleteAccountModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          account={deletingAccount}
          otherAccounts={accounts.filter((a) => a.id !== deletingAccount.id)}
        />
      )}

      <EntityTransactionsModal
        isOpen={!!txEntity}
        onClose={() => setTxEntity(null)}
        entity={txEntity}
      />
    </div>
  )
}
