import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatEuros } from "@/lib/utils"

interface ComparisonData {
  actual: number
  anterior: number
}

interface Props {
  ingressos: ComparisonData
  despeses: ComparisonData
}

function Percentatge({ actual, anterior, invertit = false }: { actual: number, anterior: number, invertit?: boolean }) {
  if (anterior === 0) return <span className="text-xs text-muted-foreground">N/A</span>
  const diff = ((actual - anterior) / anterior) * 100
  const isPositive = diff > 0
  
  // Per a les despeses, un increment (positiu) és "dolent" (vermell)
  const color = invertit 
    ? (isPositive ? "text-red-500" : "text-green-500")
    : (isPositive ? "text-green-500" : "text-red-500")

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

export function ComparisonKPIs({ ingressos, despeses }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comparativa Ingressos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{formatEuros(ingressos.actual)}</div>
              <p className="text-xs text-muted-foreground italic">Vs. {formatEuros(ingressos.anterior)} (Mes ant.)</p>
            </div>
            <Percentatge actual={ingressos.actual} anterior={ingressos.anterior} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comparativa Despeses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{formatEuros(despeses.actual)}</div>
              <p className="text-xs text-muted-foreground italic">Vs. {formatEuros(despeses.anterior)} (Mes ant.)</p>
            </div>
            <Percentatge actual={despeses.actual} anterior={despeses.anterior} invertit />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}