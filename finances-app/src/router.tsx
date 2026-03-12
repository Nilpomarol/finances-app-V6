import { Suspense, lazy } from "react"
import { createBrowserRouter } from "react-router-dom"

const Layout = lazy(() => import("@/pages/layout"))
const DashboardPage = lazy(() => import("@/pages/page"))
const TransaccionsPage = lazy(() => import("@/pages/transaccions/page"))
const ComptesPage = lazy(() => import("@/pages/comptes/page"))
const CategoriesPage = lazy(() => import("@/pages/categories/page"))
const PersonesPage = lazy(() => import("@/pages/persones/page"))
const AnalisiPage = lazy(() => import("@/pages/analisi/page"))
const EsdevenimentsPage = lazy(() => import("@/pages/esdeveniments/page"))
const EsdevenimentDetallPage = lazy(() => import("@/pages/esdeveniments/[id]/page"))
const RecurrentsPage = lazy(() => import("@/pages/recurrents/page"))
const ConfiguracioPage = lazy(() => import("@/pages/configuracio/page"))
const DbTestPage = lazy(() => import("@/pages/db-test/page"))

function RouteFallback() {
  return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregant...</div>
}

function lazyElement(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: lazyElement(<Layout />),
    children: [
      { index: true, element: lazyElement(<DashboardPage />) },
      { path: "transaccions", element: lazyElement(<TransaccionsPage />) },
      { path: "comptes", element: lazyElement(<ComptesPage />) },
      { path: "recurrents", element: lazyElement(<RecurrentsPage />) },
      { path: "categories", element: lazyElement(<CategoriesPage />) },
      { path: "persones", element: lazyElement(<PersonesPage />) },
      { path: "analisi", element: lazyElement(<AnalisiPage />) },
      { path: "esdeveniments", element: lazyElement(<EsdevenimentsPage />) },
      { path: "esdeveniments/:id", element: lazyElement(<EsdevenimentDetallPage />) },
      { path: "configuracio", element: lazyElement(<ConfiguracioPage />) },
      { path: "db-test", element: lazyElement(<DbTestPage />) },
    ],
  },
])