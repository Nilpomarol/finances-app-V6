import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getTransactions } from "@/lib/db/queries/transactions"
import { getCategories } from "@/lib/db/queries/categories"
import { getEvents } from "@/lib/db/queries/events"
import { getEventTags } from "@/lib/db/queries/event-tags"
import { getRules } from "@/lib/db/queries/rules"
import { getPeople } from "@/lib/db/queries/people"
import type { Account, TransactionWithRelations, Category, Person } from "@/types/database"
import { formatEuros, eventColor } from "@/lib/utils"
import {
  ArrowDownRight, ArrowUpRight, Landmark, Wallet,
  Upload, Activity, Plus,
} from "lucide-react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Button } from "@/components/ui/button"
import ImportCsvModal from "@/components/features/importador-csv/ImportCsvModal"
import TransactionModal from "@/components/features/transaccions/TransactionModal"
import EntityTransactionsModal from "@/components/shared/EntityTransactionsModal"
import type { EntityTransactionsEntity } from "@/components/shared/EntityTransactionsModal"
import { CategoriesCard } from "@/components/features/dashboard/CategoriesCard"
import { MovimentsCard } from "@/components/features/dashboard/MovimentsCard"
import { DashboardMobile } from "@/components/features/dashboard/DashboardMobile"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

// ─── Viewport hook ────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, nomMes }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 text-sm">
      <p className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold mb-2">Dia {label} · {nomMes}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.dataKey === "ingressos" ? "Ingressos" : "Despeses"}:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatEuros(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Account type display labels ─────────────────────────────────────────────
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  banc: "Compte Bancari",
  estalvi: "Estalvis",
  efectiu: "Efectiu",
  inversio: "Inversió",
}

