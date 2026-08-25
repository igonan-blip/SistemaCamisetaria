import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper-50">
        <p className="font-mono text-sm text-text-400">Carregando…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.ativo) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper-50 px-4">
        <div className="card max-w-sm p-6 text-center">
          <h1 className="text-base font-semibold">Acesso desativado</h1>
          <p className="mt-2 text-sm text-text-600">
            Sua conta foi desativada. Fale com um administrador para
            reativá-la.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
