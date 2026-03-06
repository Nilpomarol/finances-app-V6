import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { getCategories } from "@/lib/db/queries/categories"
import { getRules, createRule, deleteRule, type AssignmentRule } from "@/lib/db/queries/rules"
import { exportUserData } from "@/lib/export-import"
import type { Category } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus, Sparkles, Download, Loader2, ArrowRight } from "lucide-react"

export default function ConfiguracioPage() {
  const { userId } = useAuthStore()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estat per a l'exportació
  const [isExporting, setIsExporting] = useState(false)

  // Estat del formulari per a una nova regla
  const [newKeyword, setNewKeyword] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [cats, rls] = await Promise.all([
        getCategories(userId),
        getRules(userId)
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
    if (!userId || !confirm("Segur que vols eliminar aquesta regla?")) return
    try {
      await deleteRule(id, userId)
      toast({ title: "Regla eliminada" })
      loadData()
    } catch (error) {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Carregant configuració...</div>
  }

  // Només volem mostrar categories de tipus "despesa" o "ingres" per a les regles
  const assignableCategories = categories.filter(c => c.tipus !== 'transferencia')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configuració i Automatitzacions</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona les preferències, les teves dades i com l'aplicació categoritza automàticament els teus moviments.
        </p>
      </div>

      {/* TARGETA DE CÒPIA DE SEGURETAT */}
      <Card>
        <CardHeader>
          <CardTitle>Còpia de Seguretat Local</CardTitle>
          <CardDescription>
            Descarrega totes les teves dades (comptes, categories i transaccions) en un fitxer JSON de seguretat. És recomanable fer-ho regularment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? "Generant fitxer..." : "Descarregar dades (.json)"}
          </Button>
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
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color || '#ccc' }} />
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
    </div>
  )
}