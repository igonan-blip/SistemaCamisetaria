import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper-50 text-center">
      <span className="tag">404</span>
      <h1 className="font-display text-lg font-semibold text-text-900">
        Página não encontrada
      </h1>
      <Link to="/" className="btn-secondary">
        Voltar ao painel
      </Link>
    </div>
  );
}
