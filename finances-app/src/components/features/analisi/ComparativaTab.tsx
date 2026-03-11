import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { useFilterStore } from "@/store/filterStore"
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatEuros } from "@/lib/utils"
import { ColorDot } from "@/components/shared/ColorDot"
import type { PeriodStats } from "./ResumTab"

export interface CategoryComparisonItem {
  nom: string
  color: string
  actual: number
  anterior: number
}

interface Props {
  actualStats: PeriodStats
  anteriorStats: PeriodStats
  categoryComparison: CategoryComparisonItem[]
  periode: { mes: number; any: number } | null
  availablePeriods: { mes: number; any: number }[]
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
  if (anterior === 0) return <span className="text-sm text-muted-foreground">N/A</span>
  const diff = ((actual - anterior) / anterior) * 100
  const isPositive = diff > 0
  const isGood = invertit ? !isPositive : isPositive
  return (
    <div
      className={`flex items-center gap-1 text-sm font-semibold ${isGood ? "text-green-500" : "text-red-500"}`}
    >
      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

function shortEuros(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`
  return `${v.toFixed(0)}€`
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
  const d = new Date(p.any, p.mes - 1, 1)
  return d.toLocaleDateString("ca-ES", { month: "short", year: "numeric" })
}

export function ComparativaTab({ actualStats, anteriorStats, categoryComparison, periode, availablePeriods }: Props) {
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
    const monthsInYear = availablePeriods
      .filter(p => p.any === newYear)
      .map(p => p.mes)
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

  const overlaidData = actualStats.dailyData.map((d, i) => ({
    dia: d.dia,
    ingressosActual: d.ingressos,
    despesesActual: d.despeses,
    ingressosAnterior: anteriorStats.dailyData[i]?.ingressos ?? 0,
    despesesAnterior: anteriorStats.dailyData[i]?.despeses ?? 0,
  }))

  const catBarData = categoryComparison.slice(0, 8).map(c => ({
    name: c.nom.length > 14 ? c.nom.slice(0, 14) + "…" : c.nom,
    actual: c.actual,
    anterior: c.anterior,
    color: c.color,
  }))

  return (
    <div className="space-y-6">
      {/* Comparison period selector */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Comparant
            <span className="font-bold text-foreground">{actualLabel}</span>
            amb:
          </div>
          {/* Month — hidden in year mode */}
          {periodeMode === "mes" && (
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setPeriodeAnterior({ mes: Number(v), any: selectedYear })}
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
          {/* Year */}
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
        </CardContent>
      </Card>

      {/* 3 KPI comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingressos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {formatEuros(actualStats.ingressos)}
                </div>
                <p className="text-sm text-muted-foreground italic mt-1">
                  vs. {formatEuros(anteriorStats.ingressos)}
                  <span className="ml-1 not-italic text-xs opacity-70">({anteriorLabel})</span>
                </p>
              </div>
              <PctBadge actual={actualStats.ingressos} anterior={anteriorStats.ingressos} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despeses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-red-500">
                  {formatEuros(actualStats.despeses)}
                </div>
                <p className="text-sm text-muted-foreground italic mt-1">
                  vs. {formatEuros(anteriorStats.despeses)}
                  <span className="ml-1 not-italic text-xs opacity-70">({anteriorLabel})</span>
                </p>
              </div>
              <PctBadge actual={actualStats.despeses} anterior={anteriorStats.despeses} invertit />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa d&apos;Estalvi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div
                  className={`text-3xl font-bold ${actualStats.taxaEstalvi >= 0 ? "text-primary" : "text-red-500"}`}
                >
                  {actualStats.taxaEstalvi.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground italic mt-1">
                  vs. {anteriorStats.taxaEstalvi.toFixed(1)}%
                  <span className="ml-1 not-italic text-xs opacity-70">({anteriorLabel})</span>
                </p>
              </div>
              <PctBadge actual={actualStats.taxaEstalvi} anterior={anteriorStats.taxaEstalvi} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overlaid daily line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolució Diària Comparativa</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overlaidData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" fontSize={13} />
              <YAxis fontSize={13} tickFormatter={shortEuros} width={56} />
              <Tooltip formatter={(v) => formatEuros(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line
                type="monotone"
                dataKey="ingressosActual"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name={`Ingressos (${actualLabel})`}
              />
              <Line
                type="monotone"
                dataKey="despesesActual"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name={`Despeses (${actualLabel})`}
              />
              <Line
                type="monotone"
                dataKey="ingressosAnterior"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={`Ingressos (${anteriorLabel})`}
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="despesesAnterior"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={`Despeses (${anteriorLabel})`}
                opacity={0.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grouped horizontal bar */}
      {catBarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativa per Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBarData} layout="vertical" margin={{ left: 100, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={13} tickFormatter={shortEuros} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip
                  formatter={(v, name) => [
                    formatEuros(Number(v)),
                    name === "actual" ? actualLabel : anteriorLabel,
                  ]}
                />
                <Legend
                  formatter={(v) => (v === "actual" ? actualLabel : anteriorLabel)}
                  wrapperStyle={{ fontSize: 13 }}
                />
                <Bar dataKey="actual" radius={[0, 3, 3, 0]}>
                  {catBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="anterior" radius={[0, 3, 3, 0]} opacity={0.35}>
                  {catBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Full category comparison table */}
      {categoryComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detall per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 font-semibold text-muted-foreground">
                      Categoria
                    </th>
                    <th className="text-right py-2.5 font-semibold text-muted-foreground">
                      {actualLabel}
                    </th>
                    <th className="text-right py-2.5 font-semibold text-muted-foreground">
                      {anteriorLabel}
                    </th>
                    <th className="text-right py-2.5 font-semibold text-muted-foreground">
                      Variació
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryComparison.map(cat => (
                    <tr
                      key={cat.nom}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <ColorDot color={cat.color} />
                          <span className="font-semibold">{cat.nom}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 font-mono font-semibold text-base">
                        {formatEuros(cat.actual)}
                      </td>
                      <td className="text-right py-3 font-mono text-muted-foreground text-base">
                        {formatEuros(cat.anterior)}
                      </td>
                      <td className="text-right py-3">
                        <div className="flex justify-end">
                          <PctBadge actual={cat.actual} anterior={cat.anterior} invertit />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
