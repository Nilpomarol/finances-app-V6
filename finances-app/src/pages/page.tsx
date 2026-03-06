import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getTransactions } from "@/lib/db/queries/transactions"
import { getCategories } from "@/lib/db/queries/categories"
import { getEvents } from "@/lib/db/queries/events"
import { getRules } from "@/lib/db/queries/rules" // NOU: Importem les regles
import type { Account, TransactionWithRelations, Category } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEuros, formatDate } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, Landmark, Wallet, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import ImportCsvModal from "@/components/features/importador-csv/ImportCsvModal"

export default function DashboardPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([]) // NOU: Definim l'estat per a les regles
  
  const [isLoading, setIsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    if (!userId) return
    
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()

    // Afegim getRules al Promise.all
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
      getRules(userId) // NOU
    ]).then(([accs, cats, txs, eventsData, rulesData]) => {
      setAccounts(accs)
      setCategories(cats)
      setTransactions(txs)
      setEvents(eventsData)
      setRules(rulesData) // NOU: Guardem les regles a l'estat
      setIsLoading(false)
    })
  }, [userId])

  // Càlcul de KPIs globals
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

  // AÏLLAMENT ANALÍTIC (Fase 3)
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
          categoria_nom: 'Aïllat',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resum de Comptes */}
        <Card>
          <CardHeader>
            <CardTitle>Els teus comptes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tens cap compte actiu.</p>
            ) : (
              accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
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

        {/* Últims Moviments */}
        <Card>
          <CardHeader>
            <CardTitle>Últims Moviments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ultimsMoviments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cap moviment aquest mes.</p>
            ) : (
              ultimsMoviments.map(tx => (
                <div 
                  key={tx.id} 
                  className={`flex items-center justify-between border-b last:border-0 pb-3 last:pb-0 ${
                    tx.isEvent ? 'cursor-pointer hover:bg-muted/50 transition-colors p-2 rounded-md -mx-2' : ''
                  }`}
                  onClick={() => tx.isEvent && navigate(`/esdeveniments/${tx.realEventId}`)}
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
        rules={rules} // Passem les regles que hem carregat!
      />
    </div>
  )
}