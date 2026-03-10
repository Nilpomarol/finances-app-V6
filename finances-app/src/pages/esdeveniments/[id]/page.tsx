import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { getEventById, getTransactionsByEvent, getEvents } from "@/lib/db/queries/events"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getPeople } from "@/lib/db/queries/people"
import type { Account, Category, Person, Event, TransactionWithRelations } from "@/types/database"
import { formatEuros, now } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, CalendarDays, Wallet, TrendingUp,
  Plane, PartyPopper, Tag as TagIcon, Plus,
} from "lucide-react"
import TransactionTable from "@/components/features/transaccions/TransactionTable"
import TransactionModal from "@/components/features/transaccions/TransactionModal"
import TransactionListMobile from "@/components/features/transaccions/TransactionListMobile"
import TransactionDetailModal from "@/components/features/transaccions/TransactionDetailModal"
import { deleteTransaction } from "@/lib/db/queries/transactions"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPUS_META: Record<string, { label: string; icon: React.ElementType; colorHex: string }> = {
  viatge:     { label: "Viatge",     icon: Plane,       colorHex: "#3b82f6" },
  celebracio: { label: "Celebració", icon: PartyPopper, colorHex: "#ec4899" },
  altre:      { label: "Altre",      icon: TagIcon,     colorHex: "#64748b" },
}
function getTypeMeta(tipus: string) {
  return TIPUS_META[tipus] ?? TIPUS_META["altre"]
}

/** Net amount the user actually paid (full amount minus what others owe) */
function netAmount(t: TransactionWithRelations): number {
  if (t.tipus !== "despesa") return t.import_trs
  const deutes = t.total_deutes ?? 0
  return deutes > 0 ? t.import_trs - deutes : t.import_trs
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold mb-2">Dia {label}</p>
      {[...payload].reverse().map((entry: any) =>
        entry.value > 0 && (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[90px]">{entry.name}</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatEuros(entry.value)}</span>
          </div>
        )
      )}
      <div className="flex items-center justify-between gap-3 text-xs border-t border-slate-100 dark:border-slate-800 mt-2 pt-2">
        <span className="text-slate-400 font-medium">Total del dia</span>
        <span className="font-black text-slate-900 dark:text-white tabular-nums">{formatEuros(total)}</span>
      </div>
    </div>
  )
}

// ─── Colored KPI card ─────────────────────────────────────────────────────────

