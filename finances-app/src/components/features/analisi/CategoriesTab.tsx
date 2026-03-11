import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend, Treemap,
} from "recharts"
import { formatEuros } from "@/lib/utils"
import { ColorDot } from "@/components/shared/ColorDot"
import { cn } from "@/lib/utils"
import type { CategoryDataItem } from "./ResumTab"
import type { Category } from "@/types/database"

interface Props {
  categoryData: CategoryDataItem[]
  incomeCategoryData: CategoryDataItem[]
  totalDespeses: number
  totalIngressos: number
  categories: Category[]
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, value, color, depth } = props
  if (depth === 0 || !width || !height || width < 20 || height < 15) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={3} opacity={0.85} />
      {width > 55 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            opacity={0.9}
          >
            {formatEuros(value)}
          </text>
        </>
      )}
    </g>
  )
}

export function CategoriesTab({
  categoryData,
  incomeCategoryData,
  totalDespeses,
  totalIngressos,
  categories,
}: Props) {
  const [tab, setTab] = useState<"despeses" | "ingressos">("despeses")

  const isDespeses = tab === "despeses"
  const data = isDespeses ? categoryData : incomeCategoryData
  const total = isDespeses ? totalDespeses : totalIngressos

  const budgetMap = new Map(categories.map(c => [c.nom, c.pressupost_mensual]))
  const treemapData = data.map(c => ({ ...c, size: c.value }))

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <TabSwitcher tab={tab} onTabChange={setTab} />
        <p className="text-center text-muted-foreground py-16">
          No hi ha {isDespeses ? "despeses" : "ingressos"} per categories en aquest període.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TabSwitcher tab={tab} onTabChange={setTab} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribució de {isDespeses ? "Despeses" : "Ingressos"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatEuros(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Treemap (only for expenses — income categories can be few) */}
        {isDespeses ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapa de Despeses</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  content={<TreemapCell />}
                />
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          /* For income: a ranked bar-style list */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fonts d&apos;Ingrés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incomeCategoryData.map(cat => {
                const pct = totalIngressos > 0 ? (cat.value / totalIngressos) * 100 : 0
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
                        {formatEuros(cat.value)}
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
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Resum per Categoria — {isDespeses ? "Despeses" : "Ingressos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2.5 font-semibold text-muted-foreground">Categoria</th>
                  <th className="text-right py-2.5 font-semibold text-muted-foreground">Import</th>
                  <th className="text-right py-2.5 font-semibold text-muted-foreground pr-4">
                    % Total
                  </th>
                  <th className="w-28 py-2.5 font-semibold text-muted-foreground">Pes</th>
                  {isDespeses && (
                    <th className="text-right py-2.5 font-semibold text-muted-foreground pl-4">
                      Pressupost
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map(cat => {
                  const pct = total > 0 ? (cat.value / total) * 100 : 0
                  const budget = isDespeses ? (budgetMap.get(cat.name) ?? null) : null
                  const budgetPct = budget != null && budget > 0 ? Math.min((cat.value / budget) * 100, 100) : null
                  const isOverBudget = budget != null && cat.value > budget

                  return (
                    <tr
                      key={cat.name}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <ColorDot color={cat.color} />
                          <span className="font-semibold">{cat.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 font-mono font-semibold text-base">
                        {formatEuros(cat.value)}
                      </td>
                      <td className="text-right py-3 text-muted-foreground pr-4 tabular-nums">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </td>
                      {isDespeses && (
                        <td className="py-3 pl-4 text-right">
                          {budget != null && budget > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  "text-sm font-mono tabular-nums",
                                  isOverBudget ? "text-red-500 font-bold" : "text-muted-foreground",
                                )}
                              >
                                {formatEuros(cat.value)} / {formatEuros(budget)}
                              </span>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24">
                                <div
                                  className={`h-full rounded-full ${isOverBudget ? "bg-red-500" : ""}`}
                                  style={{
                                    width: `${budgetPct}%`,
                                    backgroundColor: isOverBudget ? undefined : cat.color,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TabSwitcher({
  tab,
  onTabChange,
}: {
  tab: "despeses" | "ingressos"
  onTabChange: (t: "despeses" | "ingressos") => void
}) {
  return (
    <div className="flex items-center gap-1 bg-muted border rounded-lg p-0.5 w-fit">
      {(["despeses", "ingressos"] as const).map(t => (
        <button
          key={t}
          onClick={() => onTabChange(t)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
            tab === t
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t === "despeses" ? "Despeses" : "Ingressos"}
        </button>
      ))}
    </div>
  )
}
