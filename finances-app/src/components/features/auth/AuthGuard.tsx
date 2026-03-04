import { useAuthStore } from "@/store/authstore"
import FamilyPasswordScreen from "./FamilyPasswordScreen"
import UserSelectionScreen from "./UserSelectionScreen"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isDbReady, userId } = useAuthStore()

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