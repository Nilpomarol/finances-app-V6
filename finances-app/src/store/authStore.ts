import { create } from "zustand"
import { initializeDb, closeDb } from "@/lib/db/client"

const STORAGE_PASSWORD_KEY = "finances_password"
const STORAGE_USER_ID_KEY = "finances_user_id"

interface AuthState {
  token: string | null
  userId: string | null
  isDbReady: boolean
  isLoading: boolean
  error: string | null

  // Intenta auto-login des de localStorage (cridar a l'inici de l'app)
  tryAutoLogin: () => Promise<boolean>

  // Capa 1: valida la contrasenya familiar i inicialitza la BD
  loginWithPassword: (password: string) => Promise<void>

  // Capa 2: estableix l'usuari actiu després del PIN
  setUserId: (userId: string) => void

  // Tanca sessió i neteja localStorage
  logout: () => void

  // Neteja errors
  clearError: () => void
}

async function fetchToken(password: string): Promise<{ token: string; url: string }> {
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
    return await res.json()
  } catch (fetchErr) {
    // Fallback dev local sense vercel dev
    const envToken = import.meta.env.VITE_TURSO_AUTH_TOKEN as string
    const envUrl = import.meta.env.VITE_TURSO_DATABASE_URL as string
    const envPassword = import.meta.env.VITE_FAMILY_PASSWORD as string

    if (envPassword && password !== envPassword) {
      throw new Error("Contrasenya incorrecta")
    }
    if (!envToken || !envUrl) throw fetchErr

    console.warn("[Auth] Usant fallback de .env.local (dev mode)")
    return { token: envToken, url: envUrl }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  isDbReady: false,
  isLoading: false,
  error: null,

  tryAutoLogin: async () => {
    const savedPassword = localStorage.getItem(STORAGE_PASSWORD_KEY)
    const savedUserId = localStorage.getItem(STORAGE_USER_ID_KEY)

    if (!savedPassword || !savedUserId) return false

    set({ isLoading: true, error: null })
    try {
      const { token, url } = await fetchToken(savedPassword)
      await initializeDb(token, url)
      set({ token, isDbReady: true, userId: savedUserId, isLoading: false })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      const isAuthError = message.includes("incorrecta") || message.includes("incorrecte")

      if (isAuthError) {
        // Contrasenya invàlida → neteja sessió
        localStorage.removeItem(STORAGE_PASSWORD_KEY)
        localStorage.removeItem(STORAGE_USER_ID_KEY)
      }
      // Errors de xarxa o de servidor → mantenim les credencials per reintentar
      set({ isLoading: false })
      return false
    }
  },

  loginWithPassword: async (password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { token, url } = await fetchToken(password)
      await initializeDb(token, url)
      // Guarda la contrasenya per futures sessions
      localStorage.setItem(STORAGE_PASSWORD_KEY, password)
      set({ token, isDbReady: true, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error d'autenticació"
      set({ error: message, isLoading: false })
    }
  },

  setUserId: (userId: string) => {
    // Guarda l'usuari actiu per futures sessions
    localStorage.setItem(STORAGE_USER_ID_KEY, userId)
    set({ userId })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_PASSWORD_KEY)
    localStorage.removeItem(STORAGE_USER_ID_KEY)
    closeDb()
    set({ token: null, userId: null, isDbReady: false, error: null })
  },

  clearError: () => set({ error: null }),
}))