import { create } from "zustand"
import { initializeDb, closeDb } from "@/lib/db/client"

interface AuthState {
  token: string | null
  userId: string | null
  isDbReady: boolean
  isLoading: boolean
  error: string | null

  // Capa 1: valida la contrasenya familiar i inicialitza la BD
  loginWithPassword: (password: string) => Promise<void>

  // Capa 2: estableix l'usuari actiu després del PIN
  setUserId: (userId: string) => void

  // Tanca sessió completa
  logout: () => void

  // Neteja errors
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  isDbReady: false,
  isLoading: false,
  error: null,

  loginWithPassword: async (password: string) => {
    set({ isLoading: true, error: null })
    try {
      let token: string
      let url: string

      if (import.meta.env.DEV) {
        // En dev local: cridem igualment l'endpoint per simular el flux real
        // Però si no tenim vercel dev, podem fer fallback al .env directament
        try {
          const res = await fetch("/api/getToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? "Contrasenya incorrecta")
          }
          const data = await res.json()
          token = data.token
          url = data.url
        } catch (fetchErr) {
          // Fallback per dev sense vercel dev: usa les variables d'entorn directament
          const envToken = import.meta.env.VITE_TURSO_AUTH_TOKEN as string
          const envUrl = import.meta.env.VITE_TURSO_DATABASE_URL as string
          const envPassword = import.meta.env.VITE_FAMILY_PASSWORD as string

          if (envPassword && password !== envPassword) {
            throw new Error("Contrasenya incorrecta")
          }

          if (!envToken || !envUrl) {
            throw fetchErr // Re-llança l'error original si no hi ha fallback
          }

          console.warn("[Auth] Usant fallback de .env.local (dev mode)")
          token = envToken
          url = envUrl
        }
      } else {
        // En producció: sempre via /api/getToken
        const res = await fetch("/api/getToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Contrasenya incorrecta")
        }
        const data = await res.json()
        token = data.token
        url = data.url
      }

      await initializeDb(token, url)
      set({ token, isDbReady: true, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error d'autenticació"
      set({ error: message, isLoading: false })
    }
  },

  setUserId: (userId: string) => set({ userId }),

  logout: () => {
    closeDb()
    set({ token: null, userId: null, isDbReady: false, error: null })
  },

  clearError: () => set({ error: null }),
}))