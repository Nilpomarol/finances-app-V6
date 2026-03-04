import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/layout"
import DashboardPage from "@/pages/page"
import TransaccionsPage from "@/pages/transaccions/page"
import ComptesPage from "@/pages/comptes/page"
import CategoriesPage from "@/pages/categories/page"
import PersonesPage from "@/pages/persones/page"
import AnalisiPage from "@/pages/analisi/page"
import EsdevenimentsPage from "@/pages/esdeveniments/page"
import EsdevenimentDetallPage from "@/pages/esdeveniments/[id]/page"
import ConfiguracioPage from "@/pages/configuracio/page"
import DbTestPage from "./pages/db-test/page"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "transaccions", element: <TransaccionsPage /> },
      { path: "comptes", element: <ComptesPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "persones", element: <PersonesPage /> },
      { path: "analisi", element: <AnalisiPage /> },
      { path: "esdeveniments", element: <EsdevenimentsPage /> },
      { path: "esdeveniments/:id", element: <EsdevenimentDetallPage /> },
      { path: "configuracio", element: <ConfiguracioPage /> },
      { path: "db-test", element: <DbTestPage /> },
    ],
  },
])