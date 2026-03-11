import { useMemo, useState } from "react"
import { ArrowUpCircle, ArrowDownCircle, Scale, PiggyBank } from "lucide-react"
import { useFilterStore } from "@/store/filterStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/shared/KpiCard"
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { formatEuros, cn } from "@/lib/utils"
import TransactionTable from "@/components/features/transaccions/TransactionTable"
import type { Category, TransactionWithRelations } from "@/types/database"

// ─── Shared types (imported by page + other tabs) ───────────────────────────

export interface CategoryDataItem {
  name: string
  value: number
  color: string
  categoriaId: string | null
  evenimentId?: string | null
}

export interface PeriodStats {
  ingressos: number
  despeses: number
  estalvi: number
  taxaEstalvi: number
  dailyData: { dia: number; ingressos: number; despeses: number }[]
  categoryData: CategoryDataItem[]       // expense categories
  incomeCategoryData: CategoryDataItem[] // income categories
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  stats: PeriodStats
  categories: Category[]
  transactions: TransactionWithRelations[]
}

function shortEuros(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`
  return `${v.toFixed(0)}€`
}

function CustomTooltip({ active, payload, label, periodeMode }: any) {
  if (!active || !payload?.length) return null
  const headerLabel =
    periodeMode === "any"
      ? (MONTH_ABBR[Number(label) - 1] ?? label)
      : periodeMode === "alltime"
        ? String(label)
        : `Dia ${label}`
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1.5 text-foreground">{headerLabel}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <span className="font-bold tabular-nums">{formatEuros(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  )
}

const PAGE_SIZE = 25

const MONTH_ABBR = ["Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Des"]

export function ResumTab({ stats, categories, transactions }: Props) {
  const { ingressos, despeses, estalvi, taxaEstalvi, dailyData, categoryData, incomeCategoryData } = stats
  const { periodeMode, yearDisplayMode } = useFilterStore()
  const [page, setPage] = useState(0)
  const [catTab, setCatTab] = useState<"despeses" | "ingressos">("despeses")

  // Number of months that actually have data (used for monthly average in year mode)
  const activeMonths = useMemo(() => {
    if (periodeMode !== "any") return 1
    const count = dailyData.filter(d => d.ingressos > 0 || d.despeses > 0).length
    return count > 0 ? count : 1
  }, [dailyData, periodeMode])

  const divisor = periodeMode === "any" && yearDisplayMode === "mitja" ? activeMonths : 1

  const ingressosDisplay = ingressos / divisor
  const despesesDisplay = despeses / divisor
  const estalviDisplay = estalvi / divisor

  const categoryWithBudget = useMemo(() => {
    const budgetMap = new Map(categories.map(c => [c.nom, c.pressupost_mensual]))
    return categoryData.map(cd => ({
      ...cd,
      budget: budgetMap.get(cd.name) ?? null,
    }))
  }, [categoryData, categories])

  const budgetCategories = categoryWithBudget.filter(c => c.budget !== null && c.budget > 0)

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.data - a.data),
    [transactions],
  )
  const totalPages = Math.ceil(sortedTransactions.length / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* KPI header row: cards + optional avg toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
        <KpiCard
          title="Ingressos"
          icon={<ArrowUpCircle className="w-5 h-5 text-emerald-600" />}
          value={<span className="text-2xl font-bold text-emerald-600">{formatEuros(ingressosDisplay)}</span>}
        />
        <KpiCard
          title="Despeses"
          icon={<ArrowDownCircle className="w-5 h-5 text-rose-500" />}
          value={<span className="text-2xl font-bold text-rose-500">{formatEuros(despesesDisplay)}</span>}
        />
        <KpiCard
          title="Flux Net"
          icon={<Scale className="w-5 h-5 text-muted-foreground" />}
          value={
            <span className={`text-2xl font-bold ${estalviDisplay >= 0 ? "text-primary" : "text-rose-500"}`}>
              {formatEuros(estalviDisplay)}
            </span>
          }
        />
        <KpiCard
          title="Taxa d'Estalvi"
          icon={<PiggyBank className="w-5 h-5 text-muted-foreground" />}
          value={
            <span className={`text-2xl font-bold ${taxaEstalvi >= 0 ? "text-primary" : "text-red-500"}`}>
              {taxaEstalvi.toFixed(1)}%
            </span>
          }
        />
        </div>

      </div>

      {/* Area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {periodeMode === "any" ? "Evolució Mensual" : periodeMode === "alltime" ? "Evolució Anual" : "Evolució Diària"}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gradIngressos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDespeses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dia"
                fontSize={13}
                tickFormatter={
                  periodeMode === "any"
                    ? (v) => MONTH_ABBR[v - 1] ?? v
                    : periodeMode === "alltime"
                      ? (v) => String(v)
                      : undefined
                }
              />
              <YAxis fontSize={13} tickFormatter={shortEuros} width={56} />
              <Tooltip content={<CustomTooltip periodeMode={periodeMode} />} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Area
                type="monotone"
                dataKey="ingressos"
                stroke="#10b981"
                fill="url(#gradIngressos)"
                strokeWidth={2}
                dot={false}
                name="Ingressos"
              />
              <Area
                type="monotone"
                dataKey="despeses"
                stroke="#ef4444"
                fill="url(#gradDespeses)"
                strokeWidth={2}
                dot={false}
                name="Despeses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Categories + Transactions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left 1/3: Top Categories + Budget bars */}
        <div className="space-y-6">
          {(categoryData.length > 0 || incomeCategoryData.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Categories</CardTitle>
                  <div className="flex items-center bg-muted border rounded-lg p-0.5">
                    {(["despeses", "ingressos"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setCatTab(t)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold transition-all",
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
              <CardContent className="space-y-4">
                {(() => {
                  const data = catTab === "despeses" ? categoryData : incomeCategoryData
                  const total = catTab === "despeses" ? despesesDisplay : ingressosDisplay
                  if (data.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Cap {catTab === "despeses" ? "despesa" : "ingrés"} registrat.
                      </p>
                    )
                  }
                  return data.map(cat => {
                    const displayValue = cat.value / divisor
                    const pct = total > 0 ? (displayValue / total) * 100 : 0
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-1 h-5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-semibold truncate">{cat.name}</span>
                          </div>
                          <span className="text-sm font-bold tabular-nums shrink-0">
                            {formatEuros(displayValue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: cat.color }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground w-9 text-right shrink-0 tabular-nums">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </CardContent>
            </Card>
          )}

          {budgetCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pressupost per Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {budgetCategories.map(cat => {
                  // Scale both spend and budget to the same period:
                  // total mode → yearly spend vs projected yearly budget (monthly × activeMonths)
                  // mitja mode → monthly avg vs monthly budget
                  // mes mode  → monthly spend vs monthly budget
                  const spendDisplay = cat.value / divisor
                  const budgetDisplay = cat.budget! * activeMonths / divisor
                  const pct = Math.min((spendDisplay / budgetDisplay) * 100, 100)
                  const isOver = spendDisplay > budgetDisplay
                  const remaining = budgetDisplay - spendDisplay
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                        <span className={isOver ? "text-red-500 font-bold" : "text-muted-foreground"}>
                          {formatEuros(spendDisplay)}{" "}
                          <span className="opacity-50">/</span>{" "}
                          {formatEuros(budgetDisplay)}
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

        {/* Right 2/3: Transaction table */}
        <div className="lg:col-span-2">
          <TransactionTable
            transactions={sortedTransactions}
            page={page}
            totalPages={totalPages}
            totalCount={sortedTransactions.length}
            onPageChange={setPage}
            showAccount
            showCategory
          />
        </div>
      </div>
    </div>
  )
}
