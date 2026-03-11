import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { formatEuros, cn } from "@/lib/utils"
import type { CategoryDataItem } from "./ResumTab"

interface Props {
  categoryData: CategoryDataItem[]
  incomeCategoryData: CategoryDataItem[]
  totalDespeses: number
  totalIngressos: number
}

export function MobileCategoriesTab({
  categoryData,
  incomeCategoryData,
  totalDespeses,
  totalIngressos,
}: Props) {
  const [tab, setTab] = useState<"despeses" | "ingressos">("despeses")

  const isDespeses = tab === "despeses"
  const data = isDespeses ? categoryData : incomeCategoryData
  const total = isDespeses ? totalDespeses : totalIngressos

  return (
    <div className="space-y-4">

      {/* Despeses / Ingressos toggle */}
      <div className="flex items-center gap-1 bg-muted border rounded-lg p-0.5 w-fit">
        {(["despeses", "ingressos"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
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

      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          No hi ha {isDespeses ? "despeses" : "ingressos"} per categories en aquest període.
        </p>
      ) : (
        <>
          {/* Donut chart */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">
                Distribució de {isDespeses ? "Despeses" : "Ingressos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[230px] px-2 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatEuros(Number(v))} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category bar list */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Per categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {data.map(cat => {
                const pct = total > 0 ? (cat.value / total) * 100 : 0
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-1 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-bold tabular-nums">{formatEuros(cat.value)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
