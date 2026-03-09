import { create } from "zustand"

type Theme = "light" | "dark"

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

// Apply immediately on module load to avoid flash
const savedTheme = (localStorage.getItem("theme") as Theme) ?? "light"
applyTheme(savedTheme)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      applyTheme(next)
      return { theme: next }
    }),
}))
