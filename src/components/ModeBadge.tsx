import { PROVIDER_META } from '../../shared/constants'
import type { ProviderId } from '../../shared/constants'

export function ModeBadge({ provider }: { provider: ProviderId }) {
  const meta = PROVIDER_META[provider]

  return (
    <span className={`mode-badge mode-badge--${meta.tone}`} aria-label={`Режим работы: ${meta.label}`}>
      {meta.label}
    </span>
  )
}
