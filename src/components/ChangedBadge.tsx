export function ChangedBadge({ label = 'Изменено' }: { label?: string }) {
  return <span className="changed-badge">{label}</span>
}
