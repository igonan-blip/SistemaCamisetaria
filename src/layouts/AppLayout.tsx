import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

const TITLES: Record<string, string> = {
  "/": "Painel",
  "/pedidos": "Pedidos",
  "/orcamentos": "Orçamentos",
  "/kanban": "Produção",
  "/clientes": "Clientes",
  "/financeiro": "Financeiro",
  "/produtos": "Produtos",
  "/tamanhos": "Tamanhos",
  "/usuarios": "Usuários",
};

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "Camisetaria";
}

export function AppLayout() {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <div className="flex h-screen bg-paper-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
