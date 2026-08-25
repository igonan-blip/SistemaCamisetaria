import { useAuth } from "@/contexts/AuthContext";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { profile, signOut } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-700/10 bg-white px-6">
      <h1 className="font-display text-lg font-semibold text-text-900">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {profile && (
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-text-900">{profile.nome}</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-text-400">
              {profile.role}
            </p>
          </div>
        )}
        <button type="button" onClick={signOut} className="btn-secondary">
          Sair
        </button>
      </div>
    </header>
  );
}
