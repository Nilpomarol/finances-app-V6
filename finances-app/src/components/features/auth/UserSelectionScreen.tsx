import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authstore"
import { getUsers, validateUserPin } from "@/lib/db/queries/users"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Delete } from "lucide-react"
import type { User as UserType } from "@/types/database"

type Step = "select" | "pin"

export default function UserSelectionScreen() {
  const { setUserId, logout } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [pin, setPin] = useState("")
  const [step, setStep] = useState<Step>("select")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError("Error carregant usuaris"))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSelectUser = (user: UserType) => {
    setSelectedUser(user)
    setPin("")
    setError(null)
    setStep("pin")
  }

  const handlePinInput = (digit: string) => {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      validatePin(newPin)
    }
  }

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1))
    setError(null)
  }

  const validatePin = async (pinToValidate: string) => {
    if (!selectedUser) return
    setIsLoading(true)
    setError(null)
    try {
      const user = await validateUserPin(selectedUser.id, pinToValidate)
      if (user) {
        setUserId(user.id)
      } else {
        setPin("")
        setError("PIN incorrecte")
      }
    } catch {
      setPin("")
      setError("Error validant el PIN")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && step === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        {step === "select" ? (
          <>
            <CardHeader className="text-center">
              <CardTitle>Qui ets?</CardTitle>
              <CardDescription>Selecciona el teu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{user.nom}</span>
                </button>
              ))}

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={logout}
              >
                Canviar contrasenya familiar
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{selectedUser?.nom}</CardTitle>
              <CardDescription>Introdueix el teu PIN de 4 dígits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Indicadors de PIN */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              {/* Teclat numèric */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinInput(String(digit))}
                    disabled={isLoading}
                    className="h-14 rounded-lg border text-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                {/* Fila inferior: buit, 0, esborrar */}
                <div />
                <button
                  onClick={() => handlePinInput("0")}
                  disabled={isLoading}
                  className="h-14 rounded-lg border text-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  disabled={isLoading || pin.length === 0}
                  className="h-14 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setStep("select")
                  setPin("")
                  setError(null)
                }}
              >
                ← Tornar
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}