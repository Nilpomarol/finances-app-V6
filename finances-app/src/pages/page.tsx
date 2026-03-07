import { useEffect, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { useFilterStore } from "@/store/filterStore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getTransactions } from "@/lib/db/queries/transactions"
import { getCategories } from "@/lib/db/queries/categories"
import { getEvents } from "@/lib/db/queries/events"
import { getRules } from "@/lib/db/queries/rules"
import type { Account, TransactionWithRelations, Category } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEuros, formatDate } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, Landmark, Wallet, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import ImportCsvModal from "@/components/features/importador-csv/ImportCsvModal"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

export default function DashboardPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()
  const { setCompteIds } = useFilterStore()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [categoryView, setCategoryView] = useState<"despesa" | "ingres">("despesa")

  useEffect(() => {
    if (!userId) return

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()

    Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getTransactions({
        userId,
        dateStart: firstDay,
        dateEnd: lastDay,
        excludeLiquidacions: true
      }),
      getEvents(userId),
      getRules(userId)
    ]).then(([accs, cats, txs, eventsData, rulesData]) => {
      setAccounts(accs)
      setCategories(cats)
      setTransactions(txs)
      setEvents(eventsData)
      setRules(rulesData)
      setIsLoading(false)
    })
  }, [userId])

  // Calcul de KPIs globals
  const kpis = useMemo(() => {
    const patrimoni = accounts.reduce((acc, curr) => acc + curr.saldo, 0)
    let ingressos = 0
    let despeses = 0

    transactions.forEach(tx => {
      if (tx.tipus === 'ingres') ingressos += tx.import_trs
      if (tx.tipus === 'despesa') despeses += tx.import_trs
    })

    return { patrimoni, ingressos, despeses, fluxNet: ingressos - despeses }
  }, [accounts, transactions])

  // Daily evolution data for the line chart
  const dailyEvolution = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    // Initialize all days
    const dailyMap: Record<number, { day: number; ingressos: number; despeses: number }> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { day: d, ingressos: 0, despeses: 0 }
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.data)
      const day = txDate.getDate()
      if (dailyMap[day]) {
        if (tx.tipus === 'ingres') {
          dailyMap[day].ingressos += tx.import_trs
        } else if (tx.tipus === 'despesa') {
          dailyMap[day].despeses += tx.import_trs
        }
      }
    })

    return Object.values(dailyMap).sort((a, b) => a.day - b.day)
  }, [transactions])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, {
      id: string
      nom: string
      color: string
      total: number
      pressupost_mensual: number | null
    }>()

    transactions.forEach(tx => {
      if (tx.tipus !== categoryView) return
      const catId = tx.categoria_id || '__sense_categoria__'
      const existing = catMap.get(catId)
      if (existing) {
        existing.total += tx.import_trs
      } else {
        // Find the category to get color and budget
        const cat = categories.find(c => c.id === catId)
        catMap.set(catId, {
          id: catId,
          nom: cat?.nom || 'Sense categoria',
          color: cat?.color || '#999',
          total: tx.import_trs,
          pressupost_mensual: cat?.pressupost_mensual ?? null
        })
      }
    })

    return Array.from(catMap.values()).sort((a, b) => b.total - a.total)
  }, [transactions, categories, categoryView])

  // AILLAMENT ANALITIC (Fase 3)
  const ultimsMoviments = useMemo(() => {
    const normals: any[] = []
    const eventsMap = new Map<string, any>()

    transactions.forEach(tx => {
      if (tx.esdeveniment_id) {
        const existing = eventsMap.get(tx.esdeveniment_id) || {
          id: `evt-${tx.esdeveniment_id}`,
          isEvent: true,
          realEventId: tx.esdeveniment_id,
          concepte: `✨ ${tx.esdeveniment_nom}`,
          compte_nom: 'Diversos comptes',
          categoria_nom: 'Aillat',
          data: tx.data,
          import_trs: 0,
          tipus: 'despesa'
        }

        if (tx.tipus === 'despesa') existing.import_trs += tx.import_trs
        if (tx.tipus === 'ingres') existing.import_trs -= tx.import_trs
        if (tx.data > existing.data) existing.data = tx.data

        eventsMap.set(tx.esdeveniment_id, existing)
      } else {
        normals.push({ ...tx, isEvent: false })
      }
    })

    const combinat = [...normals, ...Array.from(eventsMap.values())]
    return combinat.sort((a, b) => b.data - a.data).slice(0, 6)
  }, [transactions])

  const handleAccountClick = (accountId: string) => {
    setCompteIds([accountId])
    navigate('/analisi')
  }

  const handleTransactionClick = (tx: any) => {
    if (tx.isEvent) {
      navigate(`/esdeveniments/${tx.realEventId}`)
    } else {
      navigate('/transaccions')
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregant el teu resum financer...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resum del Mes</h1>
        <Button variant="outline" onClick={() => setShowImportModal(true)}>
          <Upload className="w-4 h-4 mr-2" /> Importar CSV
        </Button>
      </div>

      {/* Targetes de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patrimoni Total</CardTitle>
            <Landmark className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEuros(kpis.patrimoni)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingressos (Mes)</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatEuros(kpis.ingressos)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despeses (Mes)</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatEuros(kpis.despeses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flux Net</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.fluxNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {kpis.fluxNet > 0 ? '+' : ''}{formatEuros(kpis.fluxNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolucio Diaria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvolution} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val) => formatEuros(val)}
                  width={90}
                />
                <Tooltip
                  formatter={(value: number | string | undefined, name?: string) => [
                    formatEuros(Number(value ?? 0)),
                    name === 'ingressos' ? 'Ingressos' : 'Despeses'
                  ]}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Legend
                  formatter={(value) => value === 'ingressos' ? 'Ingressos' : 'Despeses'}
                />
                <Line
                  type="monotone"
                  dataKey="ingressos"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="despeses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resum de Comptes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Els teus comptes</CardTitle>
            <Link to="/comptes" className="text-sm text-primary hover:underline">
              Gestionar
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tens cap compte actiu.</p>
            ) : (
              accounts.map(acc => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAccountClick(acc.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#ccc' }} />
                    <span className="font-medium">{acc.nom}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{formatEuros(acc.saldo)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ultims Moviments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ultims Moviments</CardTitle>
            <Link to="/transaccions" className="text-sm text-primary hover:underline">
              Veure tot
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {ultimsMoviments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cap moviment aquest mes.</p>
            ) : (
              ultimsMoviments.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0 cursor-pointer hover:bg-muted/50 transition-colors p-2 rounded-md -mx-2"
                  onClick={() => handleTransactionClick(tx)}
                >
                  <div className="min-w-0 pr-4">
                    <p className={`font-medium text-sm truncate ${tx.isEvent ? 'text-primary' : ''}`}>
                      {tx.concepte}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(tx.data)} • {tx.isEvent ? 'Despesa agrupada' : `${tx.compte_nom} • ${tx.categoria_nom || 'Sense categoria'}`}
                    </p>
                  </div>
                  <div className={`font-semibold text-sm tabular-nums shrink-0 ${
                    tx.tipus === 'ingres' ? 'text-green-600' :
                    tx.tipus === 'despesa' ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    {tx.tipus === 'ingres' ? '+' : tx.tipus === 'despesa' ? '-' : ''}{formatEuros(tx.import_trs)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown with Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Per Categoria</CardTitle>
              <div className="flex gap-1 rounded-lg border p-0.5">
                <button
                  onClick={() => setCategoryView("despesa")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    categoryView === "despesa"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  Despeses
                </button>
                <button
                  onClick={() => setCategoryView("ingres")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    categoryView === "ingres"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  Ingressos
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {categoryView === "despesa" ? "Cap despesa aquest mes." : "Cap ingres aquest mes."}
              </p>
            ) : (
              categoryBreakdown.map(cat => {
                const percentage = cat.pressupost_mensual && cat.pressupost_mensual > 0
                  ? (cat.total / cat.pressupost_mensual) * 100
                  : null

                const barColor = percentage !== null
                  ? percentage > 100
                    ? 'bg-red-500'
                    : percentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  : 'bg-primary'

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium truncate">{cat.nom}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatEuros(cat.total)}
                        </span>
                        {cat.pressupost_mensual && cat.pressupost_mensual > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            / {formatEuros(cat.pressupost_mensual)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar for expense categories with budget */}
                    {categoryView === "despesa" && percentage !== null && (
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          window.location.reload()
        }}
        accounts={accounts}
        categories={categories}
        events={events}
        rules={rules}
      />
    </div>
  )
}
