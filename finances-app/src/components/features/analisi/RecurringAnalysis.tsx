import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEuros } from "@/lib/utils"
import { Anchor, RefreshCw } from "lucide-react"
import type { TransactionWithRelations } from "@/types/database"

interface Props {
  transactions: TransactionWithRelations[]
}

export function RecurringAnalysis({ transactions }: Props) {
  const fixesDespeses = transactions.filter(t => t.categoria_es_fix && t.tipus === 'despesa')
  const totalFixesDespeses = fixesDespeses.reduce((acc, t) => acc + t.import_trs - (t.total_deutes ?? 0), 0)
  const totalDespeses = transactions.reduce((acc, t) => acc + (t.tipus === 'despesa' ? t.import_trs - (t.total_deutes ?? 0) : 0), 0)

  const subscripcions = transactions.filter(t => t.recurrent && t.tipus === 'despesa')
  const totalSubscripcions = subscripcions.reduce((acc, t) => acc + t.import_trs - (t.total_deutes ?? 0), 0)

  return (
    <div className="space-y-6">
      <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <Anchor className="w-4 h-4" />
            Total Despeses Fixes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{formatEuros(totalFixesDespeses)}</div>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
            Representa el {totalDespeses > 0 ? ((totalFixesDespeses / totalDespeses) * 100).toFixed(1) : 0}% de les teves despeses totals.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Anchor className="w-4 h-4 text-indigo-500" />
            Detall de Despeses Fixes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fixesDespeses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cap despesa en categories fixes en aquest període.</p>
          ) : (
            <div className="space-y-4">
              {fixesDespeses.map(t => (
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

      {subscripcions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Subscripcions ({formatEuros(totalSubscripcions)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscripcions.map(t => (
                <div key={t.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{t.concepte}</p>
                    <p className="text-xs text-muted-foreground">{t.categoria_nom || 'Sense categoria'}</p>
                  </div>
                  <span className="font-bold text-sm">{formatEuros(t.import_trs - (t.total_deutes ?? 0))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
