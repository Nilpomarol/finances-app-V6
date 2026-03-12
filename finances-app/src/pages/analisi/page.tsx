import { useEffect, useState, useMemo, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import { useFilterStore } from "@/store/filterStore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getTransactions, getDistinctPeriods } from "@/lib/db/queries/transactions"
import { getEvents } from "@/lib/db/queries/events"
import { eventColor } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalysisFilters } from "@/components/features/analisi/AnalysisFilters"
import { ResumTab } from "@/components/features/analisi/ResumTab"
import { CategoriesTab } from "@/components/features/analisi/CategoriesTab"
import { ComparativaTab } from "@/components/features/analisi/ComparativaTab"
import { RecurrentsTab } from "@/components/features/analisi/RecurrentsTab"
import { MobileAnalysisView } from "@/components/features/analisi/MobileAnalysisView"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import type { Account, Category, Event, TransactionWithRelations } from "@/types/database"
import type { PeriodStats } from "@/components/features/analisi/ResumTab"
import type { CategoryComparisonItem } from "@/components/features/analisi/ComparativaTab"

export default function AnalisiPage() {
  const { userId } = useAuthStore()
  const { periode, periodeAnterior, periodeMode, compteIds, categoriaIds, evenimentIds } = useFilterStore()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [availablePeriods, setAvailablePeriods] = useState<{ mes: number; any: number }[]>([])
  const [transactionsActual, setTransactionsActual] = useState<TransactionWithRelations[]>([])
  const [transactionsAnterior, setTransactionsAnterior] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resum")
  const hasLoadedOnce = useRef(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1)
    window.addEventListener("finances:refresc", handler)
    return () => window.removeEventListener("finances:refresc", handler)
  }, [])

  // Fetch current period data + metadata
  useEffect(() => {
    if (!userId) return
    if (periodeMode !== "alltime" && !periode) return
    if (!hasLoadedOnce.current) setIsLoading(true)

    const dateRange = periodeMode === "alltime"
      ? {}
      : periodeMode === "any"
        ? {
            dateStart: new Date(periode!.any, 0, 1).getTime(),
            dateEnd: new Date(periode!.any, 11, 31, 23, 59, 59).getTime(),
          }
        : {
            dateStart: new Date(periode!.any, periode!.mes - 1, 1).getTime(),
            dateEnd: new Date(periode!.any, periode!.mes, 0, 23, 59, 59).getTime(),
          }

    Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getTransactions({ userId, ...dateRange, excludeLiquidacions: true, limit: periodeMode === "alltime" ? 999999 : undefined }),
      getEvents(userId),
      getDistinctPeriods(userId),
    ]).then(([accs, cats, txs, evts, periods]) => {
      setAccounts(accs)
      setCategories(cats)
      setTransactionsActual(txs)
      setEvents(evts as unknown as Event[])
      setAvailablePeriods(periods)
      hasLoadedOnce.current = true
      setIsLoading(false)
    })
  }, [userId, periode, periodeMode, refreshKey])

  // Fetch comparison period independently (re-runs whenever periodeAnterior changes)
  useEffect(() => {
    if (!userId || !periodeAnterior || periodeMode === "alltime") return
    const start = periodeMode === "any"
      ? new Date(periodeAnterior.any, 0, 1).getTime()
      : new Date(periodeAnterior.any, periodeAnterior.mes - 1, 1).getTime()
    const end = periodeMode === "any"
      ? new Date(periodeAnterior.any, 11, 31, 23, 59, 59).getTime()
      : new Date(periodeAnterior.any, periodeAnterior.mes, 0, 23, 59, 59).getTime()

    getTransactions({ userId, dateStart: start, dateEnd: end, excludeLiquidacions: true }).then(
      setTransactionsAnterior,
    )
  }, [userId, periodeAnterior, periodeMode])

  const actualStats = useMemo(
    () => processTransactions(transactionsActual, periode, compteIds, categoriaIds, evenimentIds, periodeMode),
    [transactionsActual, periode, compteIds, categoriaIds, evenimentIds, periodeMode],
  )

  const anteriorStats = useMemo(
    () => processTransactions(transactionsAnterior, periodeAnterior, compteIds, categoriaIds, evenimentIds, periodeMode),
    [transactionsAnterior, periodeAnterior, compteIds, categoriaIds, evenimentIds, periodeMode],
  )

  const categoryComparison = useMemo(
    () => buildCategoryComparison(actualStats.categoryData, anteriorStats.categoryData),
    [actualStats.categoryData, anteriorStats.categoryData],
  )

  const filteredActual = useMemo(() => {
    return transactionsActual.filter(t => {
      const matchCompte = compteIds.length === 0 || compteIds.includes(t.compte_id ?? "")
      const matchCat =
        categoriaIds.length === 0 ||
        (t.categoria_id != null && categoriaIds.includes(t.categoria_id))
      const matchEsdev =
        evenimentIds.length === 0 ||
        (t.esdeveniment_id != null && evenimentIds.includes(t.esdeveniment_id))
      return matchCompte && matchCat && matchEsdev
    })
  }, [transactionsActual, compteIds, categoriaIds, evenimentIds])

  if (isLoading) {
    return <LoadingSpinner label="Analitzant períodes…" />
  }

  return (
    <>
      {/* ── Mobile view (hidden on md+) ─────────────────────────────────── */}
      <div className="md:hidden">
        <MobileAnalysisView
          actualStats={actualStats}
          anteriorStats={anteriorStats}
          categoryComparison={categoryComparison}
          filteredActual={filteredActual}
          categories={categories}
          accounts={accounts}
          events={events}
          availablePeriods={availablePeriods}
          periode={periode}
        />
      </div>

      {/* ── Desktop view (hidden on mobile) ────────────────────────────── */}
      <div className="hidden md:block space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Finances personals
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Anàlisi de Dades
          </h1>
        </div>

        <AnalysisFilters
          accounts={accounts}
          categories={categories}
          events={events}
          availablePeriods={availablePeriods}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resum">Resum</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
            <TabsTrigger value="recurrents">Recurrents</TabsTrigger>
          </TabsList>

          <TabsContent value="resum" className="mt-6">
            <ResumTab stats={actualStats} categories={categories} transactions={filteredActual} />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <CategoriesTab
              categoryData={actualStats.categoryData}
              incomeCategoryData={actualStats.incomeCategoryData}
              totalDespeses={actualStats.despeses}
              totalIngressos={actualStats.ingressos}
              categories={categories}
            />
          </TabsContent>

          <TabsContent value="comparativa" className="mt-6">
            <ComparativaTab
              actualStats={actualStats}
              anteriorStats={anteriorStats}
              categoryComparison={categoryComparison}
              periode={periode}
              availablePeriods={availablePeriods}
            />
          </TabsContent>

          <TabsContent value="recurrents" className="mt-6">
            <RecurrentsTab transactions={filteredActual} totalDespeses={actualStats.despeses} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyStats(): PeriodStats {
  return {
    ingressos: 0,
    despeses: 0,
    estalvi: 0,
    taxaEstalvi: 0,
    dailyData: [],
    categoryData: [],
    incomeCategoryData: [],
  }
}

function processTransactions(
  transactions: TransactionWithRelations[],
  periode: { mes: number; any: number } | null,
  compteIds: string[],
  categoriaIds: string[],
  evenimentIds: string[] = [],
  periodeMode: "mes" | "any" | "alltime" = "mes",
): PeriodStats {
  if (!periode && periodeMode !== "alltime") return emptyStats()

  let filtered = transactions
  if (compteIds.length > 0) {
    filtered = filtered.filter(t => compteIds.includes(t.compte_id ?? ""))
  }
  if (categoriaIds.length > 0) {
    filtered = filtered.filter(
      t => t.categoria_id != null && categoriaIds.includes(t.categoria_id),
    )
  }
  if (evenimentIds.length > 0) {
    filtered = filtered.filter(
      t => t.esdeveniment_id != null && evenimentIds.includes(t.esdeveniment_id),
    )
  }

  let ingressos = 0
  let despeses = 0

  // Build time buckets
  const dailyMap: Record<number, { dia: number; ingressos: number; despeses: number }> = {}
  if (periodeMode === "any") {
    for (let i = 1; i <= 12; i++) dailyMap[i] = { dia: i, ingressos: 0, despeses: 0 }
  } else if (periodeMode === "mes" && periode) {
    const diesMes = new Date(periode.any, periode.mes, 0).getDate()
    for (let i = 1; i <= diesMes; i++) dailyMap[i] = { dia: i, ingressos: 0, despeses: 0 }
  }
  // alltime: populated dynamically per year below

  const categoryMap: Record<string, { name: string; value: number; color: string; categoriaId: string | null; evenimentId: string | null }> = {}
  const incomeCatMap: Record<string, { name: string; value: number; color: string; categoriaId: string | null; evenimentId: string | null }> = {}

  for (const t of filtered) {
    const txDate = new Date(t.data)
    const dia = periodeMode === "any"
      ? txDate.getMonth() + 1
      : periodeMode === "alltime"
        ? txDate.getFullYear()
        : txDate.getDate()

    if (periodeMode === "alltime" && !dailyMap[dia]) {
      dailyMap[dia] = { dia, ingressos: 0, despeses: 0 }
    }

    if (t.tipus === "ingres") {
      ingressos += t.import_trs
      if (dailyMap[dia]) dailyMap[dia].ingressos += t.import_trs

      const isEvent = !!t.esdeveniment_id
      const mapKey = isEvent ? `__esdev__${t.esdeveniment_id}` : (t.categoria_nom ?? "Sense categoria")
      const groupName = isEvent ? (t.esdeveniment_nom ?? "Sense nom") : (t.categoria_nom ?? "Sense categoria")
      if (!incomeCatMap[mapKey]) {
        incomeCatMap[mapKey] = {
          name: groupName,
          value: 0,
          color: isEvent ? eventColor(t.esdeveniment_id!) : (t.categoria_color ?? "#10b981"),
          categoriaId: isEvent ? null : (t.categoria_id ?? null),
          evenimentId: t.esdeveniment_id ?? null,
        }
      }
      incomeCatMap[mapKey].value += t.import_trs
    } else if (t.tipus === "despesa") {
      const net = t.import_trs - (t.total_deutes ?? 0)
      despeses += net
      if (dailyMap[dia]) dailyMap[dia].despeses += net

      const isEvent = !!t.esdeveniment_id
      const mapKey = isEvent ? `__esdev__${t.esdeveniment_id}` : (t.categoria_nom ?? "Sense categoria")
      const groupName = isEvent ? (t.esdeveniment_nom ?? "Sense nom") : (t.categoria_nom ?? "Sense categoria")
      if (!categoryMap[mapKey]) {
        categoryMap[mapKey] = {
          name: groupName,
          value: 0,
          color: isEvent ? eventColor(t.esdeveniment_id!) : (t.categoria_color ?? "#ccc"),
          categoriaId: isEvent ? null : (t.categoria_id ?? null),
          evenimentId: t.esdeveniment_id ?? null,
        }
      }
      categoryMap[mapKey].value += net
    }
  }

  const estalvi = ingressos - despeses
  const taxaEstalvi = ingressos > 0 ? (estalvi / ingressos) * 100 : 0

  return {
    ingressos,
    despeses,
    estalvi,
    taxaEstalvi,
    dailyData: Object.values(dailyMap).sort((a, b) => a.dia - b.dia),
    categoryData: Object.values(categoryMap).sort((a, b) => b.value - a.value),
    incomeCategoryData: Object.values(incomeCatMap).sort((a, b) => b.value - a.value),
  }
}

function buildCategoryComparison(
  actual: PeriodStats["categoryData"],
  anterior: PeriodStats["categoryData"],
): CategoryComparisonItem[] {
  const map: Record<string, CategoryComparisonItem> = {}

  for (const c of actual) {
    map[c.name] = { nom: c.name, color: c.color, actual: c.value, anterior: 0 }
  }
  for (const c of anterior) {
    if (!map[c.name]) map[c.name] = { nom: c.name, color: c.color, actual: 0, anterior: 0 }
    map[c.name].anterior = c.value
  }

  return Object.values(map).sort((a, b) => b.actual - a.actual)
}
