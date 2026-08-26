import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AdminRoute } from "@/routes/AdminRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Pedidos } from "@/pages/Pedidos";
import { Kanban } from "@/pages/Kanban";
import { Clientes } from "@/pages/Clientes";
import { Financeiro } from "@/pages/Financeiro";
import { Produtos } from "@/pages/Produtos";
import { Tamanhos } from "@/pages/Tamanhos";
import { Usuarios } from "@/pages/Usuarios";
import { NotFound } from "@/pages/NotFound";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/clientes" element={<Clientes />} />

            <Route
              path="/financeiro"
              element={
                <AdminRoute>
                  <Financeiro />
                </AdminRoute>
              }
            />
            <Route
              path="/produtos"
              element={
                <AdminRoute>
                  <Produtos />
                </AdminRoute>
              }
            />
            <Route
              path="/tamanhos"
              element={
                <AdminRoute>
                  <Tamanhos />
                </AdminRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <AdminRoute>
                  <Usuarios />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
