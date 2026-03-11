import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getPeople, deletePerson } from "@/lib/db/queries/people"
import { getAccounts } from "@/lib/db/queries/accounts"
import type { Account, Person } from "@/types/database"

import PersonModal from "@/components/features/persones/PersonModal"
import SettleUpModal from "@/components/features/persones/SettleUpModal"
import PersonHistoryModal from "@/components/features/persones/PersonHistoryModal"
import { Button } from "@/components/ui/button"
import { Plus, Users, MoreHorizontal, Pencil, Trash2, CheckCircle2, Pin, PinOff, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { cn, formatEuros } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"

const PINNED_KEY = "persones_pinned"

function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]") } catch { return [] }
}
function savePinned(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids))
}

const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden"

export default function PersonesPage() {
  const { userId } = useAuthStore()
  const [people, setPeople] = useState<(Person & { balance: number })[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>(getPinned)

  const [showModal, setShowModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | undefined>()
  const [settlePerson, setSettlePerson] = useState<(Person & { balance: number }) | null>(null)
  const [historyPerson, setHistoryPerson] = useState<(Person & { balance: number }) | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; action: () => void }>({ open: false, title: "", action: () => {} })

  const loadData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [ppl, accs] = await Promise.all([getPeople(userId), getAccounts(userId)])
      setPeople(ppl)
      setAccounts(accs)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    if (openMenuId) document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [openMenuId])

  const handleDelete = (person: Person) => {
    if (!userId) return
    setOpenMenuId(null)
    setConfirmDialog({
      open: true,
      title: `Eliminar a ${person.nom}?`,
      action: async () => {
        setConfirmDialog(d => ({ ...d, open: false }))
        await deletePerson(person.id, userId)
        loadData()
      },
    })
  }

  const togglePin = (id: string) => {
    const next = pinnedIds.includes(id)
      ? pinnedIds.filter(p => p !== id)
      : [...pinnedIds, id]
    setPinnedIds(next)
    savePinned(next)
    setOpenMenuId(null)
  }

  const visible = people.filter(p => !p.amagat)
  const totalOwed = visible.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0)
  const totalOwing = visible.reduce((sum, p) => p.balance < 0 ? sum + Math.abs(p.balance) : sum, 0)
  const netBalance = totalOwed - totalOwing

  const sorted = [...visible].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id) ? 1 : 0
    const bPinned = pinnedIds.includes(b.id) ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return b.balance - a.balance
  })

  return (
    <div className="space-y-6 pb-8">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Finances personals
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Persones i Deutes
          </h1>
        </div>
        <Button
          onClick={() => { setEditingPerson(undefined); setShowModal(true) }}
          className="h-10 px-5 text-sm font-semibold shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova persona
        </Button>
      </div>

      {/* ── SUMMARY CARD ───────────────────────────────────────────────────── */}
      {!isLoading && visible.length > 0 && (totalOwed > 0 || totalOwing > 0) && (
        <div className={cn(card, "p-4 sm:p-5")}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Balanç Net
              </p>
              <p className={cn(
                "text-2xl font-bold tracking-tight tabular-nums leading-none",
                netBalance > 0 ? "text-emerald-600" : netBalance < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"
              )}>
                {netBalance > 0 ? "+" : ""}{formatEuros(netBalance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {visible.length} {visible.length === 1 ? "contacte" : "contactes"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">
                  Et deuen
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-600 tabular-nums leading-none">
                {formatEuros(totalOwed)}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-800/40 flex items-center justify-center">
                  <ArrowUpRight className="w-3 h-3 text-rose-500" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80">
                  Deus tu
                </p>
              </div>
              <p className="text-lg font-bold text-rose-500 tabular-nums leading-none">
                {formatEuros(totalOwing)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PERSON GRID ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Cap persona afegida"
          description="Afegeix contactes per fer seguiment de deutes"
          action={
            <Button onClick={() => { setEditingPerson(undefined); setShowModal(true) }}>
              <Plus className="w-4 h-4 mr-1.5" /> Afegir persona
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(person => {
            const initials = person.nom.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
            const isMenuOpen = openMenuId === person.id
            const isPinned = pinnedIds.includes(person.id)
            const balanceColor =
              person.balance > 0 ? "#10b981" :
              person.balance < 0 ? "#f43f5e" : "#94a3b8"

            return (
              <div
                key={person.id}
                className={cn(
                  card,
                  "group relative flex flex-col gap-6 p-6",
                  "hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                )}
                onClick={() => setHistoryPerson(person)}
              >
                {/* Top color strip */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: balanceColor }} />

                {/* Header: avatar + name + pin + menu */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      style={{ backgroundColor: balanceColor + "18", color: balanceColor }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">
                        {person.nom}
                      </p>
                      {isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                          <Pin className="w-2.5 h-2.5" /> Ancorat
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions dropdown */}
                  <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : person.id) }}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        isMenuOpen
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-9 z-50 w-40 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                        <button
                          onClick={() => togglePin(person.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          {isPinned
                            ? <PinOff className="w-3.5 h-3.5 text-slate-400" />
                            : <Pin className="w-3.5 h-3.5 text-slate-400" />
                          }
                          {isPinned ? "Desancorar" : "Ancorar"}
                        </button>
                        <button
                          onClick={() => { setEditingPerson(person); setShowModal(true); setOpenMenuId(null) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(person)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {person.balance > 0 ? "Et deu a tu" : person.balance < 0 ? "Li deus tu" : "Situació actual"}
                  </p>
                  <p className={cn(
                    "text-[2rem] font-bold tabular-nums leading-none",
                    person.balance > 0 ? "text-emerald-500" : person.balance < 0 ? "text-rose-500" : "text-slate-400"
                  )}>
                    {person.balance === 0 ? "—" : formatEuros(Math.abs(person.balance))}
                  </p>
                </div>

                {/* Settle up button */}
                {person.balance !== 0 && (
                  <div className="mt-auto">
                    {person.balance > 0 ? (
                      <button
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-semibold transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSettlePerson(person) }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        M'ha pagat
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Pendent de pagar
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      <PersonModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadData}
        person={editingPerson}
      />

      {settlePerson && (
        <SettleUpModal
          isOpen={!!settlePerson}
          onClose={() => setSettlePerson(null)}
          onSuccess={loadData}
          person={settlePerson}
          accounts={accounts}
        />
      )}

      <PersonHistoryModal
        isOpen={!!historyPerson}
        onClose={() => setHistoryPerson(null)}
        person={historyPerson}
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
