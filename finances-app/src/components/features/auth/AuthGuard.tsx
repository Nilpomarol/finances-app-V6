import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authstore"
import FamilyPasswordScreen from "./FamilyPasswordScreen"
import UserSelectionScreen from "./UserSelectionScreen"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isDbReady, userId, tryAutoLogin } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Mínim 300ms per evitar flash de pantalla de login
    const minDelay = new Promise(resolve => setTimeout(resolve, 300))
    
    Promise.all([tryAutoLogin(), minDelay])
      .finally(() => setIsChecking(false))
  }, [tryAutoLogin])

  // Mentre comprova localStorage, mostra un spinner
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Capa 1: BD no inicialitzada → pantalla de contrasenya familiar
  if (!isDbReady) {
    return <FamilyPasswordScreen />
  }

  // Capa 2: BD OK però cap usuari seleccionat → selecció d'usuari + PIN
  if (!userId) {
    return <UserSelectionScreen />
  }

  // Tot OK → renderitza l'app
  return <>{children}</>
}