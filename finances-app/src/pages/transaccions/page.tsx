import { useEffect, useCallback, useMemo, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { getTransactions, deleteTransaction } from "@/lib/db/queries/transactions"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getPeople } from "@/lib/db/queries/people"
import type { Account, Category, TransactionWithRelations, Person } from "@/types/database"
import type { Transaction } from "@/types/database"
import TransactionModal from "@/components/features/transaccions/TransactionModal"
import TransactionDetailModal from "@/components/features/transaccions/TransactionDetailModal"
import TransactionTable from "@/components/features/transaccions/TransactionTable"
import TransactionListMobile from "@/components/features/transaccions/TransactionListMobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  X,
  CalendarDays,
  Users,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { getEvents } from "@/lib/db/queries/events"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

const card =
  "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransaccionsPage() {
  const { userId } = useAuthStore()

  const [allTransactions, setAllTransactions] = useState<TransactionWithRelations[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)

  // ── Filters ──
  const [search, setSearch] = useState("")
  const [filterCompte, setFilterCompte] = useState("all")
  const [filterCategoria, setFilterCategoria] = useState("all")
  const [filterTipus, setFilterTipus] = useState("all")
  const [filterEsdeveniment, setFilterEsdeveniment] = useState("all")

  // ── Modals ──
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | undefined>()
  const [viewingTransaction, setViewingTransaction] = useState<TransactionWithRelations | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; action: () => void }>({ open: false, title: "", action: () => {} })

  const hasActiveFilters =
    search.trim() !== "" ||
    filterCompte !== "all" ||
    filterCategoria !== "all" ||
    filterTipus !== "all" ||
    filterEsdeveniment !== "all"

  const clearFilters = () => {
    setSearch("")
    setFilterCompte("all")
    setFilterCategoria("all")
    setFilterTipus("all")
    setFilterEsdeveniment("all")
  }

  useEffect(() => {
    if (!userId) return
    Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getPeople(userId),
      getEvents(userId),
    ]).then(([accs, cats, ppl, evts]) => {
      setAccounts(accs)
      setCategories(cats)
      setPeople(ppl)
      setEvents(evts)
    })
  }, [userId, showModal])

  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const data = await getTransactions({
        userId,
        compteId: filterCompte !== "all" && filterCompte !== "__pagat_per_altri__" ? filterCompte : undefined,
        categoriaId: filterCategoria !== "all" ? filterCategoria : undefined,
        tipus: filterTipus !== "all" ? (filterTipus as Transaction["tipus"]) : undefined,
        limit: 9999,
        offset: 0,
      })

      let filtered = filterCompte === "__pagat_per_altri__"
        ? data.filter((t) => !t.compte_id)
        : data

      filtered = filterEsdeveniment !== "all"
        ? filtered.filter((t) => t.esdeveniment_id === filterEsdeveniment)
        : filtered

      filtered = search.trim()
        ? filtered.filter((t) => t.concepte.toLowerCase().includes(search.toLowerCase()))
        : filtered

      setAllTransactions(filtered)
    } finally {
      setIsLoading(false)
    }
  }, [userId, filterCompte, filterCategoria, filterTipus, filterEsdeveniment, search])

  useEffect(() => { setPage(0) }, [filterCompte, filterCategoria, filterTipus, filterEsdeveniment, search])
  useEffect(() => { loadTransactions() }, [loadTransactions])
  useEffect(() => {
    window.addEventListener("finances:refresc", loadTransactions)
    return () => window.removeEventListener("finances:refresc", loadTransactions)
  }, [loadTransactions])

  const totalPages = Math.max(1, Math.ceil(allTransactions.length / PAGE_SIZE))
  const transactions = useMemo(
    () => allTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [allTransactions, page]
  )

  const handleView = (tx: TransactionWithRelations) => {
    setViewingTransaction(tx)
  }

  const handleEdit = (tx: TransactionWithRelations) => {
    setEditingTransaction(tx)
    setShowModal(true)
  }

  const handleDelete = (tx: TransactionWithRelations) => {
    if (!userId) return
    setConfirmDialog({
      open: true,
      title: `Eliminar "${tx.concepte}"?`,
      action: async () => {
        setConfirmDialog(d => ({ ...d, open: false }))
        setViewingTransaction(null)
        await deleteTransaction(tx.id, userId)
        loadTransactions()
      },
    })
  }

  const openNewModal = () => {
    setEditingTransaction(undefined)
    setShowModal(true)
  }

  // ── Search input (shared) ──
  const searchInput = (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <Input
        placeholder="Cerca per concepte..."
        className="pl-9 h-9 text-sm border-slate-200 dark:border-slate-700"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )

  // ── Dynamic dropdowns (shared by mobile grid) ──
  const dynamicDropdowns = (
    <>
      <Select value={filterTipus} onValueChange={setFilterTipus}>
        <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
          <SelectValue placeholder="Tipus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tots els tipus</SelectItem>
          <SelectItem value="ingres">
            <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />Ingressos</span>
          </SelectItem>
          <SelectItem value="despesa">
            <span className="flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5 text-rose-500" />Despeses</span>
          </SelectItem>
          <SelectItem value="transferencia">
            <span className="flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />Transferències</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterCompte} onValueChange={setFilterCompte}>
        <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
          <SelectValue placeholder="Compte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tots els comptes</SelectItem>
          <SelectItem value="__pagat_per_altri__">
            <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-violet-500" />Pagat per algú</span>
          </SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                {acc.nom}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterCategoria} onValueChange={setFilterCategoria}>
        <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Totes les categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterEsdeveniment} onValueChange={setFilterEsdeveniment}>
        <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
          <SelectValue placeholder="Esdeveniment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tots els esdeveniments</SelectItem>
          {events.map((evt) => (
            <SelectItem key={evt.id} value={evt.id}>
              <span className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                {evt.nom}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="space-y-6">

      {/* ── Desktop header ── */}
      <div className="hidden sm:block">
        <PageHeader
          title="Transaccions"
          action={
            <Button onClick={openNewModal}>
              <Plus className="w-4 h-4 mr-2" />
              Nova transacció
            </Button>
          }
        />
      </div>

      {/* ── Mobile title ── */}
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none sm:hidden">
        Transaccions
      </h1>

      {/* ── Desktop filter bar: all dropdowns in a row ── */}
      <div className={cn(card, "p-3 hidden sm:block")}>
        <div className="flex flex-row gap-2">
          {searchInput}

          {/* Desktop: Tipus as a dropdown */}
          <Select value={filterTipus} onValueChange={setFilterTipus}>
            <SelectTrigger className="w-36 h-9 text-sm border-slate-200 dark:border-slate-700 shrink-0">
              <SelectValue placeholder="Tipus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els tipus</SelectItem>
              <SelectItem value="ingres">
                <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />Ingressos</span>
              </SelectItem>
              <SelectItem value="despesa">
                <span className="flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5 text-rose-500" />Despeses</span>
              </SelectItem>
              <SelectItem value="transferencia">
                <span className="flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />Transferències</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="w-40 shrink-0">{/* Compte */}
            <Select value={filterCompte} onValueChange={setFilterCompte}>
              <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els comptes</SelectItem>
                <SelectItem value="__pagat_per_altri__">
                  <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-violet-500" />Pagat per algú</span>
                </SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                      {acc.nom}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40 shrink-0">{/* Categoria */}
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Totes les categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40 shrink-0">{/* Esdeveniment */}
            <Select value={filterEsdeveniment} onValueChange={setFilterEsdeveniment}>
              <SelectTrigger className="w-full h-9 text-sm border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Esdeveniment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els esdeveniments</SelectItem>
                {events.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id}>
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                      {evt.nom}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm"
              className="h-9 px-3 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
              onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1.5" />
              Netejar
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile filter area: always visible ── */}
      <div className={cn(card, "p-3 sm:hidden space-y-2")}>
        {/* Search */}
        {searchInput}

        {/* All 4 dropdowns in a 2×2 grid */}
        <div className="grid grid-cols-2 gap-2">
          {dynamicDropdowns}
        </div>

        {/* Clear button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-[12px] font-semibold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X className="w-3 h-3" />
            Netejar filtres
          </button>
        )}
      </div>

      {/* ── Mobile list ── */}
      <div className="sm:hidden">
        <TransactionListMobile
          transactions={transactions}
          isLoading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          page={page}
          totalPages={totalPages}
          totalCount={allTransactions.length}
          onPageChange={setPage}
        />
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden sm:block">
        <TransactionTable
          transactions={transactions}
          isLoading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          page={page}
          totalPages={totalPages}
          totalCount={allTransactions.length}
          onPageChange={setPage}
          showAccount={true}
          showCategory={true}
        />
      </div>

      {/* ── Detail modal ── */}
      <TransactionDetailModal
        isOpen={!!viewingTransaction && !showModal}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={handleEdit}
        onDelete={handleDelete}
        people={people}
      />

      {/* ── Edit/Create modal ── */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); setViewingTransaction(null); loadTransactions() }}
        transactionToEdit={editingTransaction}
        accounts={accounts}
        categories={categories}
        people={people}
        events={events}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        confirmText="Eliminar"
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />

    </div>
  )
}