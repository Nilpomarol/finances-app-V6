import { Outlet } from "react-router-dom"
import AuthGuard from "@/components/features/auth/AuthGuard"

export default function Layout() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Sidebar/Navbar s'implementarà a la Fase 0.5 */}
        <main className="container mx-auto p-4">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  )
}