import { Tooltip } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import type { ReactElement } from 'react';
import {
  asAvailableProject,
  getProjectStore,
} from '@core/features/projects/api/browser/stores/project-selectors';
import {
  DEFAULT_PROJECT_LIVE_ACTION_DISABLED_REASON,
  projectLiveActionDisabledReason,
} from '@core/features/projects/browser/project-availability-presentation';

export const ProjectLiveActionGuard = observer(function ProjectLiveActionGuard({
  children,
  projectId,
}: {
  children: ReactElement;
  projectId: string;
}) {
  const reason = getProjectLiveActionDisabledReason(projectId);
  if (!reason) return children;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={<span className="inline-flex" tabIndex={0} role="note" aria-label={reason} />}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content>{reason}</Tooltip.Content>
    </Tooltip.Root>
  );
});

export function getProjectLiveActionDisabledReason(projectId: string): string | null {
  const store = getProjectStore(projectId);
  if (store?.data?.type === 'ssh') return '此版本已移除 SSH 开发。';
  const context = asAvailableProject(store);
  if (!context) return DEFAULT_PROJECT_LIVE_ACTION_DISABLED_REASON;
  if (context.host.state.kind === 'ready') return null;
  return projectLiveActionDisabledReason({ host: { kind: 'local' }, state: context.host.state });
}
