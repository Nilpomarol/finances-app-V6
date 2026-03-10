import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createEventTag } from "@/lib/db/queries/event-tags"
import { ICON_OPTIONS } from "@/lib/iconOptions"
import DynamicIcon from "@/components/shared/DynamicIcon"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"


// ─── Color presets — identical to CategoryModal ───────────────────────────────

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b", "#84cc16", "#f43f5e",
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const tagSchema = z.object({
  nom: z.string().min(1, "El nom és obligatori").max(50),
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
    defaultValues: { nom: "", tipus_esdeveniment: "viatge", color: "#3b82f6", icona: "tag" },
  })

  useEffect(() => {
    if (isOpen) form.reset({ nom: "", tipus_esdeveniment: "viatge", color: "#3b82f6", icona: "tag" })
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

  const selectedIcon  = form.watch("icona")
  const selectedColor = form.watch("color")
  const watchNom      = form.watch("nom")

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* ── Header with live icon preview — mirrors CategoryModal ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Live icon preview */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{ backgroundColor: selectedColor + "18" }}
            >
              <DynamicIcon name={selectedIcon} className="w-5 h-5 transition-colors" style={{ color: selectedColor }} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Nova Etiqueta
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {watchNom || "Etiqueta d'esdeveniment"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-80px)]">

            {/* ── Nom + Tipus grouped card ── */}
            <div className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">

              {/* Nom */}
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem className="px-4 pt-3 pb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Nom
                    </p>
                    <FormControl>
                      <input
                        placeholder="Ex: Transport, Allotjament, Menjar..."
                        className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Tipus d'esdeveniment */}
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
                        <SelectTrigger className="bg-transparent border-none shadow-none p-0 h-auto text-sm font-medium text-slate-900 dark:text-white focus:ring-0 [&>svg]:text-slate-400">
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

            {/* ── Color — identical to CategoryModal ── */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className="w-7 h-7 rounded-full transition-all focus:outline-none shrink-0"
                        style={{
                          backgroundColor: color,
                          boxShadow: field.value === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                          transform: field.value === color ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    ))}
                    <label
                      className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors shrink-0 overflow-hidden relative"
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
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* ── Icon grid — 8 cols, w-9 h-9, DynamicIcon, selected uses selectedColor ── */}
            <FormField
              control={form.control}
              name="icona"
              render={({ field }) => (
                <FormItem className="mx-5 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Icona
                  </p>
                  <div className="grid grid-cols-8 gap-1.5">
                    {ICON_OPTIONS.map((icon) => {
                      const isSelected = field.value === icon.value
                      return (
                        <button
                          key={icon.value}
                          type="button"
                          title={icon.label}
                          onClick={() => field.onChange(icon.value)}
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                            isSelected
                              ? "shadow-sm"
                              : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                          )}
                          style={isSelected ? {
                            backgroundColor: selectedColor + "18",
                            color: selectedColor,
                          } : {}}
                        >
                          <DynamicIcon name={icon.value} className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* ── Submit ── */}
            <div className="px-5 pb-5">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl text-white transition-colors"
                style={{ backgroundColor: selectedColor }}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Crear Etiqueta
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}