export default function DashboardPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()
  const { theme } = useThemeStore()
  const isMobile = useIsMobile()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [txEntity, setTxEntity] = useState<EntityTransactionsEntity | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [eventTags, setEventTags] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  useEffect(() => {
    if (!userId) return
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()

    Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getTransactions({ userId, dateStart: firstDay, dateEnd: lastDay, excludeLiquidacions: true }),
      getEvents(userId),
      getEventTags(userId),
      getRules(userId),
      getPeople(userId),
    ]).then(([accs, cats, txs, eventsData, eventTagsData, rulesData, ppl]) => {
      setAccounts(accs)
      setCategories(cats)
      setTransactions(txs)
      setEvents(eventsData)
      setEventTags(eventTagsData)
      setRules(rulesData)
      setPeople(ppl)
      setIsLoading(false)
    })
  }, [userId])

  const nomMesActual = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("ca-ES", { month: "long", year: "numeric" })
    const t = fmt.format(new Date())
    return t.charAt(0).toUpperCase() + t.slice(1).replace(" de ", " ")
  }, [])

  const kpis = useMemo(() => {
    const patrimoni = accounts.reduce((acc, curr) => acc + curr.saldo, 0)
    let ingressos = 0, despeses = 0
    transactions.forEach(tx => {
      if (tx.tipus === "ingres") ingressos += tx.import_trs
      if (tx.tipus === "despesa") despeses += tx.import_trs - (tx.total_deutes ?? 0)
    })
    return { patrimoni, ingressos, despeses, fluxNet: ingressos - despeses }
  }, [accounts, transactions])

  const dailyEvolution = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyMap: Record<number, { day: number; ingressos: number; despeses: number }> = {}
    for (let d = 1; d <= daysInMonth; d++) dailyMap[d] = { day: d, ingressos: 0, despeses: 0 }
    transactions.forEach(tx => {
      const day = new Date(tx.data).getDate()
      if (dailyMap[day]) {
        if (tx.tipus === "ingres") dailyMap[day].ingressos += tx.import_trs
        if (tx.tipus === "despesa") dailyMap[day].despeses += tx.import_trs - (tx.total_deutes ?? 0)
      }
    })
    return Object.values(dailyMap).sort((a, b) => a.day - b.day)
  }, [transactions])

  const getCategoryBreakdown = (tipus: "despesa" | "ingres") => {
    const catMap = new Map<string, any>()
    transactions.forEach(tx => {
      if (tx.tipus !== tipus) return
      const amount = tipus === "despesa" ? tx.import_trs - (tx.total_deutes ?? 0) : tx.import_trs

      if (tx.esdeveniment_id) {
        const key = tx.esdeveniment_id
        const existing = catMap.get(key)
        if (existing) {
          existing.total += amount
        } else {
          catMap.set(key, {
            id: key,
            nom: tx.esdeveniment_nom ?? "Sense nom",
            color: eventColor(key),
            total: amount,
            pressupost_mensual: null,
          })
        }
      } else {
        const catId = tx.categoria_id || "__sense__"
        const existing = catMap.get(catId)
        if (existing) {
          existing.total += amount
        } else {
          const cat = categories.find(c => c.id === catId)
          catMap.set(catId, {
            id: catId,
            nom: cat?.nom || "Sense categoria",
            color: cat?.color || "#94a3b8",
            total: amount,
            pressupost_mensual: cat?.pressupost_mensual ?? null,
          })
        }
      }
    })
    return Array.from(catMap.values()).sort((a, b) => b.total - a.total)
  }

  const expensesBreakdown = useMemo(() => getCategoryBreakdown("despesa"), [transactions, categories])
  const incomesBreakdown = useMemo(() => getCategoryBreakdown("ingres"), [transactions, categories])
  const ultimsMoviments = useMemo(() => transactions.slice(0, 8), [transactions])

  const handleAccountClick = (acc: Account) => {
    setTxEntity({ type: "account", id: acc.id, name: acc.nom, color: acc.color })
  }

  const handleTransactionClick = (tx: TransactionWithRelations) => {
    if (tx.esdeveniment_id) navigate(`/esdeveniments/${tx.esdeveniment_id}`)
    else navigate("/transaccions")
  }

  if (isLoading) {
    return <LoadingSpinner label="Carregant resum financer…" />
  }

  const savingsRate = kpis.ingressos > 0
    ? Math.round((kpis.fluxNet / kpis.ingressos) * 100)
    : 0

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <DashboardMobile
          accounts={accounts}
          transactions={transactions}
          kpis={kpis}
          nomMesActual={nomMesActual}
        />
        <ImportCsvModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); window.location.reload() }}
          accounts={accounts}
          categories={categories}
          events={events}
          eventTags={eventTags}
          people={people}
          rules={rules}
        />
      </>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)] overflow-hidden"

  return (
    <div className="space-y-8 w-full">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            {nomMesActual}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Resum Financer
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {transactions.length} moviments registrats aquest mes
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setShowTransactionModal(true)}
            className="h-10 px-5 text-sm font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova transacció
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="h-10 px-5 text-sm font-semibold"
          >
            <Upload className="w-4 h-4 mr-2 opacity-70" />
            Importar CSV
          </Button>
        </div>
      </div>

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patrimoni — neutral, anchoring */}
        <div className={cn(card, "p-6 flex flex-col gap-5")}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Patrimoni Total</p>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
            {formatEuros(kpis.patrimoni)}
          </p>
        </div>

        {/* Ingressos — green */}
        <div className={cn(card, "p-6 flex flex-col gap-5 border-l-4 border-l-emerald-500")}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ingressos</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 tabular-nums tracking-tight leading-none">
            {formatEuros(kpis.ingressos)}
          </p>
        </div>

        {/* Despeses — rose */}
        <div className={cn(card, "p-6 flex flex-col gap-5 border-l-4 border-l-rose-500")}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Despeses</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-600 tabular-nums tracking-tight leading-none">
            {formatEuros(kpis.despeses)}
          </p>
        </div>

        {/* Flux Net — dynamic color */}
        <div className={cn(
          card, "p-6 flex flex-col gap-5",
          kpis.fluxNet >= 0 ? "border-l-4 border-l-indigo-500" : "border-l-4 border-l-rose-500"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Flux Net</p>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              kpis.fluxNet >= 0 ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-rose-50 dark:bg-rose-900/30"
            )}>
              <Activity className={cn("w-4 h-4", kpis.fluxNet >= 0 ? "text-indigo-600" : "text-rose-600")} />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className={cn(
              "text-3xl font-bold tabular-nums tracking-tight leading-none",
              kpis.fluxNet >= 0 ? "text-indigo-600" : "text-rose-600"
            )}>
              {kpis.fluxNet > 0 ? "+" : ""}{formatEuros(kpis.fluxNet)}
            </p>
            {kpis.ingressos > 0 && (
              <span className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full border mb-0.5 shrink-0",
                savingsRate >= 0
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-rose-700 bg-rose-50 border-rose-200"
              )}>
                {savingsRate > 0 ? "+" : ""}{savingsRate}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CHART ──────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Evolució Diària</h2>
            <p className="text-sm text-slate-400 mt-0.5">{nomMesActual}</p>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Ingressos
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Despeses
            </span>
          </div>
        </div>
        <div className="px-4 pt-4 pb-2">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyEvolution} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIngressos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespeses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme === "dark" ? "#1e293b" : "#f1f5f9"} />
                <XAxis
                  dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }} dy={8} interval={4}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(v) => `€${v}`}
                />
                <Tooltip content={<ChartTooltip nomMes={nomMesActual} />} />
                <Area type="monotone" dataKey="ingressos" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#gradIngressos)" dot={false} activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="despeses" stroke="#f43f5e" strokeWidth={2.5}
                  fill="url(#gradDespeses)" dot={false} activeDot={{ r: 5, fill: "#f43f5e", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── ACCOUNTS ───────────────────────────────────────────────────────── */}
      {accounts.length > 0 && (
        <div className={cn(
          "grid gap-4",
          accounts.length === 1 ? "grid-cols-1" :
          accounts.length === 2 ? "grid-cols-2" :
          accounts.length === 3 ? "grid-cols-3" :
          accounts.length === 4 ? "grid-cols-4" : "grid-cols-5"
        )}>
          {accounts.map(acc => {
            const pct = kpis.patrimoni > 0 ? Math.round((acc.saldo / kpis.patrimoni) * 100) : 0
            return (
              <button
                key={acc.id}
                onClick={() => handleAccountClick(acc)}
                className={cn(
                  "group flex flex-col justify-between gap-7 p-6 text-left w-full",
                  "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden relative",
                  "hover:shadow-xl hover:-translate-y-1 transition-all duration-200",
                  "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"
                )}
              >
                {/* Top color strip using account color */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: acc.color }} />

                <div className="flex items-center justify-between mt-1">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${acc.color}15`, color: acc.color }}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {ACCOUNT_TYPE_LABELS[acc.tipus] ?? acc.tipus}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1.5 truncate">{acc.nom}</p>
                    <p className="font-bold text-[2rem] text-slate-900 dark:text-white tabular-nums tracking-tight truncate leading-none">
                      {formatEuros(acc.saldo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: acc.color }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 shrink-0 tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── BOTTOM TWO-COLUMN ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <CategoriesCard
          className="lg:col-span-4"
          despeses={expensesBreakdown}
          ingressos={incomesBreakdown}
          totalDespeses={kpis.despeses}
          totalIngressos={kpis.ingressos}
          nomMes={nomMesActual}
        />
        <MovimentsCard
          className="lg:col-span-8"
          transactions={ultimsMoviments}
          onTransactionClick={handleTransactionClick}
        />
      </div>

      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { setShowImportModal(false); window.location.reload() }}
        accounts={accounts}
        categories={categories}
        events={events}
        eventTags={eventTags}
        people={people}
        rules={rules}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => { setShowTransactionModal(false); window.location.reload() }}
        accounts={accounts}
        categories={categories}
        people={people}
        events={events}
      />

      <EntityTransactionsModal
        isOpen={!!txEntity}
        onClose={() => setTxEntity(null)}
        entity={txEntity}
      />
    </div>
  )
}