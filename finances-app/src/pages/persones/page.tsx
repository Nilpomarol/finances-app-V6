import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getPeople, deletePerson } from "@/lib/db/queries/people"
import { getAccounts } from "@/lib/db/queries/accounts"
import type { Account, Person } from "@/types/database"

import PersonModal from "@/components/features/persones/PersonModal"
import SettleUpModal from "@/components/features/persones/SettleUpModal"
import PersonHistoryModal from "@/components/features/persones/PersonHistoryModal"
import { Button } from "@/components/ui/button"
import { Plus, Users, MoreHorizontal, Pencil, Trash2, CheckCircle2, Pin, PinOff } from "lucide-react"
import { cn, formatEuros } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

const PINNED_KEY = "persones_pinned"

function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]") } catch { return [] }
}
function savePinned(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids))
}

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

  // Sort: pinned first, then by balance descending (who owes most)
  const sorted = [...visible].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id) ? 1 : 0
    const bPinned = pinnedIds.includes(b.id) ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return b.balance - a.balance
  })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Persones i Deutes"
        subtitle={`${visible.length} contactes`}
        action={
          <Button onClick={() => { setEditingPerson(undefined); setShowModal(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Nova persona
          </Button>
        }
      />

      {/* Summary KPI row */}
      {!isLoading && visible.length > 0 && (totalOwed > 0 || totalOwing > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Et deuen</p>
            <p className="text-xl font-bold text-emerald-600 tabular-nums">{formatEuros(totalOwed)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Deus</p>
            <p className="text-xl font-bold text-rose-500 tabular-nums">{formatEuros(totalOwing)}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Cap persona afegida</p>
          <p className="text-xs text-slate-400 mt-1 mb-5">Afegeix contactes per fer seguiment de deutes</p>
          <Button
            onClick={() => { setEditingPerson(undefined); setShowModal(true) }}
            className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Afegir persona
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(person => {
            const initials = person.nom.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
            const isMenuOpen = openMenuId === person.id
            const isPinned = pinnedIds.includes(person.id)
            const balanceColor =
              person.balance > 0 ? "#22c55e" :
              person.balance < 0 ? "#ef4444" : "#94a3b8"

            return (
              <div
                key={person.id}
                className={cn(
                  "group relative rounded-2xl border bg-white dark:bg-slate-900 cursor-pointer overflow-hidden",
                  "border-slate-200 dark:border-slate-700/50",
                  "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.04)]",
                  "dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),0_6px_24px_rgba(0,0,0,0.2)]",
                  "transition-all hover:shadow-[0_2px_8px_rgba(15,23,42,0.08),0_8px_28px_rgba(15,23,42,0.07)]",
                  "dark:hover:border-slate-600/70"
                )}
                onClick={() => setHistoryPerson(person)}
              >
                {/* Colored top stripe */}
                <div className="h-1.5 w-full" style={{ backgroundColor: balanceColor }} />

                <div className="p-4">
                  {/* Top row: avatar + name + menu */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs"
                      style={{ backgroundColor: balanceColor + "18", color: balanceColor }}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">
                        {person.nom}
                      </p>
                      {isPinned && (
                        <Pin className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    {/* Actions dropdown */}
                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : person.id) }}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                          isMenuOpen
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-50 w-40 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
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

                  {/* Balance — prominent center feature */}
                  <div className="mb-3">
                    <p
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color: balanceColor }}
                    >
                      {person.balance === 0 ? "—" : formatEuros(Math.abs(person.balance))}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {person.balance > 0
                        ? "Et deu a tu"
                        : person.balance < 0
                        ? "Li deus tu"
                        : "Al corrent"}
                    </p>
                  </div>

                  {/* Settle up button */}
                  {person.balance > 0 && (
                    <button
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-semibold transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSettlePerson(person) }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      M'ha pagat
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

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