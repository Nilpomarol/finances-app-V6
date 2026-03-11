import { useMemo, useState } from "react"
import { useFilterStore } from "@/store/filterStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEuros, cn } from "@/lib/utils"
import type { Category } from "@/types/database"
import type { PeriodStats } from "./ResumTab"

interface Props {
  stats: PeriodStats
  categories: Category[]
}

export function MobileResumTab({ stats, categories }: Props) {
  const { ingressos, despeses, estalvi, taxaEstalvi, dailyData, categoryData, incomeCategoryData } = stats
  const { periodeMode, yearDisplayMode } = useFilterStore()
  const [catTab, setCatTab] = useState<"despeses" | "ingressos">("despeses")

  const activeMonths = useMemo(() => {
    if (periodeMode !== "any") return 1
    const count = dailyData.filter(d => d.ingressos > 0 || d.despeses > 0).length
    return count > 0 ? count : 1
  }, [dailyData, periodeMode])

  const divisor = periodeMode === "any" && yearDisplayMode === "mitja" ? activeMonths : 1

  const budgetCategories = useMemo(() => {
    const budgetMap = new Map(categories.map(c => [c.nom, c.pressupost_mensual]))
    return categoryData
      .map(cd => ({ ...cd, budget: budgetMap.get(cd.name) ?? null }))
      .filter(c => c.budget !== null && c.budget > 0)
  }, [categoryData, categories])

  return (
    <div className="space-y-4">

      {/* KPI summary card — 2×2 grid with internal dividers */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2">
          <div className="p-4 border-b border-r">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Ingressos
            </p>
            <p className="text-2xl font-bold text-green-600 tabular-nums leading-none">
              {formatEuros(ingressos / divisor)}
            </p>
          </div>
          <div className="p-4 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Despeses
            </p>
            <p className="text-2xl font-bold text-red-500 tabular-nums leading-none">
              {formatEuros(despeses / divisor)}
            </p>
          </div>
          <div className="p-4 border-r">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Flux Net
            </p>
            <p className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              (estalvi / divisor) >= 0 ? "text-primary" : "text-red-500",
            )}>
              {formatEuros(estalvi / divisor)}
            </p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Taxa Estalvi
            </p>
            <p className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              taxaEstalvi >= 0 ? "text-primary" : "text-red-500",
            )}>
              {taxaEstalvi.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* All categories with Despeses / Ingressos toggle */}
      {(categoryData.length > 0 || incomeCategoryData.length > 0) && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Categories</CardTitle>
              <div className="flex items-center bg-muted border rounded-lg p-0.5">
                {(["despeses", "ingressos"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setCatTab(t)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                      catTab === t
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "despeses" ? "Despeses" : "Ingressos"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {(() => {
              const data = catTab === "despeses" ? categoryData : incomeCategoryData
              const total = catTab === "despeses" ? despeses / divisor : ingressos / divisor
              if (data.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Cap {catTab === "despeses" ? "despesa" : "ingrés"} registrat.
                  </p>
                )
              }
              return data.map(cat => {
                const displayValue = cat.value / divisor
                const pct = total > 0 ? (displayValue / total) * 100 : 0
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-bold tabular-nums">{formatEuros(displayValue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </CardContent>
        </Card>
      )}

      {/* Budget categories */}
      {budgetCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Pressupost</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {budgetCategories.map(cat => {
              const spendDisplay = cat.value / divisor
              const budgetDisplay = (cat.budget! * activeMonths) / divisor
              const pct = Math.min((spendDisplay / budgetDisplay) * 100, 100)
              const isOver = spendDisplay > budgetDisplay
              const remaining = budgetDisplay - spendDisplay
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                    <span className={isOver ? "text-red-500 font-bold" : "text-muted-foreground"}>
                      {formatEuros(spendDisplay)} / {formatEuros(budgetDisplay)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : ""}`}
                      style={{ width: `${pct}%`, backgroundColor: isOver ? undefined : cat.color }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {pct.toFixed(0)}%{" "}
                    {isOver
                      ? `(superat per ${formatEuros(Math.abs(remaining))})`
                      : `(${formatEuros(remaining)} restants)`}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
