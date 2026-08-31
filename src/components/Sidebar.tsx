import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Painel" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/orcamentos", label: "Orçamentos" },
  { to: "/kanban", label: "Produção" },
  { to: "/clientes", label: "Clientes" },
  { to: "/financeiro", label: "Financeiro", adminOnly: true },
  { to: "/produtos", label: "Produtos", adminOnly: true },
  { to: "/tamanhos", label: "Tamanhos", adminOnly: true },
  { to: "/usuarios", label: "Usuários", adminOnly: true },
];

export function Sidebar() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-ink-900 text-paper-50">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
        <div>
          <p className="font-display text-sm font-semibold leading-none">
            Camisetaria
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-paper-50/50">
            Gestão de produção
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "relative flex items-center rounded-tag px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-paper-50/70 hover:bg-white/5 hover:text-white",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-teal-400"
                        aria-hidden="true"
                      />
                    )}
                    <span className="ml-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {isAdmin && (
        <div className="border-t border-white/10 px-5 py-3">
          <p className="tag border-white/10 bg-transparent text-paper-50/60">
            role: admin
          </p>
        </div>
      )}
    </aside>
  );
}
