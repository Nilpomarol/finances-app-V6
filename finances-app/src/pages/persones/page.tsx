import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getPeople, deletePerson } from "@/lib/db/queries/people"
import { getAccounts } from "@/lib/db/queries/accounts"
import type { Account, Person } from "@/types/database"

import PersonModal from "@/components/features/persones/PersonModal"
import SettleUpModal from "@/components/features/persones/SettleUpModal"
import PersonHistoryModal from "@/components/features/persones/PersonHistoryModal"
import { Button } from "@/components/ui/button"
import { Plus, Users, Pencil, Trash2, CheckCircle2, ArrowDownLeft, ArrowUpRight, History } from "lucide-react"
import { cn, formatEuros } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"

const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden"

export default function PersonesPage() {
  const { userId } = useAuthStore()
  const [people, setPeople] = useState<(Person & { balance: number })[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const handleDelete = (person: Person) => {
    if (!userId) return
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

  const visible = people.filter(p => !p.amagat)
  const totalOwed = visible.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0)
  const totalOwing = visible.reduce((sum, p) => p.balance < 0 ? sum + Math.abs(p.balance) : sum, 0)
  const netBalance = totalOwed - totalOwing

  const sorted = [...visible].sort((a, b) => {
    if (a.balance === 0 && b.balance !== 0) return 1
    if (a.balance !== 0 && b.balance === 0) return -1
    return Math.abs(b.balance) - Math.abs(a.balance)
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
        <div className={cn(card, "p-3 sm:p-4")}>
          <div className="flex items-center gap-4">
            {/* Net balance */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Balanç Net</p>
                <p className={cn(
                  "text-base font-bold tabular-nums leading-none",
                  netBalance > 0 ? "text-emerald-600" : netBalance < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"
                )}>
                  {netBalance > 0 ? "+" : ""}{formatEuros(netBalance)}
                </p>
              </div>
            </div>

            <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700" />

            {/* Et deuen */}
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Et deuen</p>
                <p className="text-base font-bold text-emerald-600 tabular-nums leading-none">{formatEuros(totalOwed)}</p>
              </div>
            </div>

            <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700" />

            {/* Deus tu */}
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Deus tu</p>
                <p className="text-base font-bold text-rose-500 tabular-nums leading-none">{formatEuros(totalOwing)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PERSON GRID ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800 animate-pulse" />
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
            const balance = Math.round(Number(person.balance) * 100) / 100
            const balanceColor =
              balance > 0 ? "#10b981" :
              balance < 0 ? "#f43f5e" : "#94a3b8"
            const statusLabel =
              balance > 0 ? "Et deu a tu" :
              balance < 0 ? "Li deus tu" : "Al corrent"

            return (
              <div
                key={person.id}
                className={cn(card, "group relative flex flex-col hover:-translate-y-0.5 transition-all duration-200")}
              >
                {/* Top accent strip */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: balanceColor }} />

                {/* Card body */}
                <div className="flex flex-col gap-5 p-5 pt-6 flex-1">
                  {/* Header: avatar + name + edit/delete */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex items-center gap-3 min-w-0 text-left"
                      onClick={() => setHistoryPerson(person)}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm"
                        style={{ backgroundColor: balanceColor + "18", color: balanceColor }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate leading-tight">
                          {person.nom}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: balanceColor }}>
                          {statusLabel}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => { setEditingPerson(person); setShowModal(true) }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        onClick={() => handleDelete(person)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Balance */}
                  <button className="text-left" onClick={() => setHistoryPerson(person)}>
                    <p className={cn(
                      "text-4xl font-bold tabular-nums leading-none",
                      balance > 0 ? "text-emerald-500" :
                      balance < 0 ? "text-rose-500" : "text-slate-300 dark:text-slate-600"
                    )}>
                      {balance === 0
                        ? formatEuros(0)
                        : (balance > 0 ? "+" : "-") + formatEuros(Math.abs(balance))}
                    </p>
                  </button>
                </div>

                {/* Footer bar */}
                <div className="flex items-center gap-1 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setHistoryPerson(person)}
                  >
                    <History className="w-3.5 h-3.5" />
                    Historial
                  </button>
                  {balance > 0 && (
                    <>
                      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                      <button
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        onClick={() => setSettlePerson(person)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        M'ha pagat
                      </button>
                    </>
                  )}
                  {balance < 0 && (
                    <>
                      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                      <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-rose-400">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Pendent
                      </span>
                    </>
                  )}
                </div>
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
