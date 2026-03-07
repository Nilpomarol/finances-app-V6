import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { getEvents, deleteEvent } from "@/lib/db/queries/events"
import { getEventTags, deleteEventTag } from "@/lib/db/queries/event-tags"
import type { Event, EventTag } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Trash2 } from "lucide-react"
import { formatEuros } from "@/lib/utils"
import EventModal from "@/components/features/esdeveniments/EventModal"
import { useToast } from "@/hooks/use-toast"
import EventTagModal from "@/components/features/esdeveniments/EventTagModal"

export default function EsdevenimentsPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [events, setEvents] = useState<(Event & { total_despesa: number })[]>([])
  const [tags, setTags] = useState<EventTag[]>([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  // const [showTagModal, setShowTagModal] = useState(false) // Para cuando crees el modal del Tag

  const loadData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [eventsData, tagsData] = await Promise.all([
        getEvents(userId),
        getEventTags(userId)
      ])
      setEvents(eventsData)
      setTags(tagsData)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleDeleteEvent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!userId || !confirm("Segur que vols eliminar aquest esdeveniment?")) return
    await deleteEvent(id, userId)
    loadData()
  }

  const handleDeleteTag = async (id: string) => {
    if (!userId || !confirm("Si elimines l'etiqueta, les transaccions associades es quedaran sense ella. Continuar?")) return
    await deleteEventTag(id, userId)
    toast({ title: "Etiqueta eliminada" })
    loadData()
  }

  // Agrupamos los tags por tipo de evento para mostrarlos organizados
  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.tipus_esdeveniment]) acc[tag.tipus_esdeveniment] = []
    acc[tag.tipus_esdeveniment].push(tag)
    return acc
  }, {} as Record<string, EventTag[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Esdeveniments i Viatges</h1>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="events">Esdeveniments</TabsTrigger>
          <TabsTrigger value="tags">Etiquetes (Tags)</TabsTrigger>
        </TabsList>

        {/* PESTAÑA: EVENTOS */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-end">
             <Button onClick={() => setShowEventModal(true)}>
               <Plus className="w-4 h-4 mr-2" /> Nou Esdeveniment
             </Button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/50" />)}
            </div>
          ) : events.length === 0 ? (
            <Card className="text-center py-20 border-2 border-dashed">
              <Calendar className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Encara no has creat cap esdeveniment.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => (
                <Card 
                  key={event.id} 
                  className="relative group cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/esdeveniments/${event.id}`)}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg font-bold">{event.nom}</CardTitle>
                    <Button 
                      size="icon" variant="ghost" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" 
                      onClick={(e) => handleDeleteEvent(e, event.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground font-medium capitalize">{event.tipus}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(event.data_inici).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t">
                      <span className="text-muted-foreground">Total gastat:</span>
                      <span className="font-bold text-primary text-base">{formatEuros(event.total_despesa)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PESTAÑA: ETIQUETAS (TAGS) */}
        <TabsContent value="tags" className="space-y-6">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              Les etiquetes serveixen per subdividir les despeses dins d'un viatge (ex: Transport, Menjar).
              Estan associades al <span className="font-bold">tipus d'esdeveniment</span>.
            </p>
            {/* Aquí iría el botón para crear un nuevo Tag manualmente */}
            {/* Canvia el botó existent per aquest: */}
            <Button variant="outline" onClick={() => setShowTagModal(true)}>
              <Plus className="w-4 h-4 mr-2"/> Nova Etiqueta
            </Button>

            {/* I afegeix el component del modal just a sota de l'EventModal, al final de l'arxiu: */}
            <EventModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSuccess={loadData} />
            <EventTagModal isOpen={showTagModal} onClose={() => setShowTagModal(false)} onSuccess={loadData} />
          </div>

          {Object.entries(tagsByType).map(([tipus, tagsDelTipus]) => (
            <div key={tipus} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize border-b pb-2">{tipus}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tagsDelTipus.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border rounded-md shadow-sm bg-background">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm font-medium">{tag.nom}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteTag(tag.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <EventModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSuccess={loadData} />
    </div>
  )
}