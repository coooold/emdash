import { CircleDot } from 'lucide-react';
import type { LinkedIssue } from '@core/primitives/linked-issues/api';

/** Generic marker for historical linked issues; no platform integration is loaded. */
export function ProviderLogo({
  className,
  size = 14,
}: {
  provider: LinkedIssue['provider'];
  className?: string;
  size?: number;
}) {
  return <CircleDot aria-label="历史关联议题" className={className} size={size} />;
}
