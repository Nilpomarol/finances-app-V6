import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import { getCategories } from "@/lib/db/queries/categories"
import { getRules, createRule, deleteRule, type AssignmentRule } from "@/lib/db/queries/rules"
import { getTransactions } from "@/lib/db/queries/transactions"
import { recalculateAllBalances } from "@/lib/db/queries/accounts"
import { syncRecurringTemplatesFromTransactions } from "@/lib/db/queries/recurring-templates"
import { exportUserData } from "@/lib/export-import"
import type { Category, TransactionWithRelations } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ColorDot } from "@/components/shared/ColorDot"
import { PageHeader } from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"
import {
  Trash2, Plus, Sparkles, Download, Loader2, ArrowRight,
  RefreshCw, CheckCircle2, Shield, Sun, Moon, LogOut, Repeat
} from "lucide-react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

type RuleSuggestion = {
  key: string
  concepte: string
  categoria_id: string
  categoria_nom: string
  categoria_color: string
  count: number
  coveredBy?: string
}

function detectRuleSuggestions(txs: TransactionWithRelations[], existingRules: AssignmentRule[]): RuleSuggestion[] {
  const groups = new Map<string, TransactionWithRelations[]>()
  for (const tx of txs) {
    if (!tx.categoria_id) continue
    const key = tx.concepte.trim().toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const suggestions: RuleSuggestion[] = []
  for (const [key, instances] of groups) {
    if (instances.length < 2) continue
    const votes = new Map<string, { count: number; nom: string; color: string }>()
    for (const tx of instances) {
      if (!tx.categoria_id) continue
      const existing = votes.get(tx.categoria_id)
      if (existing) existing.count++
      else votes.set(tx.categoria_id, { count: 1, nom: tx.categoria_nom || '', color: tx.categoria_color || '#ccc' })
    }
    let bestId = '', bestCount = 0, bestNom = '', bestColor = '#ccc'
    for (const [id, { count, nom, color }] of votes) {
      if (count > bestCount) { bestId = id; bestCount = count; bestNom = nom; bestColor = color }
    }
    if (!bestId) continue
    const matchingRule = existingRules.find(r => key.includes(r.paraula_clau.toLowerCase()))
    suggestions.push({ key, concepte: instances[0].concepte, categoria_id: bestId, categoria_nom: bestNom, categoria_color: bestColor, count: instances.length, coveredBy: matchingRule?.paraula_clau })
  }

  return suggestions.sort((a, b) => b.count - a.count)
}

export default function ConfiguracioPage() {
  const { userId, logout } = useAuthStore()
  const { toast } = useToast()
  const { theme, toggleTheme } = useThemeStore()

  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isExporting, setIsExporting] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isSyncingRecurrents, setIsSyncingRecurrents] = useState(false)

  const [newKeyword, setNewKeyword] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description?: string; confirmText?: string; action: () => void }>({ open: false, title: "", action: () => {} })

  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<RuleSuggestion[] | null>(null)
  const [editedKeywords, setEditedKeywords] = useState<Record<string, string>>({})
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<Set<string>>(new Set())

  const loadData = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [cats, rls] = await Promise.all([
        getCategories(userId),
        getRules(userId),
      ])
      setCategories(cats)
      setRules(rls)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  const handleExport = async () => {
    if (!userId) return
    setIsExporting(true)
    try {
      await exportUserData(userId)
      toast({ title: "Còpia de seguretat descarregada correctament!" })
    } catch (error) {
      toast({ variant: "destructive", title: "Error al generar la còpia de seguretat." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleRecalculate = async () => {
    if (!userId) return
    setIsRecalculating(true)
    try {
      const result = await recalculateAllBalances(userId)
      toast({
        title: "Saldos recalculats correctament!",
        description: `${result.accountsUpdated} comptes i ${result.peopleUpdated} persones actualitzades.`
      })
    } catch (error) {
      toast({ variant: "destructive", title: "Error al recalcular els saldos." })
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleSyncRecurrents = async () => {
    if (!userId) return
    setIsSyncingRecurrents(true)
    try {
      const result = await syncRecurringTemplatesFromTransactions(userId)
      toast({
        title: "Recurrents sincronitzats",
        description: result.created > 0
          ? `${result.created} templates nous creats.`
          : "Tots els recurrents ja estaven sincronitzats.",
      })
    } catch {
      toast({ variant: "destructive", title: "Error al sincronitzar recurrents." })
    } finally {
      setIsSyncingRecurrents(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userId || !newKeyword.trim() || !newCategoryId) {
      toast({ variant: "destructive", title: "Omple tots els camps" })
      return
    }

    setIsSubmitting(true)
    try {
      await createRule(userId, newKeyword.trim(), newCategoryId)
      toast({ title: "Regla creada correctament" })
      setNewKeyword("")
      setNewCategoryId("")
      loadData()
    } catch (error) {
      toast({ variant: "destructive", title: "Error al crear la regla" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!userId) return
    setConfirmDialog({
      open: true,
      title: "Eliminar aquesta regla?",
      action: async () => {
        setConfirmDialog(d => ({ ...d, open: false }))
        try {
          await deleteRule(id, userId)
          toast({ title: "Regla eliminada" })
          loadData()
        } catch (error) {
          toast({ variant: "destructive", title: "Error al eliminar" })
        }
      },
    })
  }

  const handleSuggestRules = async () => {
    if (!userId) return
    setIsSuggesting(true)
    setSuggestions(null)
    try {
      const now = new Date()
      const dateStart = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).getTime()
      const txs = await getTransactions({ userId, dateStart, dateEnd: now.getTime(), excludeLiquidacions: true, limit: 10000 })
      const result = detectRuleSuggestions(txs, rules)
      setSuggestions(result)
      const keywords: Record<string, string> = {}
      const keys = new Set<string>()
      for (const s of result) {
        keywords[s.key] = s.concepte
        if (!s.coveredBy) keys.add(s.key)
      }
      setEditedKeywords(keywords)
      setSelectedSuggestionKeys(keys)
    } catch {
      toast({ variant: "destructive", title: "Error al generar suggeriments." })
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleCreateSuggestedRules = async () => {
    if (!userId || !suggestions) return
    const toCreate = suggestions.filter(s => selectedSuggestionKeys.has(s.key))
    let created = 0
    for (const s of toCreate) {
      const keyword = (editedKeywords[s.key] ?? s.concepte).trim()
      if (!keyword) continue
      try {
        await createRule(userId, keyword, s.categoria_id)
        created++
      } catch { /* skip duplicates or errors silently */ }
    }
    toast({ title: `${created} regles creades correctament` })
    setSuggestions(null)
    setSelectedSuggestionKeys(new Set())
    loadData()
  }

  const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Configuració"
        subtitle="Gestiona les teves dades, eines del sistema i regles d'assignació automàtica."
      />

      {/* ── EINES ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Eines del sistema
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 h-44" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

            {/* MODE FOSC */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                  {theme === "dark"
                    ? <Sun className="w-5 h-5 text-violet-500" />
                    : <Moon className="w-5 h-5 text-violet-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Aparença</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    {theme === "dark"
                      ? "Ara estàs en mode fosc. Canvia al mode clar."
                      : "Ara estàs en mode clar. Canvia al mode fosc."}
                  </p>
                </div>
                <Button onClick={toggleTheme} size="sm" variant="outline" className="w-full">
                  {theme === "dark"
                    ? <><Sun className="w-4 h-4 mr-2" />Mode clar</>
                    : <><Moon className="w-4 h-4 mr-2" />Mode fosc</>}
                </Button>
              </div>
            </div>

            {/* CÒPIA DE SEGURETAT */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Còpia de Seguretat</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Descarrega totes les teves dades en un fitxer JSON per guardar-les de forma segura.
                  </p>
                </div>
                <Button onClick={handleExport} disabled={isExporting} size="sm" className="w-full">
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExporting ? "Generant..." : "Exportar dades"}
                </Button>
              </div>
            </div>

            {/* RECALCULAR SALDOS */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Recalcular Saldos</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Recalcula tots els saldos de comptes i persones des de zero si detectes inconsistències.
                  </p>
                </div>
                <Button onClick={handleRecalculate} disabled={isRecalculating} size="sm" variant="outline" className="w-full">
                  {isRecalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {isRecalculating ? "Recalculant..." : "Recalcular tot"}
                </Button>
              </div>
            </div>

            {/* SINCRONITZAR RECURRENTS */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5 text-teal-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Sincronitzar Recurrents</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Crea templates per a transaccions marcades com a recurrents, amb data d'inici a la primera transacció real.
                  </p>
                </div>
                <Button onClick={handleSyncRecurrents} disabled={isSyncingRecurrents} size="sm" variant="outline" className="w-full">
                  {isSyncingRecurrents ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Repeat className="w-4 h-4 mr-2" />}
                  {isSyncingRecurrents ? "Sincronitzant..." : "Sincronitzar"}
                </Button>
              </div>
            </div>

            {/* VERSIÓ PWA */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Versió de l'App</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">v1.0.0</span>
                    <span className="text-xs text-slate-400">· PWA</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Comprova si hi ha noves actualitzacions disponibles.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(r => r.update())
                      })
                      toast({ title: "Comprovant actualitzacions..." })
                      setTimeout(() => window.location.reload(), 2000)
                    } else {
                      toast({ title: "No hi ha Service Worker actiu." })
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Comprovar actualitzacions
                </Button>
              </div>
            </div>

            {/* TANCAR SESSIÓ */}
            <div className={card}>
              <div className="p-5 flex flex-col gap-4 h-full">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Tancar Sessió</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    Tanca la sessió actual i torna a la pantalla d'accés.
                  </p>
                </div>
                <Button
                  onClick={() => setConfirmDialog({
                    open: true,
                    title: "Tancar la sessió?",
                    description: "Es tancarà la sessió actual i hauràs d'introduir la contrasenya familiar i el PIN per tornar a accedir.",
                    confirmText: "Tancar sessió",
                    action: () => {
                      setConfirmDialog(d => ({ ...d, open: false }))
                      logout()
                    },
                  })}
                  size="sm"
                  variant="outline"
                  className="w-full text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Tancar sessió
                </Button>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ── REGLES D'ASSIGNACIÓ ───────────────────────────────────────── */}
      {!isLoading && (
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Regles d'assignació automàtica
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSuggestRules}
              disabled={isSuggesting}
              className="h-7 px-3 text-xs"
            >
              {isSuggesting
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {isSuggesting ? "Analitzant..." : "Suggerir regles"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* FORMULARI */}
            <div className={cn(card, "md:col-span-1 h-fit")}>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Nova regla</p>
                    <p className="text-xs text-slate-400">Assignació automàtica per paraula clau</p>
                  </div>
                </div>

                <form onSubmit={handleAddRule} className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Paraula clau (ex: MERCADONA)
                    </label>
                    <Input
                      placeholder="Text a buscar..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Assignar a la categoria
                    </label>
                    <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <ColorDot color={cat.color} className="w-2 h-2" />
                              {cat.nom}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear regla
                  </Button>
                </form>
              </div>
            </div>

            {/* LLISTAT */}
            <div className={cn(card, "md:col-span-2")}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Les teves regles</p>
                {rules.length > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {rules.length}
                  </span>
                )}
              </div>

              <div className="p-5">
                {rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Encara no tens cap regla</p>
                    <p className="text-xs text-slate-400 mt-1">Crea'n una per agilitzar la importació de CSVs.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map(rule => {
                      const category = categories.find(c => c.id === rule.categoria_id)
                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0">
                              {rule.paraula_clau}
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:block shrink-0" />
                            <div className="flex items-center gap-2 min-w-0">
                              <ColorDot color={category?.color || '#ccc'} className="w-2 h-2 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {category?.nom || 'Categoria eliminada'}
                              </span>
                            </div>
                          </div>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0 ml-3"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Suggestions panel */}
          {suggestions !== null && (
            <div className={card}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Regles suggerides</p>
                  <p className="text-xs text-slate-400 mt-0.5">{suggestions.length} suggeriment{suggestions.length !== 1 ? 's' : ''} basat{suggestions.length !== 1 ? 's' : ''} en transaccions categoritzades</p>
                </div>
                {suggestions.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleCreateSuggestedRules}
                    disabled={selectedSuggestionKeys.size === 0}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Crear seleccionades ({selectedSuggestionKeys.size})
                  </Button>
                )}
              </div>

              {suggestions.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cap suggeriment disponible</p>
                  <p className="text-xs text-slate-400 mt-1">Categoritza algunes transaccions manualment per generar suggeriments.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Column headers */}
                  <div
                    className="grid items-center gap-x-3 px-5 py-2 bg-slate-50 dark:bg-slate-800/40"
                    style={{ gridTemplateColumns: '1rem 1fr 9rem 1rem 10rem 2rem' }}
                  >
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Paraula clau</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cobertura</span>
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Categoria</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">N</span>
                  </div>
                  {suggestions.map(s => (
                    <div
                      key={s.key}
                      className={cn(
                        "grid items-center gap-x-3 px-5 py-2.5 transition-colors",
                        selectedSuggestionKeys.has(s.key) ? "hover:bg-slate-50 dark:hover:bg-slate-800/30" : "opacity-50"
                      )}
                      style={{ gridTemplateColumns: '1rem 1fr 9rem 1rem 10rem 2rem' }}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-violet-500"
                        checked={selectedSuggestionKeys.has(s.key)}
                        onChange={() => {
                          setSelectedSuggestionKeys(prev => {
                            const next = new Set(prev)
                            if (next.has(s.key)) next.delete(s.key)
                            else next.add(s.key)
                            return next
                          })
                        }}
                      />
                      <Input
                        className="h-7 text-xs font-mono w-full"
                        value={editedKeywords[s.key] ?? s.concepte}
                        onChange={e => setEditedKeywords(prev => ({ ...prev, [s.key]: e.target.value }))}
                      />
                      <div className="min-w-0">
                        {s.coveredBy ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 truncate max-w-full">
                            <span className="font-mono truncate">{s.coveredBy}</span>
                          </span>
                        ) : <span />}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 justify-self-center" />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ColorDot color={s.categoria_color} className="w-2 h-2 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{s.categoria_nom}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums text-right">{s.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText ?? "Eliminar"}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  )
}
