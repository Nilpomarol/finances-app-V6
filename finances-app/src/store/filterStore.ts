import { create } from "zustand"

interface FilterState {
  periode: { mes: number; any: number } | null
  compteIds: string[]
  categoriaIds: string[]
  setPeriode: (periode: { mes: number; any: number } | null) => void
  setCompteIds: (ids: string[]) => void
  setCategoriaIds: (ids: string[]) => void
  resetFilters: () => void
}

const currentDate = new Date()

export const useFilterStore = create<FilterState>((set) => ({
  periode: { mes: currentDate.getMonth() + 1, any: currentDate.getFullYear() },
  compteIds: [],
  categoriaIds: [],
  setPeriode: (periode) => set({ periode }),
  setCompteIds: (compteIds) => set({ compteIds }),
  setCategoriaIds: (categoriaIds) => set({ categoriaIds }),
  resetFilters: () => set({
    periode: { mes: currentDate.getMonth() + 1, any: currentDate.getFullYear() },
    compteIds: [],
    categoriaIds: [],
  }),
}))