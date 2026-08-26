interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-start gap-2 p-8">
      <span className="tag">próxima etapa</span>
      <h2 className="font-display text-base font-semibold text-text-900">
        {title}
      </h2>
      <p className="max-w-md text-sm text-text-600">{description}</p>
    </div>
  );
}
