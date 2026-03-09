import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "@/store/authStore"
import { useFilterStore } from "@/store/filterStore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getTransactions } from "@/lib/db/queries/transactions"


// Importació dels components de la UI (Assegura't que existeixen)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalysisFilters } from "@/components/features/analisi/AnalysisFilters"
import { AnalysisCharts } from "@/components/features/analisi/AnalysisCharts"
import { AnalysisKPIs } from "@/components/features/analisi/AnalysisKpis"
import { ComparisonKPIs } from "@/components/features/analisi/ComparisonKpis"
import { RecurringAnalysis } from "@/components/features/analisi/RecurringAnalysis"
import type { Account, Category, TransactionWithRelations } from "@/types/database"

export default function AnalisiPage() {
  const { userId } = useAuthStore()
  const { periode, compteIds, categoriaIds } = useFilterStore()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactionsActual, setTransactionsActual] = useState<TransactionWithRelations[]>([])
  const [transactionsAnterior, setTransactionsAnterior] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId || !periode) return
    setIsLoading(true)

    // Càlcul dates període actual
    const startActual = new Date(periode.any, periode.mes - 1, 1).getTime()
    const endActual = new Date(periode.any, periode.mes, 0, 23, 59, 59).getTime()

    // Càlcul dates període anterior (Mes - 1)
    const dataAnterior = new Date(periode.any, periode.mes - 2, 1)
    const startAnterior = new Date(dataAnterior.getFullYear(), dataAnterior.getMonth(), 1).getTime()
    const endAnterior = new Date(dataAnterior.getFullYear(), dataAnterior.getMonth() + 1, 0, 23, 59, 59).getTime()

    Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getTransactions({ userId, dateStart: startActual, dateEnd: endActual, excludeLiquidacions: true }),
      getTransactions({ userId, dateStart: startAnterior, dateEnd: endAnterior, excludeLiquidacions: true })
    ]).then(([accs, cats, txsActual, txsAnterior]) => {
      setAccounts(accs)
      setCategories(cats)
      setTransactionsActual(txsActual)
      setTransactionsAnterior(txsAnterior)
      setIsLoading(false)
    })
  }, [userId, periode])

  // Processament de dades per a la vista individual
  const actualStats = useMemo(() => processTransactions(transactionsActual, periode, compteIds, categoriaIds),
    [transactionsActual, compteIds, categoriaIds, periode])

  // Processament de totals per a la vista comparativa
  const anteriorTotals = useMemo(() => {
    let ingressos = 0, despeses = 0
    const filteredAnterior = transactionsAnterior.filter(t => {
      const matchCompte = compteIds.length === 0 || compteIds.includes(t.compte_id)
      const matchCat = categoriaIds.length === 0 || (t.categoria_id && categoriaIds.includes(t.categoria_id))
      return matchCompte && matchCat
    })

    filteredAnterior.forEach(t => {
      if (t.tipus === 'ingres') ingressos += t.import_trs
      else if (t.tipus === 'despesa') despeses += t.import_trs - (t.total_deutes ?? 0)
    })
    return { ingressos, despeses }
  }, [transactionsAnterior, compteIds, categoriaIds])

  // Processament de la comparació per categories
  const categoryComparison = useMemo(
    () => processCategoryComparison(transactionsActual, transactionsAnterior, compteIds, categoriaIds),
    [transactionsActual, transactionsAnterior, compteIds, categoriaIds]
  )

  // Processament de les dades diàries del període anterior
  const dailyDataAnterior = useMemo(() => {
    if (!periode) return []
    const anteriorDate = new Date(periode.any, periode.mes - 2, 1)
    const anteriorPeriode = {
      any: anteriorDate.getFullYear(),
      mes: anteriorDate.getMonth() + 1,
    }
    const stats = processTransactions(transactionsAnterior, anteriorPeriode, compteIds, categoriaIds)
    return stats.dailyData
  }, [transactionsAnterior, compteIds, categoriaIds, periode])

  if (isLoading) return <div className="p-8 text-center animate-pulse">Analitzant períodes...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Anàlisi de Dades</h1>

      {/* Barra de filtres global sempre visible */}
      <AnalysisFilters accounts={accounts} categories={categories} />

      {/* SISTEMA DE PESTANYES PER CANVIAR D'ANÀLISI */}
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Anàlisi Individual</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa (Vs. Mes Anterior)</TabsTrigger>
          <TabsTrigger value="recurrents">Despeses Recurrents</TabsTrigger>
        </TabsList>

        {/* CONTINGUT: ANÀLISI INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-6 mt-6">
          <AnalysisKPIs
            ingressos={actualStats.ingressos}
            despeses={actualStats.despeses}
            estalvi={actualStats.estalvi}
          />
          <AnalysisCharts
            dailyData={actualStats.dailyData}
            categoryData={actualStats.categoryData}
          />
        </TabsContent>

        {/* CONTINGUT: ANÀLISI COMPARATIVA */}
        <TabsContent value="comparativa" className="space-y-6 mt-6">
          <ComparisonKPIs
            ingressos={{ actual: actualStats.ingressos, anterior: anteriorTotals.ingressos }}
            despeses={{ actual: actualStats.despeses, anterior: anteriorTotals.despeses }}
            categoryComparison={categoryComparison}
            dailyDataActual={actualStats.dailyData}
            dailyDataAnterior={dailyDataAnterior}
          />
        </TabsContent>
        <TabsContent value="recurrents" className="mt-6">
          <RecurringAnalysis transactions={transactionsActual} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Funció helper per processar les transaccions
