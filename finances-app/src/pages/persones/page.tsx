import { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { getPeople, deletePerson } from "@/lib/db/queries/people"
import { getAccounts } from "@/lib/db/queries/accounts"
import type { Account, Person } from "@/types/database"

import PersonModal from "@/components/features/persones/PersonModal"
import SettleUpModal from "@/components/features/persones/SettleUpModal"
import PersonHistoryModal from "@/components/features/persones/PersonHistoryModal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import { cn, formatEuros } from "@/lib/utils"

export default function PersonesPage() {
  const { userId } = useAuthStore()
  const [people, setPeople] = useState<(Person & { balance: number })[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [showModal, setShowModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | undefined>()
  const [settlePerson, setSettlePerson] = useState<(Person & { balance: number }) | null>(null)
  const [historyPerson, setHistoryPerson] = useState<(Person & { balance: number }) | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [ppl, accs] = await Promise.all([getPeople(userId), getAccounts(userId)])
      setPeople(ppl)
      setAccounts(accs)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (person: Person) => {
    if (!userId || !confirm(`Eliminar a ${person.nom}?`)) return
    await deletePerson(person.id, userId)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Persones i Deutes</h1>
        <Button onClick={() => { setEditingPerson(undefined); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Persona
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-24 animate-pulse" />)}
        </div>
      ) : people.length === 0 ? (
        <Card className="py-16 text-center">
            <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <p>Cap persona afegida encara.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.filter(p => !p.amagat).map(person => (
            <Card 
              key={person.id} 
              className="group p-4 flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setHistoryPerson(person)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {person.nom.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{person.nom}</p>
                    <p className={cn(
                      "text-sm",
                      person.balance > 0 ? "text-green-600" : person.balance < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {person.balance > 0 ? "Et deu: " : person.balance < 0 ? "Li deus: " : "Al corrent"}
                      {formatEuros(Math.abs(person.balance))}
                    </p>
                  </div>
                </div>

                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingPerson(person); setShowModal(true) }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(person) }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {person.balance > 0 && (
                <Button 
                  size="sm" className="mt-4 w-full bg-green-600 hover:bg-green-700 h-8 text-white"
                  onClick={(e) => { e.stopPropagation(); setSettlePerson(person) }}
                >
                  M'ha pagat
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <PersonModal open={showModal} onClose={() => setShowModal(false)} onSuccess={loadData} person={editingPerson} />
      
      {settlePerson && (
        <SettleUpModal 
          isOpen={!!settlePerson} 
          onClose={() => setSettlePerson(null)} 
          onSuccess={loadData} 
          person={settlePerson} 
          accounts={accounts} 
        />
      )}

      <PersonHistoryModal 
        isOpen={!!historyPerson} 
        onClose={() => setHistoryPerson(null)} 
        person={historyPerson} 
      />
    </div>
  )
}