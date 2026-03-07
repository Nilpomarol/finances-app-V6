import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ComparisonData {
  actual: number
  anterior: number
}

interface CategoryComparisonItem {
  nom: string
  color: string
  actual: number
  anterior: number
}

interface DailyDataPoint {
  dia: number
  ingresos: number
  gastos: number
}

interface Props {
  ingressos: ComparisonData
  despeses: ComparisonData
  categoryComparison?: CategoryComparisonItem[]
  dailyDataActual?: DailyDataPoint[]
  dailyDataAnterior?: DailyDataPoint[]
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

// Custom tooltip per al gràfic superposat
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">Dia {label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="inline-block w-3 h-[2px] rounded" style={{
            backgroundColor: entry.color,
            borderTop: entry.strokeDasharray ? '2px dashed' : 'none',
            height: entry.strokeDasharray ? 0 : 2
          }} />
          {entry.name}: {formatEuros(Number(entry.value))}
        </p>
      ))}
    </div>
  )
}

export function ComparisonKPIs({ ingressos, despeses, categoryComparison, dailyDataActual, dailyDataAnterior }: Props) {
  // Construir les dades superposades per al gràfic d'evolució
  const overlaidData = mergeDailyData(dailyDataActual, dailyDataAnterior)

  // Ordenar categories per import actual descendent
  const sortedCategories = categoryComparison
    ? [...categoryComparison].sort((a, b) => b.actual - a.actual)
    : []

  return (
    <div className="space-y-6">
      {/* KPI Cards existents */}
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

      {/* Gràfic d'evolució superposat */}
      {overlaidData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolució Diària Comparativa</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overlaidData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v}\u20AC`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* Línies del període actual (sòlides) */}
                <Line
                  type="monotone"
                  dataKey="ingressosActual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Ingressos (actual)"
                />
                <Line
                  type="monotone"
                  dataKey="despesesActual"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Despeses (actual)"
                />
                {/* Línies del període anterior (discontínues) */}
                <Line
                  type="monotone"
                  dataKey="ingressosAnterior"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Ingressos (ant.)"
                  opacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="despesesAnterior"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Despeses (ant.)"
                  opacity={0.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Taula de comparació per categories */}
      {sortedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativa per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Actual</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Mes Anterior</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Variació</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((cat) => (
                    <tr key={cat.nom} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium">{cat.nom}</span>
                        </div>
                      </td>
                      <td className="text-right py-2.5 font-mono">{formatEuros(cat.actual)}</td>
                      <td className="text-right py-2.5 font-mono text-muted-foreground">{formatEuros(cat.anterior)}</td>
                      <td className="text-right py-2.5">
                        <div className="flex justify-end">
                          <Percentatge actual={cat.actual} anterior={cat.anterior} invertit />
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

// Hook per fusionar les dades diàries dels dos períodes
function mergeDailyData(actual?: DailyDataPoint[], anterior?: DailyDataPoint[]) {
  if (!actual || actual.length === 0) return []

  const anteriorMap: Record<number, DailyDataPoint> = {}
  if (anterior) {
    anterior.forEach(d => { anteriorMap[d.dia] = d })
  }

  return actual.map(d => ({
    dia: d.dia,
    ingressosActual: d.ingresos,
    despesesActual: d.gastos,
    ingressosAnterior: anteriorMap[d.dia]?.ingresos ?? 0,
    despesesAnterior: anteriorMap[d.dia]?.gastos ?? 0,
  }))
}
