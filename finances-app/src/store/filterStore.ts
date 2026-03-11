import { create } from "zustand"

interface FilterState {
  periode: { mes: number; any: number } | null
  periodeAnterior: { mes: number; any: number } | null
  periodeMode: "mes" | "any" | "alltime"
  yearDisplayMode: "total" | "mitja"
  compteIds: string[]
  categoriaIds: string[]
  evenimentIds: string[]
  setPeriode: (periode: { mes: number; any: number } | null) => void
  setPeriodeAnterior: (periode: { mes: number; any: number } | null) => void
  setPeriodeMode: (mode: "mes" | "any" | "alltime") => void
  setYearDisplayMode: (mode: "total" | "mitja") => void
  setCompteIds: (ids: string[]) => void
  setCategoriaIds: (ids: string[]) => void
  setEvenimentIds: (ids: string[]) => void
  resetFilters: () => void
}

const currentDate = new Date()
const defaultPeriode = { mes: currentDate.getMonth() + 1, any: currentDate.getFullYear() }
const defaultPeriodeAnterior = (() => {
  const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  return { mes: d.getMonth() + 1, any: d.getFullYear() }
})()

export const useFilterStore = create<FilterState>((set) => ({
  periode: defaultPeriode,
  periodeAnterior: defaultPeriodeAnterior,
  periodeMode: "mes",
  yearDisplayMode: "total",
  compteIds: [],
  categoriaIds: [],
  evenimentIds: [],
  setPeriode: (periode) => set({ periode }),
  setPeriodeAnterior: (periodeAnterior) => set({ periodeAnterior }),
  setPeriodeMode: (periodeMode) => set({ periodeMode }),
  setYearDisplayMode: (yearDisplayMode) => set({ yearDisplayMode }),
  setCompteIds: (compteIds) => set({ compteIds }),
  setCategoriaIds: (categoriaIds) => set({ categoriaIds }),
  setEvenimentIds: (evenimentIds) => set({ evenimentIds }),
  resetFilters: () =>
    set({
      periode: defaultPeriode,
      periodeAnterior: defaultPeriodeAnterior,
      periodeMode: "mes",
      yearDisplayMode: "total",
      compteIds: [],
      categoriaIds: [],
      evenimentIds: [],
    }),
}))
