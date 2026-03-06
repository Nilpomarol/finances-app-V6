import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle, ArrowDownCircle, Scale } from "lucide-react"
import { formatEuros } from "@/lib/utils"

interface Props {
  ingressos: number
  despeses: number
  estalvi: number
}

export function AnalysisKPIs({ ingressos, despeses, estalvi }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ingressos</CardTitle>
          <ArrowUpCircle className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatEuros(ingressos)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Despeses</CardTitle>
          <ArrowDownCircle className="w-4 h-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{formatEuros(despeses)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Flux Net</CardTitle>
          <Scale className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${estalvi >= 0 ? 'text-primary' : 'text-red-500'}`}>
            {formatEuros(estalvi)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}