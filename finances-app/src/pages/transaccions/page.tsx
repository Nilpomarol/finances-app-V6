import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authstore"
import { getTransactions, deleteTransaction } from "@/lib/db/queries/transactions"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getPeople } from "@/lib/db/queries/people"
import type { Account, Category, TransactionWithRelations, Person } from "@/types/database"
import type { Transaction } from "@/types/database"
import TransactionModal from "@/components/features/transaccions/TransactionModal"
import TransactionTable from "@/components/features/transaccions/TransactionTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus } from "lucide-react"
import { getEvents } from "@/lib/db/queries/events"

const PAGE_SIZE = 25

export default function TransaccionsPage() {
  const { userId } = useAuthStore()

  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filtres
  const [search, setSearch] = useState("")
  const [filterCompte, setFilterCompte] = useState("all")
  const [filterCategoria, setFilterCategoria] = useState("all")
  const [filterTipus, setFilterTipus] = useState("all")

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionWithRelations | undefined
  >()

  useEffect(() => {
    if (!userId) return
    Promise.all([getAccounts(userId), getCategories(userId), getPeople(userId), getEvents(userId)]).then(
      ([accs, cats, ppl, events]) => {
        setAccounts(accs)
        setCategories(cats)
        setPeople(ppl)
        setEvents(events)
      }
    )
  }, [userId, showModal]) // <--- AFEGEIX showModal AQUÍ

  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await getTransactions({
        userId,
        compteId: filterCompte !== "all" ? filterCompte : undefined,
        categoriaId: filterCategoria !== "all" ? filterCategoria : undefined,
        tipus:
          filterTipus !== "all"
            ? (filterTipus as Transaction["tipus"])
            : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })

      const filtered = search.trim()
        ? data.filter((t) =>
            t.concepte.toLowerCase().includes(search.toLowerCase())
          )
        : data

      setTransactions(filtered)
      setTotalPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
    } finally {
      setIsLoading(false)
    }
  }, [userId, filterCompte, filterCategoria, filterTipus, page, search])

  useEffect(() => {
    setPage(0)
  }, [filterCompte, filterCategoria, filterTipus, search])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleEdit = (tx: TransactionWithRelations) => {
    setEditingTransaction(tx)
    setShowModal(true)
  }

  const handleDelete = async (tx: TransactionWithRelations) => {
    if (!userId) return
    if (!confirm(`Eliminar "${tx.concepte}"?`)) return
    await deleteTransaction(tx.id, userId)
    loadTransactions()
  }

  return (
    <div className="space-y-4">
      {/* Capçalera */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaccions</h1>
        <Button
          onClick={() => {
            setEditingTransaction(undefined)
            setShowModal(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova transacció
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per concepte..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filterTipus} onValueChange={setFilterTipus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Tipus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els tipus</SelectItem>
                <SelectItem value="ingres">Ingressos</SelectItem>
                <SelectItem value="despesa">Despeses</SelectItem>
                <SelectItem value="transferencia">Transferències</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCompte} onValueChange={setFilterCompte}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els comptes</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: acc.color }}
                      />
                      {acc.nom}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Totes les categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Taula reutilitzable */}
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        showAccount={true}
        showCategory={true}
      />

      {/* Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          loadTransactions()
        }}
        transactionToEdit={editingTransaction}
        accounts={accounts}
        categories={categories}
        people={people}
        events={events}
      />
    </div>
  )
}