import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { getEventById, getTransactionsByEvent } from "@/lib/db/queries/events"
import type { Event, TransactionWithRelations } from "@/types/database"
import { formatEuros } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, CalendarDays, Wallet, TrendingUp } from "lucide-react"

export default function EsdevenimentDetallPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuthStore()

  const [event, setEvent] = useState<Event | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEventData() {
      if (!userId || !id) return
      setIsLoading(true)
      try {
        const [eventData, txData] = await Promise.all([
          getEventById(id, userId),
          getTransactionsByEvent(id, userId)
        ])
        setEvent(eventData)
        setTransactions(txData)
      } finally {
        setIsLoading(false)
      }
    }
    loadEventData()
  }, [id, userId])

  // ==========================================
  // CÀLCUL DE KPIs
  // ==========================================
  const kpis = useMemo(() => {
    if (!event) return { totalGastat: 0, dies: 1, mitjanaDia: 0 }

    // Només sumem les despeses (ignorant ingressos o transferències per a l'anàlisi de viatges)
    const totalGastat = transactions
      .filter(t => t.tipus === "despesa")
      .reduce((acc, t) => acc + t.import_trs, 0)

    // Càlcul de dies (mínim 1 dia encara que comenci i acabi el mateix dia)
    const diffTime = Math.abs(event.data_fi - event.data_inici)
    const diesCalculats = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const dies = diesCalculats > 0 ? diesCalculats : 1

    return {
      totalGastat,
      dies,
      mitjanaDia: totalGastat / dies
    }
  }, [event, transactions])

  // ==========================================
  // DESGLOSSAMENTS (Categories vs Tags)
  // ==========================================
  const breakdown = useMemo(() => {
    const expenses = transactions.filter(t => t.tipus === "despesa")
    
    // 1. Agrupació per Categoria Clàssica
    const categoriesMap = new Map()
    // 2. Agrupació per Tags (amb fallback a categoria)
    const tagsMap = new Map()

    expenses.forEach(t => {
      // Per Categories
      const catKey = t.categoria_id || "sense-cat"
      const currentCat = categoriesMap.get(catKey) || { 
        nom: t.categoria_nom || "Sense Categoria", 
        color: t.categoria_color || "#cbd5e1", 
        total: 0 
      }
      categoriesMap.set(catKey, { ...currentCat, total: currentCat.total + t.import_trs })

      // Per Tags (El Tag és prioritari, si no hi és, fem Fallback a Categoria)
      const hasTag = !!t.event_tag_id
      const tagKey = hasTag ? `tag-${t.event_tag_id}` : `cat-${catKey}`
      
      const currentTag = tagsMap.get(tagKey) || {
        nom: hasTag ? t.event_tag_nom : `${t.categoria_nom || "Sense Categoria"} (Sense etiqueta)`,
        color: hasTag ? t.event_tag_color : (t.categoria_color || "#cbd5e1"),
        isFallback: !hasTag, // Marquem si és fallback per distingir-lo visualment
        total: 0
      }
      tagsMap.set(tagKey, { ...currentTag, total: currentTag.total + t.import_trs })
    })

    // Ordenem de major a menor despesa
    const sortByTotal = (a: any, b: any) => b.total - a.total

    return {
      categories: Array.from(categoriesMap.values()).sort(sortByTotal),
      tags: Array.from(tagsMap.values()).sort(sortByTotal)
    }
  }, [transactions])

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregant esdeveniment...</div>
  if (!event) return <div className="p-8 text-center text-red-500">Esdeveniment no trobat</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/esdeveniments")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{event.nom}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {event.tipus} • {new Date(event.data_inici).toLocaleDateString()} al {new Date(event.data_fi).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Targetes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Gastat</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatEuros(kpis.totalGastat)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Dies de Duració</CardTitle>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.dies} dies</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Mitjana per Dia</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEuros(kpis.mitjanaDia)} <span className="text-sm font-normal text-muted-foreground">/ dia</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DESGLOSSAMENT (Toggle Categories / Tags) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Desglossament de Despeses</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tags" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="categories">Per Categories</TabsTrigger>
                <TabsTrigger value="tags">Per Etiquetes (Tags)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="categories" className="space-y-4">
                {breakdown.categories.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-sm">{item.nom}</span>
                    </div>
                    <span className="text-sm font-bold">{formatEuros(item.total)}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                {breakdown.tags.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between ${item.isFallback ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-sm">{item.nom}</span>
                    </div>
                    <span className="text-sm font-bold">{formatEuros(item.total)}</span>
                  </div>
                ))}
                {breakdown.tags.some(t => t.isFallback) && (
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                    * Els elements atenuats són despeses sense etiqueta assignada (es mostra la categoria per defecte).
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* LLISTAT DE MOVIMENTS DE L'ESDEVENIMENT */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Últims Moviments</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hi ha transaccions en aquest esdeveniment.</p>
            ) : (
              <div className="space-y-4">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{tx.concepte}</p>
                      <div className="flex gap-2 items-center mt-1 text-xs text-muted-foreground">
                        <span>{new Date(tx.data).toLocaleDateString()}</span>
                        {/* Mostrem la categoria o el tag depenent del que tingui */}
                        {tx.event_tag_nom ? (
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-muted" style={{ borderLeft: `2px solid ${tx.event_tag_color || '#ccc'}` }}>
                            {tx.event_tag_nom}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-muted" style={{ borderLeft: `2px solid ${tx.categoria_color || '#ccc'}` }}>
                            {tx.categoria_nom || 'Sense categoria'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.tipus === 'ingres' ? 'text-green-600' : ''}`}>
                      {tx.tipus === 'despesa' ? '-' : ''}{formatEuros(tx.import_trs)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}