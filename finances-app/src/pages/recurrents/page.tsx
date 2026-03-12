import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useAuthStore } from "@/store/authStore"
import {
  getAllActiveRecurringTemplates,
  eliminateRecurringTemplate,
  skipRecurringMonth,
  getSkippedTemplateIds,
} from "@/lib/db/queries/recurring-templates"
import { getTransactions, deleteTransaction, getTransactionSplits } from "@/lib/db/queries/transactions"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getPeople } from "@/lib/db/queries/people"
import type { RecurringTemplate, Account, Category, Person, TransactionWithRelations } from "@/types/database"
import { formatEuros, cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import { ColorDot } from "@/components/shared/ColorDot"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { RefreshCw, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react"
import { fallbackIcon, iconMap } from "@/lib/iconMap"
import { DetectRecurrentsModal } from "@/components/features/recurrents/DetectRecurrentsModal"

const TransactionModal = lazy(() => import("@/components/features/transaccions/TransactionModal"))

// ── Calendar helpers ────────────────────────────────────────────────────────

const MES_NOMS = [
  "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
  "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
]
const DIA_NOMS = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"]

function buildCalendarDays(year: number, month: number) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return { cells, daysInMonth }
}

// ── Template chip (calendar cell) ────────────────────────────────────────────

function TemplateChip({
  template,
  category,
  isLoading,
  hasTransaction,
  displayAmount,
  onClick,
}: {
  template: RecurringTemplate
  category: Category | undefined
  isLoading: boolean
  hasTransaction: boolean
  displayAmount: number
  onClick: () => void
}) {
  const IconComponent = category ? (iconMap[category.icona] ?? fallbackIcon) : fallbackIcon
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-full text-left rounded-lg px-2 py-2.5 flex items-center gap-2 group shadow-sm hover:brightness-90 active:scale-95 transition-all disabled:opacity-60 overflow-hidden",
        !hasTransaction && "opacity-50"
      )}
      style={{ backgroundColor: category?.color ?? "#94a3b8" }}
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/20 shrink-0">
        <IconComponent className="w-4 h-4 text-white" />
      </span>
      <p className="text-[13px] font-medium text-white/90 leading-tight truncate flex-1">
        {template.concepte}
      </p>
      {isLoading
        ? <Loader2 className="w-3 h-3 text-white/60 animate-spin shrink-0" />
        : <p className="text-[13px] font-bold text-white font-mono leading-none shrink-0">
            {template.tipus === "despesa" ? "-" : "+"}{formatEuros(displayAmount)}
          </p>
      }
    </button>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RecurrentsPage() {
  const { userId } = useAuthStore()
  const today = new Date()

  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingChipId, setLoadingChipId] = useState<string | null>(null)
  const [showDetect, setShowDetect] = useState(false)
  const [matchedConceptes, setMatchedConceptes] = useState<Set<string>>(new Set())
  const [matchedNetAmounts, setMatchedNetAmounts] = useState<Map<string, number>>(new Map())
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  // Action sheet state
  const [actionTemplate, setActionTemplate] = useState<RecurringTemplate | null>(null)
  const [actionTx, setActionTx] = useState<TransactionWithRelations | null>(null)
  const [deleteStep, setDeleteStep] = useState(false) // true = show delete sub-choices
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [createTemplate, setCreateTemplate] = useState<RecurringTemplate | null>(null)
  const [createInitialDeutes, setCreateInitialDeutes] = useState<Array<{ persona_id: string; import_degut: number }>>([])
  const [editTx, setEditTx] = useState<TransactionWithRelations | undefined>()

  // Calendar navigation
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const load = useCallback(async () => {
    if (!userId) return
    const [tmpl, accs, cats, ppl] = await Promise.all([
      getAllActiveRecurringTemplates(userId),
      getAccounts(userId),
      getCategories(userId),
      getPeople(userId),
    ])
    setTemplates(tmpl)
    setAccounts(accs)
    setCategories(cats)
    setPeople(ppl)
    setIsLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  // Load which templates already have a transaction for the viewed month
  useEffect(() => {
    if (!userId || templates.length === 0) return
    const firstDay = new Date(calYear, calMonth, 1).getTime()
    const lastDay = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999).getTime()
    getTransactions({ userId, dateStart: firstDay, dateEnd: lastDay, limit: 500 }).then(txs => {
      const recurrentTxs = txs.filter(t => t.recurrent)
      setMatchedConceptes(new Set(recurrentTxs.map(t => t.concepte)))
      setMatchedNetAmounts(new Map(
        recurrentTxs.map(t => [t.concepte, t.import_trs - (t.total_deutes ?? 0)])
      ))
    })
  }, [userId, calYear, calMonth, templates])

  // Load skipped months for the viewed month
  useEffect(() => {
    if (!userId) return
    getSkippedTemplateIds(userId, calYear, calMonth).then(setSkippedIds)
  }, [userId, calYear, calMonth])

  // Determines if a template should be shown for the viewed month (based on start date)
  function templateStartedBy(t: RecurringTemplate): boolean {
    if (!t.data_inici) return true // pre-migration templates always show
    const lastDayOfMonth = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999).getTime()
    return t.data_inici <= lastDayOfMonth
  }

  async function handleChipClick(template: RecurringTemplate) {
    if (!userId || loadingChipId) return
    setLoadingChipId(template.id)
    try {
      const firstDay = new Date(calYear, calMonth, 1).getTime()
      const lastDay = new Date(calYear, calMonth + 1, 0, 23, 59, 59, 999).getTime()
      const txs = await getTransactions({
        userId,
        categoriaId: template.categoria_id ?? undefined,
        tipus: template.tipus,
        dateStart: firstDay,
        dateEnd: lastDay,
      })
      const match = txs.find(t => t.concepte === template.concepte && t.recurrent)

      if (match) {
        setActionTx(match)
        setCreateInitialDeutes([])
      } else {
        // Fetch splits from the most recent past transaction of this recurrent type
        const pastTxs = await getTransactions({
          userId,
          categoriaId: template.categoria_id ?? undefined,
          tipus: template.tipus,
          dateEnd: firstDay - 1,
          limit: 20,
        })
        const lastMatch = pastTxs.find(t => t.concepte === template.concepte && t.recurrent)
        const splits = lastMatch ? await getTransactionSplits(lastMatch.id) : []
        setCreateInitialDeutes(splits.map(s => ({ persona_id: s.persona_id, import_degut: s.import_degut })))
        setActionTx(null)
      }

      setActionTemplate(template)
      setDeleteStep(false)
    } finally {
      setLoadingChipId(null)
    }
  }

  function closeActionSheet() {
    setActionTemplate(null)
    setActionTx(null)
    setDeleteStep(false)
  }

  async function handleMaintainRecurrent() {
    if (!userId || !actionTx) return
    setActionLoading(true)
    try {
      await deleteTransaction(actionTx.id, userId, true)
      closeActionSheet()
      load()
      // Refresh matched transactions
      getSkippedTemplateIds(userId, calYear, calMonth).then(setSkippedIds)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteRecurrent() {
    if (!userId || !actionTemplate) return
    setActionLoading(true)
    try {
      if (actionTx) {
        // Delete transaction (template deletion handled by deleteTransaction)
        await deleteTransaction(actionTx.id, userId, false)
      } else {
        // Only delete the template
        await eliminateRecurringTemplate(actionTemplate.id, userId)
      }
      closeActionSheet()
      load()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSkipMonth() {
    if (!userId || !actionTemplate) return
    setActionLoading(true)
    try {
      await skipRecurringMonth(actionTemplate.id, userId, calYear, calMonth)
      closeActionSheet()
      getSkippedTemplateIds(userId, calYear, calMonth).then(setSkippedIds)
    } finally {
      setActionLoading(false)
    }
  }

  function handleAddPayment() {
    if (!actionTemplate) return
    setCreateTemplate(actionTemplate)
    closeActionSheet()
  }

  function handleEditTx() {
    if (!actionTx) return
    setEditTx(actionTx)
    closeActionSheet()
  }

  const totalMensual = templates
    .filter(t => t.tipus === "despesa" && templateStartedBy(t) && !skippedIds.has(t.id))
    .reduce((s, t) => {
      const net = matchedNetAmounts.get(t.concepte) ?? t.user_import ?? t.import_trs
      return s + net
    }, 0)

  const getCat = (id: string | null) => categories.find(c => c.id === id)

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const { cells, daysInMonth } = buildCalendarDays(calYear, calMonth)
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth()

  function templatesForDay(day: number) {
    return templates.filter(t => {
      if (t.dia_del_mes > daysInMonth) return false
      if (t.dia_del_mes !== day) return false
      if (!templateStartedBy(t)) return false
      if (skippedIds.has(t.id)) return false
      return true
    })
  }

  // Visible templates for mobile list
  const visibleTemplates = templates.filter(t => templateStartedBy(t) && !skippedIds.has(t.id))

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Recurrents"
        subtitle={`${visibleTemplates.length} subscripcions · ${formatEuros(totalMensual)}/mes`}
        action={
          <button
            onClick={() => setShowDetect(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-card hover:bg-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Detectar
          </button>
        }
      />

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <RefreshCw className="w-10 h-10 opacity-20" />
          <p className="text-sm">Encara no hi ha recurrents.</p>
          <p className="text-xs opacity-70">Marca una transacció com a "Subscripció / Recurrent" per afegir-la aquí.</p>
        </div>
      ) : (
        <>
          {/* ── Desktop: Calendar ─────────────────────────────────────────── */}
          <div className="hidden md:block">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold">
                  {MES_NOMS[calMonth]} {calYear}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {DIA_NOMS.map(d => (
                  <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dayTemplates = day ? templatesForDay(day) : []
                  const isToday = isCurrentMonth && day === today.getDate()

                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-24 p-1.5 border-b border-r border-border/40 flex flex-col gap-1",
                        !day && "bg-muted/20",
                        i % 7 === 6 && "border-r-0",
                      )}
                    >
                      {day && (
                        <>
                          <span className={cn(
                            "text-[11px] font-semibold self-end w-5 h-5 flex items-center justify-center rounded-full",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground",
                          )}>
                            {day}
                          </span>
                          {dayTemplates.map(t => (
                            <TemplateChip
                              key={t.id}
                              template={t}
                              category={getCat(t.categoria_id)}
                              isLoading={loadingChipId === t.id}
                              hasTransaction={matchedConceptes.has(t.concepte)}
                              displayAmount={matchedNetAmounts.get(t.concepte) ?? t.user_import ?? t.import_trs}
                              onClick={() => handleChipClick(t)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Mobile: List ordered by dia_del_mes ───────────────────────── */}
          <div className="md:hidden space-y-2">
            {visibleTemplates.map(t => {
              const cat = getCat(t.categoria_id)
              const acc = accounts.find(a => a.id === t.compte_id)
              return (
                <button
                  key={t.id}
                  onClick={() => handleChipClick(t)}
                  disabled={loadingChipId === t.id}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/40 transition-colors text-left disabled:opacity-60",
                    !matchedConceptes.has(t.concepte) && "opacity-50"
                  )}
                >
                  {/* Day badge */}
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-muted/60 shrink-0">
                    <span className="text-[10px] text-muted-foreground leading-none">dia</span>
                    <span className="text-sm font-bold leading-tight">{t.dia_del_mes}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {cat && <ColorDot color={cat.color} />}
                      <span className="text-sm font-medium truncate">{t.concepte}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {cat?.nom ?? "Sense categoria"}
                      {acc ? ` · ${acc.nom}` : ""}
                    </p>
                  </div>

                  {/* Amount */}
                  <span className={cn(
                    "text-sm font-mono font-semibold shrink-0",
                    t.tipus === "despesa" ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400",
                  )}>
                    {t.tipus === "despesa" ? "-" : "+"}{formatEuros(matchedNetAmounts.get(t.concepte) ?? t.user_import ?? t.import_trs)}
                  </span>

                  {loadingChipId === t.id
                    ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 animate-spin" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  }
                </button>
              )
            })}

            {/* Mobile total */}
            <div className="rounded-xl border bg-muted/30 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total mensual</span>
              <span className="text-sm font-semibold text-red-500">-{formatEuros(totalMensual)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Action sheet ──────────────────────────────────────────────────── */}
      {actionTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeActionSheet} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm mx-4 mb-4 sm:mb-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                {(() => {
                  const cat = getCat(actionTemplate.categoria_id)
                  const Icon = cat ? (iconMap[cat.icona] ?? fallbackIcon) : fallbackIcon
                  return (
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                  )
                })()}
                <span className="font-semibold text-sm">{actionTemplate.concepte}</span>
              </div>
              <button onClick={closeActionSheet} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-3 space-y-1.5">
              {!deleteStep ? (
                actionTx ? (
                  /* Colored chip: has transaction */
                  <>
                    <button
                      onClick={handleEditTx}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
                    >
                      Editar transacció
                    </button>
                    <button
                      onClick={() => setDeleteStep(true)}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium text-red-500"
                    >
                      Eliminar transacció…
                    </button>
                  </>
                ) : (
                  /* Gray chip: no transaction yet */
                  <>
                    <button
                      onClick={handleAddPayment}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
                    >
                      Afegir pagament
                    </button>
                    <button
                      onClick={handleSkipMonth}
                      disabled={actionLoading}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      Saltar aquest mes
                    </button>
                    <button
                      onClick={handleDeleteRecurrent}
                      disabled={actionLoading}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium text-red-500 disabled:opacity-50"
                    >
                      Eliminar recurrent
                    </button>
                  </>
                )
              ) : (
                /* Delete sub-choices */
                <>
                  <p className="text-xs text-muted-foreground px-4 pb-1">Eliminar la transacció d'aquest mes i…</p>
                  <button
                    onClick={handleMaintainRecurrent}
                    disabled={actionLoading}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Mantenir recurrent
                    <span className="block text-xs text-muted-foreground font-normal">El chip torna a aparèixer grisós</span>
                  </button>
                  <button
                    onClick={handleDeleteRecurrent}
                    disabled={actionLoading}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium text-red-500 disabled:opacity-50"
                  >
                    Eliminar recurrent
                    <span className="block text-xs text-red-400 font-normal">El chip desapareix de tots els mesos futurs</span>
                  </button>
                  <button
                    onClick={() => setDeleteStep(false)}
                    className="w-full text-left px-4 py-2 rounded-xl hover:bg-muted transition-colors text-sm text-muted-foreground"
                  >
                    Tornar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal — transacció pendent d'afegir */}
      <Suspense fallback={null}>
        <TransactionModal
          isOpen={!!createTemplate}
          onClose={() => { setCreateTemplate(null); setCreateInitialDeutes([]) }}
          onSuccess={() => { setCreateTemplate(null); load() }}
          accounts={accounts}
          categories={categories}
          people={people}
          defaultDate={createTemplate
            ? new Date(calYear, calMonth, Math.min(
                createTemplate.dia_del_mes,
                new Date(calYear, calMonth + 1, 0).getDate()
              )).getTime()
            : undefined}
          initialValues={createTemplate ? {
            tipus: createTemplate.tipus,
            concepte: createTemplate.concepte,
            import_trs: createTemplate.import_trs,
            compte_id: createTemplate.compte_id ?? "",
            categoria_id: createTemplate.categoria_id ?? "",
            notes: createTemplate.notes ?? "",
            recurrent: true,
            pagat_per_id: createTemplate.pagat_per_id ?? null,
            deutes: createInitialDeutes,
          } : undefined}
        />
      </Suspense>

      {/* Edit modal — obert des del detail */}
      <Suspense fallback={null}>
        <TransactionModal
          isOpen={!!editTx}
          onClose={() => setEditTx(undefined)}
          onSuccess={() => { setEditTx(undefined); load() }}
          transactionToEdit={editTx}
          accounts={accounts}
          categories={categories}
          people={people}
        />
      </Suspense>

      {/* Detect recurring patterns modal */}
      {userId && (
        <DetectRecurrentsModal
          isOpen={showDetect}
          onClose={() => setShowDetect(false)}
          userId={userId}
          onDone={load}
        />
      )}
    </div>
  )
}
