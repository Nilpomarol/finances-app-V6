import { Calendar, FilterX } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFilterStore } from "@/store/filterStore"
import type { Account, Category } from "@/types/database"

interface Props {
  accounts: Account[]
  categories: Category[]
}

export function AnalysisFilters({ accounts, categories }: Props) {
  const { periode, compteIds, categoriaIds, setPeriode, setCompteIds, setCategoriaIds, resetFilters } = useFilterStore()

  return (
    <Card className="bg-muted/30 border-none shadow-none p-4 flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2 bg-background p-1 px-3 rounded-md border">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select 
          value={`${periode?.mes}-${periode?.any}`} 
          onValueChange={(v) => {
            const [m, a] = v.split('-').map(Number)
            setPeriode({ mes: m, any: a })
          }}
        >
          <SelectTrigger className="border-none shadow-none w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date(); d.setMonth(d.getMonth() - i)
              return <SelectItem key={i} value={`${d.getMonth()+1}-${d.getFullYear()}`}>
                {d.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
              </SelectItem>
            })}
          </SelectContent>
        </Select>
      </div>

      <Select value={compteIds[0] || "all"} onValueChange={(v) => setCompteIds(v === "all" ? [] : [v])}>
        <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Tots els comptes" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tots els comptes</SelectItem>
          {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={categoriaIds[0] || "all"} onValueChange={(v) => setCategoriaIds(v === "all" ? [] : [v])}>
        <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Totes les categories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Totes les categories</SelectItem>
          {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto text-muted-foreground">
        <FilterX className="w-4 h-4 mr-2" /> Restablir
      </Button>
    </Card>
  )
}