function ColorKpiCard({ title, value, sub, icon, accentColor, iconBg }: {
  title: string; value: React.ReactNode; sub?: React.ReactNode
  icon: React.ReactNode; accentColor: string; iconBg: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden relative shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
      <div className="pl-6 pr-5 py-5 flex items-center gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{title}</p>
          <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EsdevenimentDetallPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuthStore()

  const [event, setEvent] = useState<Event | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | undefined>()
  const [viewingTransaction, setViewingTransaction] = useState<TransactionWithRelations | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; action: () => void }>({ open: false, title: "", action: () => {} })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [allEvents, setAllEvents] = useState<Event[]>([])

  useEffect(() => {
    async function load() {
      if (!userId || !id) return
      setIsLoading(true)
      try {
        const [ev, txs] = await Promise.all([
          getEventById(id, userId),
          getTransactionsByEvent(id, userId),
        ])
        setEvent(ev)
        setTransactions(txs)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, userId])

  // Load reference data
  useEffect(() => {
    if (!userId) return
    Promise.all([getAccounts(userId), getCategories(userId), getPeople(userId), getEvents(userId)]).then(
      ([accs, cats, ppl, evts]) => {
        setAccounts(accs)
        setCategories(cats)
        setPeople(ppl)
        setAllEvents(evts)
      }
    )
  }, [userId])

  // ── KPIs (net of shared expenses) ────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!event) return { totalGastat: 0, dies: 1, mitjanaDia: 0 }
    const totalGastat = transactions
      .filter(t => t.tipus === "despesa")
      .reduce((acc, t) => acc + netAmount(t), 0)
    const diff = Math.abs(event.data_fi - event.data_inici)
    const dies = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    return { totalGastat, dies, mitjanaDia: totalGastat / dies }
  }, [event, transactions])

  // ── Breakdowns (net amounts) ──────────────────────────────────────────────

  const breakdown = useMemo(() => {
    const expenses = transactions.filter(t => t.tipus === "despesa")
    const catsMap = new Map<string, { nom: string; color: string; icona?: string; total: number }>()
    const tagsMap = new Map<string, { nom: string; color: string; isFallback: boolean; total: number }>()

    expenses.forEach(t => {
      const amt = netAmount(t)

      const catKey = t.categoria_id || "sense-cat"
      const cat = catsMap.get(catKey) ?? { nom: t.categoria_nom || "Sense Categoria", color: t.categoria_color || "#cbd5e1", icona: t.categoria_icona, total: 0 }
      catsMap.set(catKey, { ...cat, total: cat.total + amt })

      const hasTag = !!t.event_tag_id
      const tagKey = hasTag ? `tag-${t.event_tag_id}` : `cat-${catKey}`
      const tag = tagsMap.get(tagKey) ?? {
        nom: hasTag ? (t.event_tag_nom ?? "") : (t.categoria_nom || "Sense Categoria"),
        color: hasTag ? (t.event_tag_color ?? "#cbd5e1") : (t.categoria_color ?? "#cbd5e1"),
        isFallback: !hasTag,
        total: 0,
      }
      tagsMap.set(tagKey, { ...tag, total: tag.total + amt })
    })

    const sort = (a: any, b: any) => b.total - a.total
    return {
      categories: Array.from(catsMap.values()).sort(sort),
      tags: Array.from(tagsMap.values()).sort(sort),
    }
  }, [transactions])

  // ── Stacked daily chart (net amounts, by category) ────────────────────────

  const chartData = useMemo(() => {
    if (!event) return { data: [], seriesKeys: [] as { key: string; color: string; label: string }[] }

    const startDay = new Date(event.data_inici)
    startDay.setHours(0, 0, 0, 0)
    const endDay = new Date(event.data_fi)
    endDay.setHours(23, 59, 59, 999)
    const totalDays = Math.max(1, Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))

    const catTotals = new Map<string, { nom: string; color: string; total: number }>()
    transactions.filter(t => t.tipus === "despesa").forEach(t => {
      const k = t.categoria_id || "sense-cat"
      const amt = netAmount(t)
      const existing = catTotals.get(k)
      if (existing) existing.total += amt
      else catTotals.set(k, { nom: t.categoria_nom || "Sense Cat.", color: t.categoria_color || "#94a3b8", total: amt })
    })

    const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1].total - a[1].total)
    const MAX_SERIES = 5
    const topCats = sortedCats.slice(0, MAX_SERIES)
    const hasOthers = sortedCats.length > MAX_SERIES

    const seriesKeys: { key: string; color: string; label: string }[] = [
      ...topCats.map(([k, v]) => ({ key: k, color: v.color, label: v.nom })),
      ...(hasOthers ? [{ key: "__altres__", color: "#94a3b8", label: "Altres" }] : []),
    ]

    const dayBuckets: Record<number, Record<string, number>> = {}
    for (let d = 1; d <= totalDays; d++) {
      dayBuckets[d] = {}
      seriesKeys.forEach(s => { dayBuckets[d][s.key] = 0 })
    }

    transactions.filter(t => t.tipus === "despesa").forEach(t => {
      const txDate = new Date(t.data)
      txDate.setHours(0, 0, 0, 0)
      const dayIdx = Math.max(1, Math.min(totalDays,
        Math.ceil((txDate.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
      ))
      const catKey = t.categoria_id || "sense-cat"
      const isTop = topCats.some(([k]) => k === catKey)
      const bucketKey = isTop ? catKey : (hasOthers ? "__altres__" : catKey)
      if (dayBuckets[dayIdx] && bucketKey in dayBuckets[dayIdx]) {
        dayBuckets[dayIdx][bucketKey] += netAmount(t)
      }
    })

    const data = Object.entries(dayBuckets).map(([d, vals]) => ({ day: Number(d), ...vals }))
    return { data, seriesKeys }
  }, [event, transactions])

  const [chartMode, setChartMode] = useState<"daily" | "cumulative">("daily")

  const displayChartData = useMemo(() => {
    if (chartMode === "daily") return chartData.data
    // Build cumulative data: running sum per series key
    const acc: Record<string, number> = {}
    chartData.seriesKeys.forEach(s => { acc[s.key] = 0 })
    return chartData.data.map(row => {
      const out: Record<string, number> = { day: row.day }
      chartData.seriesKeys.forEach(s => {
        acc[s.key] += (row as any)[s.key] ?? 0
        out[s.key] = acc[s.key]
      })
      return out
    })
  }, [chartData, chartMode])

  const [breakdownMetric, setBreakdownMetric] = useState<"total" | "average">("total")

  const breakdownRef = useRef<HTMLDivElement>(null)
  const txRef = useRef<HTMLDivElement>(null)

  // Match both panels to the shorter of their natural heights
  useLayoutEffect(() => {
    const measure = () => {
      const bd = breakdownRef.current
      const tx = txRef.current
      if (!bd || !tx) return
      // Clear previous constraints
      bd.style.maxHeight = ""
      tx.style.maxHeight = ""
      // Temporarily prevent grid stretch so we measure natural content heights
      bd.style.alignSelf = "start"
      tx.style.alignSelf = "start"
      // Force reflow and read natural heights
      const minH = Math.min(bd.offsetHeight, tx.offsetHeight)
      // Restore grid alignment and cap both at the shorter height
      bd.style.alignSelf = ""
      tx.style.alignSelf = ""
      bd.style.maxHeight = `${minH}px`
      tx.style.maxHeight = `${minH}px`
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [transactions, breakdown])

  // ─────────────────────────────────────────────────────────────────────────

  const reloadTransactions = () => {
    if (userId && id) getTransactionsByEvent(id, userId).then(setTransactions)
  }

  const handleView = (tx: TransactionWithRelations) => setViewingTransaction(tx)

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
        await deleteTransaction(tx.id, userId)
        reloadTransactions()
      },
    })
  }

  const openNewModal = () => {
    setEditingTransaction(undefined)
    setShowModal(true)
  }

  // Default date: current date if within event range, otherwise event end date
  const modalDefaultDate = useMemo(() => {
    if (!event) return now()
    const current = now()
    return (current >= event.data_inici && current <= event.data_fi) ? current : event.data_fi
  }, [event])

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-sm text-slate-400 animate-pulse">Carregant…</div>
  )
  if (!event) return (
    <div className="flex items-center justify-center h-64 text-sm text-rose-500">Esdeveniment no trobat</div>
  )

  const meta = getTypeMeta(event.tipus)
  const TypeIcon = meta.icon
  const totalExp = kpis.totalGastat
  const hasChartData = chartData.data.some(d => chartData.seriesKeys.some(s => (d as any)[s.key] > 0))

  const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

  return (
    <div className="space-y-6">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div
        className={cn(card, "overflow-hidden relative")}
        style={{ borderColor: `${meta.colorHex}40` }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: `linear-gradient(90deg, ${meta.colorHex}, ${meta.colorHex}66)` }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `${meta.colorHex}05` }} />

        <div className="relative px-5 pt-7 pb-5 flex items-center gap-3">
          <Button
            variant="outline" size="icon"
            onClick={() => navigate("/esdeveniments")}
            className="shrink-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${meta.colorHex}18` }}
          >
            <TypeIcon className="w-5 h-5" style={{ color: meta.colorHex }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: meta.colorHex }}>
              {meta.label}
            </p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
              {event.nom}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3 shrink-0" />
              {new Date(event.data_inici).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
              {" – "}
              {new Date(event.data_fi).toLocaleDateString("ca-ES", { day: "numeric", month: "short", year: "numeric" })}
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                style={{ backgroundColor: `${meta.colorHex}18`, color: meta.colorHex }}
              >
                {kpis.dies}d
              </span>
            </p>
          </div>

          {/* Total — prominent on the right (desktop only) */}
          <div className="shrink-0 text-right hidden sm:block mr-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Total gastat
            </p>
            <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color: meta.colorHex }}>
              {formatEuros(kpis.totalGastat)}
            </p>
          </div>

          <button
            onClick={openNewModal}
            className="shrink-0 flex items-center gap-2 rounded-xl px-5 h-12 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 active:opacity-80 sm:min-w-[160px] sm:justify-center"
            style={{ backgroundColor: meta.colorHex }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Nova transacció</span>
          </button>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ColorKpiCard
          title="Total Gastat"
          value={<span className="text-rose-500 dark:text-rose-400">{formatEuros(kpis.totalGastat)}</span>}
          icon={<Wallet className="w-5 h-5 text-rose-500" />}
          accentColor="#f43f5e"
          iconBg="bg-rose-50 dark:bg-rose-900/20"
        />
        <ColorKpiCard
          title="Dies de Duració"
          value={`${kpis.dies}`}
          sub="dies de viatge"
          icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
          accentColor={meta.colorHex}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <ColorKpiCard
          title="Mitjana per Dia"
          value={formatEuros(kpis.mitjanaDia)}
          sub="per dia"
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          accentColor="#f59e0b"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* ── Stacked daily chart ──────────────────────────────────────────────── */}
      {hasChartData && (
        <div className={card}>
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {chartMode === "daily" ? "Despeses per Dia" : "Despeses Acumulades"}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Desglossat per categoria · net de despeses compartides</p>
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setChartMode("daily")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  chartMode === "daily"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Per dia
              </button>
              <button
                onClick={() => setChartMode("cumulative")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  chartMode === "cumulative"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Acumulat
              </button>
            </div>
          </div>
          <div className="px-4 pt-4 pb-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayChartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    {chartData.seriesKeys.map(s => (
                      <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }} dy={6}
                    label={{ value: "Dia", position: "insideRight", dx: 14, fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => v === 0 ? "" : `€${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {chartData.seriesKeys.map(s => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stackId="1"
                      stroke={s.color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${s.key})`}
                      dot={false}
                      activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-2">
              {chartData.seriesKeys.map(s => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom grid: 1/3 breakdown · 2/3 transactions — heights matched to the shorter of the two */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Breakdown — 1/3, capped to same max-height as transaction list */}
        <div ref={breakdownRef} className={cn(card, "flex flex-col overflow-hidden")}>
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Desglossament</h2>
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setBreakdownMetric("total")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  breakdownMetric === "total"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Total
              </button>
              <button
                onClick={() => setBreakdownMetric("average")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  breakdownMetric === "average"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                Mitjana/dia
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <Tabs defaultValue="categories">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="tags">Etiquetes</TabsTrigger>
              </TabsList>

              {(["categories", "tags"] as const).map((mode) => {
                const items = breakdown[mode]
                return (
                  <TabsContent key={mode} value={mode} className="space-y-5 mt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">Sense dades</p>
                    ) : items.map((item, i) => {
                      const displayValue = breakdownMetric === "total" ? item.total : item.total / kpis.dies
                      const pct = totalExp > 0 ? Math.round((item.total / totalExp) * 100) : 0
                      return (
                        <div key={i} className={cn("space-y-2", (item as any).isFallback && "opacity-50")}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{item.nom}</span>
                              {(item as any).isFallback && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full shrink-0">
                                  sense tag
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatEuros(displayValue)}</span>
                              <span className="text-xs font-semibold text-slate-400 tabular-nums">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    {mode === "tags" && items.some((t: any) => t.isFallback) && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                        * Elements atenuats: despeses sense etiqueta (es mostra la categoria com a fallback).
                      </p>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        </div>

        {/* Transactions — 2/3 (desktop only) */}
        <div ref={txRef} className="lg:col-span-2 overflow-y-auto hidden sm:block">
          <TransactionTable
            transactions={transactions}
            showAccount={true}
            showCategory={true}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

      </div>

      {/* ── Mobile transaction list ── */}
      <div className="sm:hidden">
        <TransactionListMobile
          transactions={transactions}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <TransactionDetailModal
        isOpen={!!viewingTransaction && !showModal}
        onClose={() => setViewingTransaction(null)}
        transaction={viewingTransaction}
        onEdit={handleEdit}
        onDelete={handleDelete}
        people={people}
      />

      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transactionToEdit={editingTransaction}
        accounts={accounts}
        categories={categories}
        people={people}
        events={allEvents}
        defaultEventId={event.id}
        defaultDate={modalDefaultDate}
        onSuccess={() => {
          setShowModal(false)
          setViewingTransaction(null)
          reloadTransactions()
        }}
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
