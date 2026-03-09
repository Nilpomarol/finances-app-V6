import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getCategories, deleteCategory, getCategorySummaryCurrentMonth } from "@/lib/db/queries/categories"
import { formatEuros } from "@/lib/utils"
import type { Category } from "@/types/database"
import CategoryModal from "@/components/features/categories/CategoryModal"
import DynamicIcon from "@/components/shared/DynamicIcon"
import { Button } from "@/components/ui/button"
import { Plus, Tag, TrendingDown, TrendingUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import EntityTransactionsModal from "@/components/shared/EntityTransactionsModal"
import type { EntityTransactionsEntity } from "@/components/shared/EntityTransactionsModal"

export default function CategoriesPage() {
  const { userId } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [monthSummary, setMonthSummary] = useState<Array<{ categoria_id: string; total: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"despesa" | "ingres">("despesa")
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [txEntity, setTxEntity] = useState<EntityTransactionsEntity | null>(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    if (openMenuId) document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [openMenuId])

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat)
    setShowModal(true)
    setOpenMenuId(null)
  }

  const handleDelete = async (cat: Category) => {
    if (!userId) return
    setOpenMenuId(null)
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
  const despesaCount = categories.filter((c) => c.tipus === "despesa").length
  const ingresCount = categories.filter((c) => c.tipus === "ingres").length

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} categories configurades`}
        action={
          <Button
            onClick={() => { setEditingCategory(undefined); setShowModal(true) }}
            className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova categoria
          </Button>
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("despesa")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "despesa"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Despeses
          <span className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
            activeTab === "despesa"
              ? "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          )}>
            {despesaCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("ingres")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "ingres"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Ingressos
          <span className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
            activeTab === "ingres"
              ? "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          )}>
            {ingresCount}
          </span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
            <Tag className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Cap categoria de {activeTab === "despesa" ? "despeses" : "ingressos"}
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Crea categories per organitzar les teves transaccions
          </p>
          <Button
            onClick={() => { setEditingCategory(undefined); setShowModal(true) }}
            className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Crear categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((cat) => {
            const monthTotal = getMonthTotal(cat.id)
            const budgetStatus = getBudgetStatus(cat)
            const pct = cat.pressupost_mensual
              ? Math.min((monthTotal / cat.pressupost_mensual) * 100, 100) : 0
            const isMenuOpen = openMenuId === cat.id

            return (
              <div
                key={cat.id}
                onClick={() => setTxEntity({ type: "category", id: cat.id, name: cat.nom, color: cat.color, iconName: cat.icona })}
                className={cn(
                  "group relative rounded-2xl border bg-white dark:bg-slate-900 p-4 cursor-pointer",
                  "border-slate-200 dark:border-slate-700/50",
                  "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.04)]",
                  "dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),0_6px_24px_rgba(0,0,0,0.2)]",
                  "transition-all hover:shadow-[0_2px_8px_rgba(15,23,42,0.08),0_8px_28px_rgba(15,23,42,0.07)]",
                  "dark:hover:border-slate-600/70"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: cat.color + "18" }}
                  >
                    <DynamicIcon name={cat.icona} className="w-5 h-5" style={{ color: cat.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate leading-tight">
                        {cat.nom}
                      </p>

                      {/* Actions dropdown */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(isMenuOpen ? null : cat.id)
                          }}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                            isMenuOpen
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                              : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-8 z-50 w-36 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(cat) }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                              Editar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(cat) }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Budget bar or activity */}
                    {cat.pressupost_mensual ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 tabular-nums">
                            {formatEuros(monthTotal)} gastats
                          </span>
                          <span className={cn(
                            "font-semibold tabular-nums",
                            budgetStatus === "red" && "text-rose-500",
                            budgetStatus === "yellow" && "text-amber-500",
                            budgetStatus === "green" && "text-emerald-500"
                          )}>
                            {formatEuros(cat.pressupost_mensual)} límit
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              budgetStatus === "red" && "bg-rose-500",
                              budgetStatus === "yellow" && "bg-amber-500",
                              budgetStatus === "green" && "bg-emerald-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        {monthTotal > 0 ? (
                          <>
                            <span className="font-semibold" style={{ color: cat.color }}>
                              {formatEuros(monthTotal)}
                            </span>
                            {" aquest mes"}
                          </>
                        ) : (
                          "Sense activitat aquest mes"
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Virtual "No category" card */}
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-500 dark:text-slate-400">Sense Categoria</p>
                <p className="text-xs text-slate-400 mt-0.5">Categoria virtual · no eliminable</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <CategoryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadData}
        category={editingCategory}
        defaultTipus={activeTab}
      />

      <EntityTransactionsModal
        isOpen={!!txEntity}
        onClose={() => setTxEntity(null)}
        entity={txEntity}
      />
    </div>
  )
}