function processTransactions(transactions: TransactionWithRelations[], periode: any, compteIds: string[], categoriaIds: string[]) {
  let filtered = transactions
  if (compteIds.length > 0) filtered = filtered.filter(t => compteIds.includes(t.compte_id))
  if (categoriaIds.length > 0) filtered = filtered.filter(t => t.categoria_id && categoriaIds.includes(t.categoria_id))

  let ingressos = 0, despeses = 0
  const dailyMap: Record<number, any> = {}
  const categoryMap: Record<string, any> = {}

  const diesMes = new Date(periode.any, periode.mes, 0).getDate()
  for (let i = 1; i <= diesMes; i++) dailyMap[i] = { dia: i, ingresos: 0, gastos: 0 }

  filtered.forEach(t => {
    const dia = new Date(t.data).getDate()
    if (t.tipus === 'ingres') {
      ingressos += t.import_trs
      if (dailyMap[dia]) dailyMap[dia].ingresos += t.import_trs
    } else if (t.tipus === 'despesa') {
      const netAmount = t.import_trs - (t.total_deutes ?? 0)
      despeses += netAmount
      if (dailyMap[dia]) dailyMap[dia].gastos += netAmount

      const catName = t.categoria_nom || "Sense categoria"
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, value: 0, color: t.categoria_color || "#ccc" }
      }
      categoryMap[catName].value += netAmount
    }
  })

  return {
    ingressos,
    despeses,
    estalvi: ingressos - despeses,
    dailyData: Object.values(dailyMap),
    categoryData: Object.values(categoryMap).sort((a, b) => b.value - a.value)
  }
}

// Funció per construir la comparació per categories entre dos períodes
function processCategoryComparison(
  txActual: TransactionWithRelations[],
  txAnterior: TransactionWithRelations[],
  compteIds: string[],
  categoriaIds: string[]
) {
  const filterTx = (transactions: TransactionWithRelations[]) => {
    let filtered = transactions
    if (compteIds.length > 0) filtered = filtered.filter(t => compteIds.includes(t.compte_id))
    if (categoriaIds.length > 0) filtered = filtered.filter(t => t.categoria_id && categoriaIds.includes(t.categoria_id))
    return filtered
  }

  const filteredActual = filterTx(txActual)
  const filteredAnterior = filterTx(txAnterior)

  // Mapa unificat de categories: clau = nom de la categoria
  const categoryMap: Record<string, { nom: string; color: string; actual: number; anterior: number }> = {}

  // Processar despeses del període actual
  filteredActual.forEach(t => {
    if (t.tipus !== 'despesa') return
    const catName = t.categoria_nom || "Sense categoria"
    if (!categoryMap[catName]) {
      categoryMap[catName] = { nom: catName, color: t.categoria_color || "#ccc", actual: 0, anterior: 0 }
    }
    categoryMap[catName].actual += t.import_trs - (t.total_deutes ?? 0)
  })

  // Processar despeses del període anterior
  filteredAnterior.forEach(t => {
    if (t.tipus !== 'despesa') return
    const catName = t.categoria_nom || "Sense categoria"
    if (!categoryMap[catName]) {
      categoryMap[catName] = { nom: catName, color: t.categoria_color || "#ccc", actual: 0, anterior: 0 }
    }
    categoryMap[catName].anterior += t.import_trs - (t.total_deutes ?? 0)
  })

  return Object.values(categoryMap)
}
