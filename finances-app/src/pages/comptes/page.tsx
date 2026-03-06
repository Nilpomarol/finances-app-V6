import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import {
  getAccounts,
  deleteAccount,
  accountHasTransactions,
  deleteAccountWithTransactions,
  deleteAccountUnlinking,
  deleteAccountTransferring,
} from "@/lib/db/queries/accounts"
import { formatEuros } from "@/lib/utils"
import type { Account } from "@/types/database"
import AccountModal from "@/components/features/comptes/AccountModal"
import DeleteAccountModal from "@/components/features/comptes/DeleteAccountModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const TIPUS_LABELS: Record<Account["tipus"], string> = {
  banc: "Banc",
  estalvi: "Estalvis",
  efectiu: "Efectiu",
  inversio: "Inversió",
}

export default function ComptesPage() {
  const { userId } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Account | undefined>()

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
      {/* Capçalera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comptes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Patrimoni total:{" "}
            <span className="font-semibold text-foreground">
              {formatEuros(patrimoniTotal)}
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAccount(undefined)
            setShowAccountModal(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nou compte
        </Button>
      </div>

      {/* Llista de comptes */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Cap compte creat</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Crea el teu primer compte per començar a registrar transaccions
            </p>
            <Button
              onClick={() => {
                setEditingAccount(undefined)
                setShowAccountModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear compte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="group relative overflow-hidden">
              {/* Franja de color */}
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: account.color }}
              />
              <CardContent className="pl-5 pr-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: account.color + "20" }}
                      >
                        <Wallet
                          className="w-4 h-4"
                          style={{ color: account.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{account.nom}</p>
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {TIPUS_LABELS[account.tipus]}
                        </Badge>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "text-xl font-bold mt-2",
                        account.saldo < 0 ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {formatEuros(account.saldo)}
                    </p>
                  </div>

                  {/* Accions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleEdit(account)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => handleDelete(account)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  )
}