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
import { Plus, Wallet, PiggyBank, Banknote, BarChart3, RefreshCw } from "lucide-react"
import { ItemActions } from "@/components/shared/ItemActions"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { useToast } from "@/hooks/use-toast"

const TIPUS_LABELS: Record<Account["tipus"], string> = {
  banc: "Compte Bancari",
  estalvi: "Estalvis",
  efectiu: "Efectiu",
  inversio: "Inversió",
}

const TIPUS_ICONS: Record<Account["tipus"], React.ReactNode> = {
  banc: <Banknote className="w-4 h-4" />,
  estalvi: <PiggyBank className="w-4 h-4" />,
  efectiu: <Wallet className="w-4 h-4" />,
  inversio: <BarChart3 className="w-4 h-4" />,
}

// Card style matching the dashboard pattern
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptes"
        subtitle={
          <>
            Patrimoni total:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatEuros(patrimoniTotal)}
            </span>
          </>
        }
        action={
          <div className="flex items-center gap-2">
            {/* Mobile: icon only */}
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
            {/* Desktop: full label */}
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="hidden sm:flex"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRecalculating && "animate-spin")} />
              Recalcular saldos
            </Button>

            <Button
              onClick={() => {
                setEditingAccount(undefined)
                setShowAccountModal(true)
              }}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nou compte</span>
            </Button>
          </div>
        }
      />

      {/* Accounts list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 h-28"
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
                onClick={() => setTxEntity({ type: "account", id: account.id, name: account.nom, color: account.color })}
                className={cn(
                  card,
                  "group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                )}
              >
                {/* Top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: account.color }}
                />

                <div className="px-5 pt-5 pb-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: account.color + "18" }}
                      >
                        <span style={{ color: account.color }}>
                          {TIPUS_ICONS[account.tipus]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate leading-tight text-slate-900 dark:text-white">
                          {account.nom}
                        </p>
                        <span
                          className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-0.5"
                          style={{
                            backgroundColor: account.color + "18",
                            color: account.color,
                          }}
                        >
                          {TIPUS_LABELS[account.tipus]}
                        </span>
                      </div>
                    </div>

                    <ItemActions
                      onEdit={() => handleEdit(account)}
                      onDelete={() => handleDelete(account)}
                    />
                  </div>

                  {/* Balance */}
                  <p
                    className={cn(
                      "text-2xl font-bold tracking-tight tabular-nums",
                      account.saldo < 0
                        ? "text-rose-500"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {formatEuros(account.saldo)}
                  </p>

                  {/* Progress bar */}
                  {patrimoniTotal > 0 && account.saldo > 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: account.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                        {percentage.toFixed(0)}% del patrimoni
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
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