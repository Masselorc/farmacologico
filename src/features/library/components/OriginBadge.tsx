import { messages } from '../../../app/i18n/pt-BR.messages'
import type { ProfileOrigin } from '../../../domain/types'

export interface OriginBadgeProps {
  origin: ProfileOrigin
}

export function OriginBadge({ origin }: OriginBadgeProps) {
  switch (origin.kind) {
    case 'legacy_unattributed':
      return <span className="origin-badge origin-badge-legacy">{messages.library.legacyBadge}</span>
    case 'literature':
      return <span className="origin-badge origin-badge-literature">{messages.library.literatureBadge}</span>
    case 'user_defined':
      return <span className="origin-badge origin-badge-user">{messages.library.userBadge}</span>
    default:
      return null
  }
}
