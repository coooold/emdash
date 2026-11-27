import { observer } from 'mobx-react-lite';
import {
  usePreviewServers,
  useTaskComposition,
} from '@core/features/workbench/api/browser/task-composition-context';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import { PreviewServerPill } from './preview-server-pill';

export const PreviewServerPills = observer(function PreviewServerPills() {
  const previews = usePreviewServers();
  const taskView = useTaskComposition();
  const servers = previews.servers.filter((server) => server.kind === 'direct');
  const liveActionDisabledReason = projectAvailabilityUi.getLiveActionDisabledReason(
    taskView.projectId
  );

  if (previews.observation.kind === 'unavailable') {
    return (
      <span className="rounded-md px-2 py-1 text-xs text-foreground-muted" tabIndex={0} role="note">
        预览不可用
        <span className="sr-only">{liveActionDisabledReason ?? '尚未检测到预览服务。'}</span>
      </span>
    );
  }

  if (servers.length === 0) return null;

  return (
    <>
      {servers.map((server) => (
        <PreviewServerPill key={server.id} server={server} />
      ))}
      {previews.observation.kind === 'stale' && liveActionDisabledReason ? (
        <span
          className="max-w-48 truncate px-1 text-xs text-foreground-muted"
          title={liveActionDisabledReason}
          tabIndex={0}
          role="note"
        >
          预览数据已过期
        </span>
      ) : null}
    </>
  );
});
