import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";

export function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-600">
          Bem-vindo(a){profile ? `, ${profile.nome.split(" ")[0]}` : ""}.
        </p>
      </div>
      <EmptyState
        title="Painel de indicadores"
        description="Os números de pedidos em produção, entregas do dia e saldo financeiro serão exibidos aqui na próxima etapa, conectados diretamente às tabelas do banco."
      />
    </div>
  );
}
