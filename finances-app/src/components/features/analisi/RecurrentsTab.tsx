import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertCircle } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import { ColorDot } from "@/components/shared/ColorDot"
import type { TransactionWithRelations } from "@/types/database"

interface Props {
  transactions: TransactionWithRelations[]
  totalDespeses: number
}

export function RecurrentsTab({ transactions, totalDespeses }: Props) {
  const recurrents = transactions.filter(t => t.recurrent && t.tipus === "despesa")
  const totalRecurrent = recurrents.reduce(
    (sum, t) => sum + t.import_trs - (t.total_deutes ?? 0),
    0,
  )
  const pctTotal = totalDespeses > 0 ? (totalRecurrent / totalDespeses) * 100 : 0

  // Group by category, sorted by group total descending
  const groupMap: Record<string, { nom: string; color: string; items: TransactionWithRelations[] }> = {}
  for (const t of recurrents) {
    const key = t.categoria_nom ?? "Sense categoria"
    if (!groupMap[key]) {
      groupMap[key] = { nom: key, color: t.categoria_color ?? "#ccc", items: [] }
    }
    groupMap[key].items.push(t)
  }
  const groups = Object.values(groupMap).sort((a, b) => {
    const sumA = a.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
    const sumB = b.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
    return sumB - sumA
  })

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Total Despeses Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatEuros(totalRecurrent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recurrents.length} subscripció{recurrents.length !== 1 ? "ns" : ""} detectada
              {recurrents.length !== 1 ? "des" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Pes sobre Despeses Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pctTotal.toFixed(1)}%</div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(pctTotal, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatEuros(totalRecurrent)} de {formatEuros(totalDespeses)} totals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped list by category */}
      {recurrents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No s&apos;han detectat despeses recurrents en aquest període.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const groupTotal = group.items.reduce(
              (s, t) => s + t.import_trs - (t.total_deutes ?? 0),
              0,
            )
            return (
              <Card key={group.nom}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ColorDot color={group.color} />
                      {group.nom}
                    </div>
                    <span className="font-mono text-base">{formatEuros(groupTotal)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.items.map(t => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center text-sm border-b last:border-0 pb-2 last:pb-0"
                      >
                        <span className="text-muted-foreground">{t.concepte}</span>
                        <span className="font-mono font-medium">
                          {formatEuros(t.import_trs - (t.total_deutes ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
