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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const categorySchema = z.object({
  nom: z.string().min(1, "El nom és obligatori").max(50),
  tipus: z.enum(["despesa", "ingres"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color invàlid"),
  icona: z.string().min(1, "Selecciona una icona"),
  pressupost_mensual: z.coerce
    .number()
    .min(0)
    .nullable()
    .optional(),
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
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b", "#84cc16", "#f43f5e",
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
        nom: category.nom, tipus: category.tipus, color: category.color,
        icona: category.icona, pressupost_mensual: category.pressupost_mensual,
      })
    } else {
      form.reset({
        ...defaultValues,
        tipus: defaultTipus,
      })
    }
  }, [category, defaultTipus, form, open])

  const onSubmit = async (values: CategoryFormValues) => {
    if (!userId) return
    try {
      const data = {
        nom: values.nom, tipus: values.tipus, color: values.color,
        icona: values.icona, pressupost_mensual: values.pressupost_mensual ?? null,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Tipus */}
            {!isEditing && (
              <FormField control={form.control} name="tipus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipus</FormLabel>
                  <div className="flex gap-2">
                    {(["despesa", "ingres"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => field.onChange(t)}
                        className={cn(
                          "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                          field.value === t
                            ? t === "despesa"
                              ? "bg-destructive text-destructive-foreground border-destructive"
                              : "bg-green-600 text-white border-green-600"
                            : "border-border hover:bg-accent"
                        )}>
                        {t === "despesa" ? "Despesa" : "Ingres"}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Nom */}
            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input
                    placeholder={selectedTipus === "despesa" ? "Ex: Supermercat, Transport..." : "Ex: Nomina, Freelance..."}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Pressupost mensual */}
            {showBudget && (
              <FormField control={form.control} name="pressupost_mensual" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pressupost mensual (opcional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number" step="0.01" min="0" placeholder="0.00" className="pr-8"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </FormControl>
                  <FormDescription>Activa les alertes de color al dashboard</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Color */}
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((color) => (
                        <button key={color} type="button" onClick={() => field.onChange(color)}
                          className="w-7 h-7 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: field.value === color ? "#000" : "transparent",
                            transform: field.value === color ? "scale(1.2)" : "scale(1)",
                          }} />
                      ))}
                    </div>
                    <Input type="color" className="h-9 w-full cursor-pointer" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Icona */}
            <FormField control={form.control} name="icona" render={({ field }) => (
              <FormItem>
                <FormLabel>Icona</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-8 gap-1.5">
                    {ICON_OPTIONS.map((icon) => (
                      <button key={icon.value} type="button" title={icon.label}
                        onClick={() => field.onChange(icon.value)}
                        className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center border transition-all",
                          field.value === icon.value ? "border-2" : "border-border hover:bg-accent"
                        )}
                        style={field.value === icon.value ? {
                          borderColor: selectedColor,
                          backgroundColor: selectedColor + "20",
                          color: selectedColor,
                        } : {}}>
                        <DynamicIcon name={icon.value} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: selectedColor + "30" }}>
                <DynamicIcon name={selectedIcon} className="w-5 h-5" style={{ color: selectedColor }} />
              </div>
              <div>
                <p className="text-sm font-medium">{form.watch("nom") || "Nom de la categoria"}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTipus === "despesa" ? "Despesa" : "Ingres"}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}