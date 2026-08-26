import { EmptyState } from "@/components/EmptyState";

export function Usuarios() {
  return (
    <EmptyState
      title="Usuários"
      description="Convite de novos usuários e gestão de papéis (admin / funcionário) entrarão aqui na próxima etapa, respeitando as regras de RLS já aplicadas no banco."
    />
  );
}
