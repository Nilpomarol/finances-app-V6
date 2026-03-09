import { useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createCategory, updateCategory } from "@/lib/db/queries/categories"
import { ICON_OPTIONS } from "@/lib/iconOptions"
import DynamicIcon from "@/components/shared/DynamicIcon"
import type { Category } from "@/types/database"
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
import { Loader2, X, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const categorySchema = z.object({
  nom: z.string().min(1, "El nom és obligatori").max(50),
  tipus: z.enum(["despesa", "ingres"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color invàlid"),
  icona: z.string().min(1, "Selecciona una icona"),
  pressupost_mensual: z.coerce.number().min(0).nullable().optional(),
})

type CategoryFormValues = {
  nom: string
  tipus: "despesa" | "ingres"
  color: string
  icona: string
  pressupost_mensual?: number | null
}

const defaultValues: CategoryFormValues = {
  nom: "",
  tipus: "despesa",
  color: "#6366f1",
  icona: "tag",
  pressupost_mensual: null,
}

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b", "#84cc16", "#f43f5e",
]

interface CategoryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  category?: Category
  defaultTipus?: "despesa" | "ingres"
}

export default function CategoryModal({
  open, onClose, onSuccess, category, defaultTipus = "despesa",
}: CategoryModalProps) {
  const { userId } = useAuthStore()
  const isEditing = !!category

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryFormValues>,
    defaultValues: { ...defaultValues, tipus: defaultTipus },
  })

  useEffect(() => {
    if (category) {
      form.reset({
        nom: category.nom,
        tipus: category.tipus,
        color: category.color,
        icona: category.icona,
        pressupost_mensual: category.pressupost_mensual,
      })
    } else {
      form.reset({ ...defaultValues, tipus: defaultTipus })
    }
  }, [category, defaultTipus, form, open])

  const onSubmit = async (values: CategoryFormValues) => {
    if (!userId) return
    try {
      const data = {
        nom: values.nom,
        tipus: values.tipus,
        color: values.color,
        icona: values.icona,
        pressupost_mensual: values.pressupost_mensual ?? null,
      }
      if (isEditing && category) {
        await updateCategory(category.id, userId, data)
        toast.success("Categoria actualitzada")
      } else {
        await createCategory(userId, data)
        toast.success("Categoria creada")
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar la categoria")
    }
  }

  const selectedIcon = form.watch("icona")
  const selectedColor = form.watch("color")
  const selectedTipus = form.watch("tipus")
  const showBudget = isEditing ? category?.tipus === "despesa" : selectedTipus === "despesa"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* Header with live preview */}
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
                {isEditing ? "Editar categoria" : "Nova categoria"}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {form.watch("nom") || (selectedTipus === "despesa" ? "Despesa" : "Ingrés")}
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

            {/* Tipus switcher */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="tipus"
                render={({ field }) => (
                  <FormItem className="px-5 pb-4">
                    <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => field.onChange("despesa")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                          field.value === "despesa"
                            ? "bg-rose-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        Despesa
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("ingres")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                          field.value === "ingres"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ingrés
                      </button>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Nom + Budget in a grouped card */}
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
                        placeholder={selectedTipus === "despesa" ? "Ex: Supermercat, Transport..." : "Ex: Nòmina, Freelance..."}
                        className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Pressupost mensual */}
              {showBudget && (
                <FormField
                  control={form.control}
                  name="pressupost_mensual"
                  render={({ field }) => (
                    <FormItem className="px-4 pt-3 pb-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Pressupost mensual <span className="normal-case font-normal">(opcional)</span>
                      </p>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">€</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <p className="text-[11px] text-slate-400">Activa les alertes de color al dashboard</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Color */}
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
                    {/* Custom color picker */}
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

            {/* Icona */}
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

            {/* Submit */}
            <div className="px-5 pb-5">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className={cn(
                  "w-full h-12 text-base font-semibold rounded-xl text-white transition-colors",
                  selectedTipus === "ingres"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Guardar canvis" : "Crear categoria"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}