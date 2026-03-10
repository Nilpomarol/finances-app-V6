import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { getEvents, deleteEvent } from "@/lib/db/queries/events"
import { getEventTags, deleteEventTag } from "@/lib/db/queries/event-tags"
import type { Event, EventTag } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Trash2, Plane, PartyPopper, Tag as TagIcon, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { formatEuros } from "@/lib/utils"
import EventModal from "@/components/features/esdeveniments/EventModal"
import EventTagModal from "@/components/features/esdeveniments/EventTagModal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPUS_META: Record<string, { label: string; icon: React.ElementType; color: string; colorHex: string }> = {
  viatge:     { label: "Viatge",     icon: Plane,       color: "text-blue-500",  colorHex: "#3b82f6" },
  celebracio: { label: "Celebració", icon: PartyPopper, color: "text-pink-500",  colorHex: "#ec4899" },
  altre:      { label: "Altre",      icon: TagIcon,     color: "text-slate-500", colorHex: "#64748b" },
}

function getTypeMeta(tipus: string) {
  return TIPUS_META[tipus] ?? TIPUS_META["altre"]
}

function formatDateRange(start: number, end: number): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const sameYear = s.getFullYear() === e.getFullYear()
  const startStr = s.toLocaleDateString("ca-ES", opts)
  const endStr   = e.toLocaleDateString("ca-ES", { ...opts, year: sameYear ? undefined : "numeric" })
  const year     = e.getFullYear()
  return sameYear ? `${startStr} – ${endStr} ${year}` : `${startStr} – ${endStr}`
}

function getDays(start: number, end: number): number {
  return Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)))
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="h-1 bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-px bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse ml-auto" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EsdevenimentsPage() {
  const { userId } = useAuthStore()
  const navigate = useNavigate()

  const [events, setEvents] = useState<(Event & { total_despesa: number })[]>([])
  const [tags, setTags] = useState<EventTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"events" | "tags">("events")
  const [showEventModal, setShowEventModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description?: string; action: () => void }>({ open: false, title: "", action: () => {} })

  const loadData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [eventsData, tagsData] = await Promise.all([
        getEvents(userId),
        getEventTags(userId),
      ])
      setEvents(eventsData)
      setTags(tagsData)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleDeleteEvent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!userId) return
    setConfirmDialog({
      open: true,
      title: "Eliminar aquest esdeveniment?",
      action: async () => {
        setConfirmDialog(d => ({ ...d, open: false }))
        await deleteEvent(id, userId)
        loadData()
      },
    })
  }

  const handleDeleteTag = (id: string) => {
    if (!userId) return
    setConfirmDialog({
      open: true,
      title: "Eliminar l'etiqueta?",
      description: "Les transaccions associades es quedaran sense aquesta etiqueta.",
      action: async () => {
        setConfirmDialog(d => ({ ...d, open: false }))
        await deleteEventTag(id, userId)
        toast.success("Etiqueta eliminada")
        loadData()
      },
    })
  }

  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.tipus_esdeveniment]) acc[tag.tipus_esdeveniment] = []
    acc[tag.tipus_esdeveniment].push(tag)
    return acc
  }, {} as Record<string, EventTag[]>)

  const card = "rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05),0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3),0_6px_24px_rgba(0,0,0,0.3)]"

  // The action button changes depending on which tab is active
  const headerAction = activeTab === "events" ? (
    <Button onClick={() => setShowEventModal(true)}>
      <Plus className="w-4 h-4 mr-2" /> Nou Esdeveniment
    </Button>
  ) : (
    <Button onClick={() => setShowTagModal(true)}>
      <Plus className="w-4 h-4 mr-2" /> Nova Etiqueta
    </Button>
  )

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header — button is inline with the title via the `action` prop ── */}
      <PageHeader
        title="Esdeveniments i Viatges"
        subtitle={`${events.length} esdeveniments registrats`}
        action={headerAction}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "events" | "tags")}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="events">Esdeveniments</TabsTrigger>
          <TabsTrigger value="tags">Etiquetes</TabsTrigger>
        </TabsList>

        {/* ── EVENTS ── */}
        <TabsContent value="events" className="space-y-4 mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className={cn(card, "flex flex-col items-center justify-center py-20 gap-4")}>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Sense esdeveniments</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Crea el teu primer viatge o celebració</p>
              </div>
              <Button variant="outline" onClick={() => setShowEventModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nou Esdeveniment
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => {
                const meta = getTypeMeta(event.tipus)
                const Icon = meta.icon
                const days = getDays(event.data_inici, event.data_fi)

                return (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/esdeveniments/${event.id}`)}
                    className={cn(
                      "group text-left w-full overflow-hidden relative",
                      card,
                      "hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                    )}
                  >
                    {/* Top colour strip */}
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: meta.colorHex }} />

                    <div className="p-5 pt-6">
                      {/* Type chip + delete */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: `${meta.colorHex}15`, color: meta.colorHex }}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </div>
                        <button
                          onClick={(e) => handleDeleteEvent(e, event.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Name */}
                      <p className="font-bold text-base text-slate-900 dark:text-white leading-snug mb-1 truncate">
                        {event.nom}
                      </p>

                      {/* Date range + days badge */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-4">
                        <span>{formatDateRange(event.data_inici, event.data_fi)}</span>
                        <span
                          className="ml-auto shrink-0 font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${meta.colorHex}15`, color: meta.colorHex }}
                        >
                          {days}d
                        </span>
                      </div>

                      {/* Total spent */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Total gastat</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "font-bold text-sm tabular-nums",
                            event.total_despesa > 0 ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {formatEuros(event.total_despesa)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAGS ── */}
        <TabsContent value="tags" className="space-y-6 mt-0">

          {/* Info bar — no button here anymore, it's in the PageHeader */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 px-5 py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Les etiquetes subdivideixen les despeses dins d'un viatge.
              S'associen al <span className="font-semibold text-slate-700 dark:text-slate-200">tipus d'esdeveniment</span>.
            </p>
          </div>

          {/* Empty state */}
          {!isLoading && tags.length === 0 && (
            <div className={cn(card, "flex flex-col items-center justify-center py-16 gap-3")}>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Encara no hi ha etiquetes</p>
            </div>
          )}

          {/* Tags grouped by type */}
          {Object.entries(tagsByType).map(([tipus, tagsDelTipus]) => {
            const meta = getTypeMeta(tipus)
            const TypeIcon = meta.icon
            return (
              <div key={tipus}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.colorHex}15` }}
                  >
                    <TypeIcon className="w-3.5 h-3.5" style={{ color: meta.colorHex }} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{meta.label}</h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                    {tagsDelTipus.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {tagsDelTipus.map(tag => (
                    <div
                      key={tag.id}
                      className="group flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{tag.nom}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 dark:text-slate-600 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      <EventModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} onSuccess={loadData} />
      <EventTagModal isOpen={showTagModal} onClose={() => setShowTagModal(false)} onSuccess={loadData} />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Eliminar"
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  )
}