import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, X } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { createEventTag } from "@/lib/db/queries/event-tags"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// Re-use the same icon registry used by CategoryIcon
import { iconMap, fallbackIcon } from "@/lib/iconMap"

// ─── Icon options — subset of iconMap keys most relevant for event tags ────────

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "Plane",       label: "Avió"        },
  { value: "Car",         label: "Cotxe"       },
  { value: "Train",       label: "Tren"        },
  { value: "Bus",         label: "Bus"         },
  { value: "Bed",         label: "Allotjament" },
  { value: "Utensils",    label: "Menjar"      },
  { value: "Coffee",      label: "Cafè"        },
  { value: "Ticket",      label: "Activitats"  },
  { value: "Camera",      label: "Turisme"     },
  { value: "Map",         label: "Mapa"        },
  { value: "ShoppingBag", label: "Compres"     },
  { value: "Gift",        label: "Regals"      },
  { value: "Music",       label: "Música"      },
  { value: "Dumbbell",    label: "Esport"      },
  { value: "Tag",         label: "General"     },
]

// ─── Color presets — same palette as AccountModal ─────────────────────────────

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b",
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const tagSchema = z.object({
  nom: z.string().min(2, "El nom és massa curt"),
  tipus_esdeveniment: z.string().min(1, "Selecciona un tipus"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color invàlid"),
  icona: z.string().min(1, "Selecciona una icona"),
})

type TagFormValues = z.infer<typeof tagSchema>

// ─── Component ────────────────────────────────────────────────────────────────

interface EventTagModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EventTagModal({ isOpen, onClose, onSuccess }: EventTagModalProps) {
  const { userId } = useAuthStore()

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { nom: "", tipus_esdeveniment: "viatge", color: "#3b82f6", icona: "Tag" },
  })

  useEffect(() => {
    if (isOpen) form.reset({ nom: "", tipus_esdeveniment: "viatge", color: "#3b82f6", icona: "Tag" })
  }, [isOpen, form])

  const onSubmit = async (values: TagFormValues) => {
    if (!userId) return
    try {
      await createEventTag(userId, values)
      toast.success("Etiqueta creada")
      onSuccess()
      onClose()
    } catch {
      toast.error("Error al crear l'etiqueta")
    }
  }

  const watchColor = form.watch("color")
  const watchIcona = form.watch("icona")
  const watchNom   = form.watch("nom")

  // Resolve the icon component from the shared iconMap — same path as CategoryIcon
  const PreviewIcon = iconMap[watchIcona] ?? fallbackIcon

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Nova Etiqueta
          </DialogTitle>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* ── Text fields block ── */}
            <div className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">

              {/* Nom */}
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem className="px-4 pt-3 pb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nom</p>
                    <FormControl>
                      <input
                        placeholder="Ex: Transport, Menjar, Activitats..."
                        className="w-full bg-transparent text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Tipus */}
              <FormField
                control={form.control}
                name="tipus_esdeveniment"
                render={({ field }) => (
                  <FormItem className="px-4 pt-3 pb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Tipus d'esdeveniment
                    </p>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-transparent border-none shadow-none p-0 h-auto text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-0 [&>svg]:text-slate-400">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="viatge">Viatge</SelectItem>
                        <SelectItem value="celebracio">Celebració</SelectItem>
                        <SelectItem value="altre">Altre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Icon grid — uses iconMap, same icons as categories ── */}
            <FormField
              control={form.control}
              name="icona"
              render={({ field }) => (
                <FormItem className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Icona</p>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_OPTIONS.map((opt) => {
                      const IconComp = iconMap[opt.value] ?? fallbackIcon
                      const isSelected = field.value === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all",
                            isSelected
                              ? "border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]"
                              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
                          )}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[9px] font-semibold leading-none">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* ── Color picker — fixed, same pattern as AccountModal ── */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Color</p>

                  {/* Preset swatches */}
                  <div className="flex flex-wrap gap-3 items-center">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className="w-8 h-8 rounded-full transition-all focus:outline-none shrink-0"
                        style={{
                          backgroundColor: color,
                          boxShadow: field.value === color
                            ? `0 0 0 2px white, 0 0 0 4px ${color}`
                            : "none",
                          transform: field.value === color ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}

                    {/* Custom color — hidden input behind a "+" circle, same as AccountModal */}
                    <label
                      className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors shrink-0 overflow-hidden relative"
                      title="Color personalitzat"
                    >
                      <input
                        type="color"
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-bold pointer-events-none">+</span>
                    </label>

                    {/* Current color preview swatch */}
                    <div
                      className="ml-auto w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                      style={{ backgroundColor: field.value }}
                    />
                  </div>
                </div>
              )}
            />

            {/* ── Live preview pill ── */}
            <div className="mx-5 mb-5 flex items-center gap-3">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold shadow-sm"
                style={{ backgroundColor: watchColor }}
              >
                <PreviewIcon className="w-3.5 h-3.5" />
                <span>{watchNom || "Etiqueta"}</span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Previsualització</span>
            </div>

            {/* ── Submit ── */}
            <div className="px-5 pb-5">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white"
              >
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear Etiqueta
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}