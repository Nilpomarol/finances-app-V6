import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEuros } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

interface Props {
  transactions: any[]
}

export function RecurringAnalysis({ transactions }: Props) {
  const recurrents = transactions.filter(t => t.recurrent && t.tipus === 'despesa')
  const totalRecurrent = recurrents.reduce((acc, t) => acc + t.import_trs - (t.total_deutes ?? 0), 0)

  return (
    <div className="space-y-6">
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
            Representa el {transactions.length > 0 ? ((totalRecurrent / transactions.reduce((acc, t) => acc + (t.tipus === 'despesa' ? t.import_trs - (t.total_deutes ?? 0) : 0), 0)) * 100).toFixed(1) : 0}% de les teves despeses totals.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detall de Subscripcions i Fixes</CardTitle>
        </CardHeader>
        <CardContent>
          {recurrents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No s'han detectat despeses recurrents en aquest període.</p>
          ) : (
            <div className="space-y-4">
              {recurrents.map(t => (
                <div key={t.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{t.concepte}</p>
                    <p className="text-xs text-muted-foreground">{t.categoria_nom || 'Sense categoria'}</p>
                  </div>
                  <span className="font-bold text-sm">{formatEuros(t.import_trs - (t.total_deutes ?? 0))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}