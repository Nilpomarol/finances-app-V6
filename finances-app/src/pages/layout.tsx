import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { Toaster } from "sonner"
import AuthGuard from "@/components/features/auth/AuthGuard"
import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"
import Header from "@/components/layout/Header"
import TransactionModal from "@/components/features/transaccions/TransactionModal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Importacions necessàries per carregar les dades de la BD
import { useAuthStore } from "@/store/authstore"
import { getAccounts } from "@/lib/db/queries/accounts"
import { getCategories } from "@/lib/db/queries/categories"
import { getPeople } from "@/lib/db/queries/people"
import type { Account, Category, Person } from "@/types/database"
import { getEvents } from "@/lib/db/queries/events"

export default function Layout() {
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  
  // 1. Obtenim l'usuari actiu i preparem l'estat per a les dades
  const { userId } = useAuthStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<any[]>([])
  // 2. Anem a buscar els comptes i categories un cop l'usuari és vàlid
  // 2. Anem a buscar les dades cada cop que l'usuari és vàlid o S'OBRE EL MODAL
  useEffect(() => {
    if (!userId) return
    Promise.all([getAccounts(userId), getCategories(userId), getPeople(userId), getEvents(userId)]).then(
      ([accs, cats, ppl, events]) => {
        setAccounts(accs)
        setCategories(cats)
        setPeople(ppl)
        setEvents(events)
      }
    )
  }, [userId, showTransactionModal])
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        {/* Passem la funció d'obrir el modal a la Sidebar */}
        <Sidebar onNewTransaction={() => setShowTransactionModal(true)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        <MobileNav />

        {/* Botó flotant en vista mòbil */}
        <Button
          size="icon"
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-50"
          onClick={() => setShowTransactionModal(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>

        {/* El Modal Global ara rep les dades reals */}
        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          accounts={accounts}
          categories={categories}
          people={people}
          events={events}
          onSuccess={() => {
            setShowTransactionModal(false)
            // Aquí, si estiguessis al Dashboard, potser voldries que es refresquessin
            // les dades. Al ser el Layout, amb tancar-lo n'hi ha prou per ara.
            // Si hi ha problemes de refresc a les pàgines, implementarem un event global més endavant!
          }}
        />
      </div>
      <Toaster />
    </AuthGuard>
  )
}