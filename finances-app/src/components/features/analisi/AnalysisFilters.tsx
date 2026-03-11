import { useMemo } from "react"
import { FilterX } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFilterStore } from "@/store/filterStore"
import { cn } from "@/lib/utils"
import type { Account, Category, Event } from "@/types/database"

interface Props {
  accounts: Account[]
  categories: Category[]
  events: Event[]
  availablePeriods: { mes: number; any: number }[]
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleDateString("ca-ES", { month: "long" }),
}))

const currentYear = new Date().getFullYear()
const ALL_YEARS = Array.from({ length: currentYear - 2009 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}))

export function AnalysisFilters({ accounts, categories, events, availablePeriods }: Props) {
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

  // Derive available years and months from availablePeriods (fall back to all if not yet loaded)
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
    // If current month isn't available in the new year, pick the first available month
    const monthsInYear = availablePeriods
      .filter(p => p.any === newYear)
      .map(p => p.mes)
    const newMonth =
      monthsInYear.length === 0 || monthsInYear.includes(selectedMonth)
        ? selectedMonth
        : monthsInYear[0]
    setPeriode({ mes: newMonth, any: newYear })
  }

  return (
    <Card className="bg-muted/30 border-none shadow-none p-4 flex flex-wrap gap-3 items-center">
      {/* Mode toggle: Mes / Any / Sempre */}
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

      {/* Month — hidden in year/alltime mode */}
      {periodeMode === "mes" && (
      <Select
        value={String(selectedMonth)}
        onValueChange={(v) => setPeriode({ mes: Number(v), any: selectedYear })}
      >
        <SelectTrigger className="w-[140px] bg-background capitalize">
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

      {/* Year — hidden in alltime mode */}
      {periodeMode !== "alltime" && (
      <Select value={String(selectedYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[90px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y.value} value={y.value}>
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      )}

      {/* Account */}
      <Select
        value={compteIds[0] || "all"}
        onValueChange={(v) => setCompteIds(v === "all" ? [] : [v])}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Tots els comptes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tots els comptes</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category */}
      <Select
        value={categoriaIds[0] || "all"}
        onValueChange={(v) => setCategoriaIds(v === "all" ? [] : [v])}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Totes les categories" />
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

      {/* Event */}
      {events.length > 0 && (
        <Select
          value={evenimentIds[0] || "all"}
          onValueChange={(v) => setEvenimentIds(v === "all" ? [] : [v])}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Tots els esdeveniments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tots els esdeveniments</SelectItem>
            {events.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={resetFilters}
        className="ml-auto text-muted-foreground"
      >
        <FilterX className="w-4 h-4 mr-2" /> Restablir
      </Button>

      {/* Total / Mitja mensual toggle — only in year mode */}
      {periodeMode === "any" && (
        <div className="flex rounded-md border border-input bg-background overflow-hidden shrink-0">
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
    </Card>
  )
}
