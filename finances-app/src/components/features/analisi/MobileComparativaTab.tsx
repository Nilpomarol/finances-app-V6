import { useMemo } from "react"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFilterStore } from "@/store/filterStore"
import { formatEuros } from "@/lib/utils"
import { ColorDot } from "@/components/shared/ColorDot"
import type { PeriodStats } from "./ResumTab"
import type { CategoryComparisonItem } from "./ComparativaTab"

interface Props {
  actualStats: PeriodStats
  anteriorStats: PeriodStats
  categoryComparison: CategoryComparisonItem[]
  periode: { mes: number; any: number } | null
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

function periodLabel(p: { mes: number; any: number } | null) {
  if (!p) return "—"
  return new Date(p.any, p.mes - 1, 1).toLocaleDateString("ca-ES", { month: "short", year: "numeric" })
}

function PctBadge({
  actual,
  anterior,
  invertit = false,
}: {
  actual: number
  anterior: number
  invertit?: boolean
}) {
  if (anterior === 0) return <span className="text-xs text-muted-foreground">N/A</span>
  const diff = ((actual - anterior) / anterior) * 100
  const isPositive = diff > 0
  const isGood = invertit ? !isPositive : isPositive
  return (
    <div className={`flex items-center gap-0.5 text-xs font-bold ${isGood ? "text-green-500" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

export function MobileComparativaTab({
  actualStats,
  anteriorStats,
  categoryComparison,
  periode,
  availablePeriods,
}: Props) {
  const { periodeAnterior, periodeMode, setPeriodeAnterior } = useFilterStore()

  const selectedYear = periodeAnterior?.any ?? new Date().getFullYear()
  const selectedMonth = periodeAnterior?.mes ?? new Date().getMonth() + 1

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
    if (periodeMode === "any") {
      setPeriodeAnterior({ mes: 1, any: newYear })
      return
    }
    const monthsInYear = availablePeriods.filter(p => p.any === newYear).map(p => p.mes)
    const newMonth =
      monthsInYear.length === 0 || monthsInYear.includes(selectedMonth)
        ? selectedMonth
        : monthsInYear[0]
    setPeriodeAnterior({ mes: newMonth, any: newYear })
  }

  const actualLabel = periodeMode === "any"
    ? String(periode?.any ?? "")
    : periodLabel(periode)
  const anteriorLabel = periodeMode === "any"
    ? String(periodeAnterior?.any ?? "")
    : periodLabel(periodeAnterior)

  const kpis = [
    {
      label: "Ingressos",
      actual: actualStats.ingressos,
      anterior: anteriorStats.ingressos,
      colorClass: "text-green-600",
      invertit: false,
      isPercent: false,
    },
    {
      label: "Despeses",
      actual: actualStats.despeses,
      anterior: anteriorStats.despeses,
      colorClass: "text-red-500",
      invertit: true,
      isPercent: false,
    },
    {
      label: "Taxa d'Estalvi",
      actual: actualStats.taxaEstalvi,
      anterior: anteriorStats.taxaEstalvi,
      colorClass: actualStats.taxaEstalvi >= 0 ? "text-primary" : "text-red-500",
      invertit: false,
      isPercent: true,
    },
  ]

  return (
    <div className="space-y-4">

      {/* Period selector */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-bold text-foreground">{actualLabel}</span>
              vs:
            </div>
            {periodeMode === "mes" && (
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setPeriodeAnterior({ mes: Number(v), any: selectedYear })}
              >
                <SelectTrigger className="w-[110px] bg-background h-8 text-xs capitalize">
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
            <Select value={String(selectedYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[80px] bg-background h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI comparison cards — stacked */}
      <div className="space-y-3">
        {kpis.map(item => (
          <Card key={item.label}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${item.colorClass}`}>
                    {item.isPercent
                      ? `${item.actual.toFixed(1)}%`
                      : formatEuros(item.actual)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    vs.{" "}
                    {item.isPercent
                      ? `${item.anterior.toFixed(1)}%`
                      : formatEuros(item.anterior)}
                    <span className="ml-1 opacity-60">({anteriorLabel})</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <PctBadge actual={item.actual} anterior={item.anterior} invertit={item.invertit} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category comparison list — no charts, just rows */}
      {categoryComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Per Categoria</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 divide-y">
            {categoryComparison.map(cat => (
              <div key={cat.nom} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ColorDot color={cat.color} />
                  <span className="text-sm font-medium truncate">{cat.nom}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{formatEuros(cat.actual)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatEuros(cat.anterior)}</p>
                  </div>
                  <PctBadge actual={cat.actual} anterior={cat.anterior} invertit />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
