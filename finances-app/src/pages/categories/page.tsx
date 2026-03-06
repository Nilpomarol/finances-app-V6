import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getCategories, deleteCategory, getCategorySummaryCurrentMonth } from "@/lib/db/queries/categories"
import { formatEuros } from "@/lib/utils"
import type { Category } from "@/types/database"
import CategoryModal from "@/components/features/categories/CategoryModal"
import DynamicIcon from "@/components/shared/DynamicIcon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CategoriesPage() {
  const { userId } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [monthSummary, setMonthSummary] = useState<Array<{ categoria_id: string; total: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"despesa" | "ingres">("despesa")
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()

  const loadData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [cats, summary] = await Promise.all([
        getCategories(userId),
        getCategorySummaryCurrentMonth(userId),
      ])
      setCategories(cats)
      setMonthSummary(summary)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleEdit = (cat: Category) => { setEditingCategory(cat); setShowModal(true) }

  const handleDelete = async (cat: Category) => {
    if (!userId) return
    if (!confirm(`Eliminar la categoria "${cat.nom}"? Les transaccions associades quedaran sense categoria.`)) return
    await deleteCategory(cat.id, userId)
    loadData()
  }

  const getMonthTotal = (categoryId: string) =>
    monthSummary.find((s) => s.categoria_id === categoryId)?.total ?? 0

  const getBudgetStatus = (cat: Category) => {
    if (!cat.pressupost_mensual || cat.tipus !== "despesa") return null
    const pct = (getMonthTotal(cat.id) / cat.pressupost_mensual) * 100
    if (pct >= 100) return "red"
    if (pct >= 80) return "yellow"
    return "green"
  }

  const filtered = categories.filter((c) => c.tipus === activeTab)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{categories.length} categories configurades</p>
        </div>
        <Button onClick={() => { setEditingCategory(undefined); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />Nova categoria
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "despesa" | "ingres")}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="despesa">
            Despeses
            <Badge variant="secondary" className="ml-2 text-xs">
              {categories.filter((c) => c.tipus === "despesa").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ingres">
            Ingressos
            <Badge variant="secondary" className="ml-2 text-xs">
              {categories.filter((c) => c.tipus === "ingres").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {(["despesa", "ingres"] as const).map((tipus) => (
          <TabsContent key={tipus} value={tipus} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Tag className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold">Cap categoria de {tipus === "despesa" ? "despeses" : "ingressos"}</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4">Crea categories per organitzar les teves transaccions</p>
                  <Button onClick={() => { setEditingCategory(undefined); setShowModal(true) }}>
                    <Plus className="w-4 h-4 mr-2" />Crear categoria
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((cat) => {
                  const monthTotal = getMonthTotal(cat.id)
                  const budgetStatus = getBudgetStatus(cat)
                  const pct = cat.pressupost_mensual
                    ? Math.min((monthTotal / cat.pressupost_mensual) * 100, 100) : 0

                  return (
                    <Card key={cat.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.color + "20" }}>
                            <DynamicIcon name={cat.icona} className="w-5 h-5" style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{cat.nom}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(cat)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(cat)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {cat.pressupost_mensual ? (
                              <div className="mt-1.5 space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{formatEuros(monthTotal)} gastats</span>
                                  <span className={cn(
                                    "font-medium",
                                    budgetStatus === "red" && "text-destructive",
                                    budgetStatus === "yellow" && "text-yellow-600",
                                    budgetStatus === "green" && "text-green-600"
                                  )}>{formatEuros(cat.pressupost_mensual)} limit</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={cn(
                                    "h-full rounded-full transition-all",
                                    budgetStatus === "red" && "bg-destructive",
                                    budgetStatus === "yellow" && "bg-yellow-500",
                                    budgetStatus === "green" && "bg-green-500"
                                  )} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {monthTotal > 0 ? formatEuros(monthTotal) + " aquest mes" : "Sense activitat aquest mes"}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Categoria virtual */}
                <Card className="border-dashed opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Sense Categoria</p>
                        <p className="text-xs text-muted-foreground">Categoria virtual - no es pot eliminar</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CategoryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadData}
        category={editingCategory}
        defaultTipus={activeTab}
      />
    </div>
  )
}