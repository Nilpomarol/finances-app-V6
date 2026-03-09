import { ArrowUpCircle, ArrowDownCircle, Scale } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import { KpiCard } from "@/components/shared/KpiCard"

interface Props {
  ingressos: number
  despeses: number
  estalvi: number
}

export function AnalysisKPIs({ ingressos, despeses, estalvi }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        title="Ingressos"
        icon={<ArrowUpCircle className="w-4 h-4 text-green-500" />}
        value={<span className="text-green-600">{formatEuros(ingressos)}</span>}
      />
      <KpiCard
        title="Despeses"
        icon={<ArrowDownCircle className="w-4 h-4 text-red-500" />}
        value={<span className="text-red-500">{formatEuros(despeses)}</span>}
      />
      <KpiCard
        title="Flux Net"
        icon={<Scale className="w-4 h-4 text-muted-foreground" />}
        value={<span className={estalvi >= 0 ? 'text-primary' : 'text-red-500'}>{formatEuros(estalvi)}</span>}
      />
    </div>
  )
}