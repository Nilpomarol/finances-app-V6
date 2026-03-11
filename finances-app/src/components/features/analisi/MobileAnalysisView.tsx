import { useState, useMemo } from "react"
import { FilterX, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFilterStore } from "@/store/filterStore"
import { cn } from "@/lib/utils"
import { MobileResumTab } from "./MobileResumTab"
import { MobileCategoriesTab } from "./MobileCategoriesTab"
import { MobileComparativaTab } from "./MobileComparativaTab"
import { RecurrentsTab } from "./RecurrentsTab"
import type { Account, Category, Event, TransactionWithRelations } from "@/types/database"
import type { PeriodStats } from "./ResumTab"
import type { CategoryComparisonItem } from "./ComparativaTab"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  actualStats: PeriodStats
  anteriorStats: PeriodStats
  categoryComparison: CategoryComparisonItem[]
  filteredActual: TransactionWithRelations[]
  categories: Category[]
  accounts: Account[]
  events: Event[]
  availablePeriods: { mes: number; any: number }[]
  periode: { mes: number; any: number } | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleDateString("ca-ES", { month: "long" }),
}))

const currentYear = new Date().getFullYear()
const ALL_YEARS = Array.from({ length: currentYear - 2009 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}))

const TABS = [
  { id: "resum", label: "Resum" },
  { id: "categories", label: "Categories" },
  { id: "comparativa", label: "Compar." },
  { id: "recurrents", label: "Fixes" },
] as const

type TabId = (typeof TABS)[number]["id"]

// ─── Mobile Filters ──────────────────────────────────────────────────────────

function MobileFilters({
  accounts,
  categories,
  events,
  availablePeriods,
}: {
  accounts: Account[]
  categories: Category[]
  events: Event[]
  availablePeriods: { mes: number; any: number }[]
}) {
  const {
    periode,
    periodeMode,
    yearDisplayMode,
    compteIds,
    categoriaIds,
    evenimentIds,
    setPeriode,
    setPeriodeMode,
    setYearDisplayMode,
    setCompteIds,
    setCategoriaIds,
    setEvenimentIds,
    resetFilters,
  } = useFilterStore()

  const selectedYear = periode?.any ?? new Date().getFullYear()
  const selectedMonth = periode?.mes ?? new Date().getMonth() + 1

  const availableYears = useMemo(() => {
    if (availablePeriods.length === 0) return ALL_YEARS
    const yearSet = new Set(availablePeriods.map(p => p.any))
    return ALL_YEARS.filter(y => yearSet.has(Number(y.value)))
  }, [availablePeriods])

  const availableMonths = useMemo(() => {
    if (availablePeriods.length === 0) return ALL_MONTHS
    const monthSet = new Set(
      availablePeriods.filter(p => p.any === selectedYear).map(p => p.mes),
    )
    return ALL_MONTHS.filter(m => monthSet.has(Number(m.value)))
  }, [availablePeriods, selectedYear])

  function handleYearChange(v: string) {
    const newYear = Number(v)
    const monthsInYear = availablePeriods.filter(p => p.any === newYear).map(p => p.mes)
    const newMonth =
      monthsInYear.length === 0 || monthsInYear.includes(selectedMonth)
        ? selectedMonth
        : monthsInYear[0]
    setPeriode({ mes: newMonth, any: newYear })
  }

  const hasActiveFilters = compteIds.length > 0 || categoriaIds.length > 0 || evenimentIds.length > 0
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="space-y-2">

      {/* Row 1: period mode + period selectors + filter toggle + reset */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-input bg-background overflow-hidden shrink-0">
          <button
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              periodeMode === "mes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setPeriodeMode("mes")}
          >
            Mes
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-sm font-medium border-l border-input transition-colors",
              periodeMode === "any"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setPeriodeMode("any")}
          >
            Any
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-sm font-medium border-l border-input transition-colors",
              periodeMode === "alltime"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setPeriodeMode("alltime")}
          >
            Sempre
          </button>
        </div>

        {periodeMode === "mes" && (
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setPeriode({ mes: Number(v), any: selectedYear })}
          >
            <SelectTrigger className="w-[120px] bg-background capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {periodeMode !== "alltime" && (
        <Select value={String(selectedYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[80px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={cn(
              "p-1.5 rounded-md transition-colors relative",
              filtersOpen || hasActiveFilters
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="Filtres addicionals"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
          <button
            onClick={resetFilters}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              hasActiveFilters
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="Restablir filtres"
          >
            <FilterX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Collapsible: account + category + events */}
      {filtersOpen && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={compteIds[0] || "all"}
              onValueChange={(v) => setCompteIds(v === "all" ? [] : [v])}
            >
              <SelectTrigger className="flex-1 bg-background text-xs min-w-0">
                <SelectValue placeholder="Tots els comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els comptes</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoriaIds[0] || "all"}
              onValueChange={(v) => setCategoriaIds(v === "all" ? [] : [v])}
            >
              <SelectTrigger className="flex-1 bg-background text-xs min-w-0">
                <SelectValue placeholder="Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Totes les categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {events.length > 0 && (
            <Select
              value={evenimentIds[0] || "all"}
              onValueChange={(v) => setEvenimentIds(v === "all" ? [] : [v])}
            >
              <SelectTrigger className="w-full bg-background text-xs">
                <SelectValue placeholder="Tots els esdeveniments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els esdeveniments</SelectItem>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Row (year mode): Total / Mitja toggle */}
      {periodeMode === "any" && (
        <div className="flex rounded-md border border-input bg-background overflow-hidden w-fit">
          <button
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              yearDisplayMode === "total"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setYearDisplayMode("total")}
          >
            Total
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-sm font-medium border-l border-input transition-colors",
              yearDisplayMode === "mitja"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setYearDisplayMode("mitja")}
          >
            Mitja mensual
          </button>
        </div>
      )}

    </div>
  )
}

// ─── Main mobile view ────────────────────────────────────────────────────────

export function MobileAnalysisView({
  actualStats,
  anteriorStats,
  categoryComparison,
  filteredActual,
  categories,
  accounts,
  events,
  availablePeriods,
  periode,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("resum")

  return (
    <div className="space-y-4">

      <h1 className="text-xl font-bold">Anàlisi</h1>

      <MobileFilters
        accounts={accounts}
        categories={categories}
        events={events}
        availablePeriods={availablePeriods}
      />

      {/* Scrollable tab bar */}
      <div
        className="flex border-b overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-6">
        {activeTab === "resum" && (
          <MobileResumTab stats={actualStats} categories={categories} />
        )}
        {activeTab === "categories" && (
          <MobileCategoriesTab
            categoryData={actualStats.categoryData}
            incomeCategoryData={actualStats.incomeCategoryData}
            totalDespeses={actualStats.despeses}
            totalIngressos={actualStats.ingressos}
          />
        )}
        {activeTab === "comparativa" && (
          <MobileComparativaTab
            actualStats={actualStats}
            anteriorStats={anteriorStats}
            categoryComparison={categoryComparison}
            periode={periode}
            availablePeriods={availablePeriods}
          />
        )}
        {activeTab === "recurrents" && (
          <RecurrentsTab
            transactions={filteredActual}
            totalDespeses={actualStats.despeses}
          />
        )}
      </div>

    </div>
  )
}
