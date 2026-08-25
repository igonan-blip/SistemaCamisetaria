import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  return (
    <ProtectedRoute>
      {profile && profile.role !== "admin" ? (
        <Navigate to="/" replace />
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  );
}
