import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { getCategories } from "@/lib/db/queries/categories"
import { getRules, createRule, deleteRule, type AssignmentRule } from "@/lib/db/queries/rules"
import { getTransactions } from "@/lib/db/queries/transactions"
import { recalculateAllBalances } from "@/lib/db/queries/accounts"
import { exportUserData } from "@/lib/export-import"
import type { Category, TransactionWithRelations } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ColorDot } from "@/components/shared/ColorDot"
import {
  Trash2, Plus, Sparkles, Download, Loader2, ArrowRight,
  RefreshCw, Repeat, Info, CheckCircle2, Shield
} from "lucide-react"
import { formatEuros, formatDate } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

export default function ConfiguracioPage() {
  const { userId } = useAuthStore()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [recurrents, setRecurrents] = useState<TransactionWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estat per a l'exportació
  const [isExporting, setIsExporting] = useState(false)
  // Estat per al recàlcul de saldos
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Estat del formulari per a una nova regla
  const [newKeyword, setNewKeyword] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; action: () => void }>({ open: false, title: "", action: () => {} })

  const loadData = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()

      const [cats, rls, txs] = await Promise.all([
        getCategories(userId),
        getRules(userId),
        getTransactions({
          userId,
          dateStart: firstDay,
          dateEnd: lastDay,
          excludeLiquidacions: true,
          limit: 10000
        })
      ])
      setCategories(cats)
      setRules(rls)
      setRecurrents(txs.filter(t => t.recurrent))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId])

  // --- FUNCIÓ D'EXPORTACIÓ ---
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

  // --- FUNCIÓ RECÀLCUL DE SALDOS ---
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

  // --- FUNCIONS DE REGLES ---
  const handleAddRule = async (e: React.FormEvent) => {
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

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Carregant configuració...</div>
  }

  const assignableCategories = categories

  // Agrupem recurrents per categoria
  const recurrentsByCategory = recurrents.reduce<Record<string, { nom: string; color: string; total: number; count: number }>>((acc, tx) => {
    const key = tx.categoria_nom || 'Sense categoria'
    if (!acc[key]) acc[key] = { nom: key, color: tx.categoria_color || '#ccc', total: 0, count: 0 }
    acc[key].total += tx.import_trs
    acc[key].count += 1
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configuració i Eines</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona les preferències, les teves dades i com l'aplicació categoritza automàticament els teus moviments.
        </p>
      </div>

      {/* FILA SUPERIOR: Backup + Recàlcul + PWA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CÒPIA DE SEGURETAT */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              Còpia de Seguretat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Descarrega totes les teves dades en un fitxer JSON.
            </p>
            <Button onClick={handleExport} disabled={isExporting} size="sm" className="w-full">
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? "Generant..." : "Exportar dades (.json)"}
            </Button>
          </CardContent>
        </Card>

        {/* RECALCULAR SALDOS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Recalcular Saldos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Recalcula tots els saldos de comptes i persones des de zero.
            </p>
            <Button onClick={handleRecalculate} disabled={isRecalculating} size="sm" variant="outline" className="w-full">
              {isRecalculating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isRecalculating ? "Recalculant..." : "Recalcular tot"}
            </Button>
          </CardContent>
        </Card>

        {/* VERSIÓ PWA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Versió de l'App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-mono font-medium">v1.0.0</span>
              <span className="text-xs text-muted-foreground">• PWA</span>
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
          </CardContent>
        </Card>
      </div>

      {/* DESPESES RECURRENTS DEL MES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Despeses Recurrents (Mes Actual)
          </CardTitle>
          <CardDescription>
            Transaccions marcades com a recurrents per al mes en curs. Útil per controlar despeses fixes com subscripcions, lloguers, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurrents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
              <Repeat className="mx-auto w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Cap despesa recurrent trobada aquest mes.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Marca una transacció com a "recurrent" al crear-la per veure-la aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resum per categories */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(recurrentsByCategory).sort((a, b) => b.total - a.total).map(cat => (
                  <div key={cat.nom} className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <ColorDot color={cat.color} className="w-2.5 h-2.5" />
                      <span className="text-xs font-medium truncate">{cat.nom}</span>
                    </div>
                    <div className="text-sm font-bold">{formatEuros(cat.total)}</div>
                    <div className="text-xs text-muted-foreground">{cat.count} moviment{cat.count > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>

              {/* Llista detallada */}
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {recurrents.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium truncate">{tx.concepte}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.data)} • {tx.compte_nom ?? (tx.pagat_per_nom ? `Pagat per ${tx.pagat_per_nom}` : '—')} • {tx.categoria_nom || 'Sense cat.'}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.tipus === 'ingres' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {tx.tipus === 'ingres' ? '+' : '-'}{formatEuros(tx.import_trs)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Total recurrent del mes: <span className="font-semibold text-foreground">
                    {formatEuros(recurrents.reduce((s, t) => s + (t.tipus === 'despesa' ? t.import_trs : 0), 0))}
                  </span> en despeses fixes.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓ DE REGLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FORMULARI CREACIÓ DE REGLES */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Nova Regla
            </CardTitle>
            <CardDescription>
              Si el concepte de l'extracte del banc conté una paraula clau, se li assignarà la categoria triada automàticament.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Paraula clau (ex: MERCADONA)</label>
                <Input
                  placeholder="Text a buscar..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assignar a la categoria</label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableCategories.map(cat => (
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
                Crear Regla
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* LLISTAT DE REGLES EXISTENTS */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Les teves Regles d'Assignació</CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <Sparkles className="mx-auto w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No tens cap regla creada.</p>
                <p className="text-xs text-muted-foreground mt-1">Crea'n una per agilitzar la importació de CSVs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => {
                  const category = categories.find(c => c.id === rule.categoria_id)
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-md font-mono text-sm font-bold">
                          "{rule.paraula_clau}"
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        <div className="flex items-center gap-2">
                          <ColorDot color={category?.color || '#ccc'} />
                          <span className="font-medium text-sm">{category?.nom || 'Categoria eliminada'}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        confirmText="Eliminar"
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  )
}
