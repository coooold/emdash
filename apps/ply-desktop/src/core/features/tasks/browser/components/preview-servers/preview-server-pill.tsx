import { DropdownMenu, MicroLabel } from '@ply/ui/react/primitives';
import { ChevronDown, Clipboard, ExternalLink, Globe, Loader2, Square } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  usePreviewServers,
  useTaskComposition,
} from '@core/features/workbench/api/browser/task-composition-context';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import {
  copyTextToClipboard,
  openExternal,
} from '@core/primitives/desktop-host/browser/host-client';
import type { DirectPreviewServer } from '@core/primitives/preview-servers/api';
import { previewServerUrl } from '@core/primitives/preview-servers/api';
import { cn } from '@core/primitives/styling/browser/cn';
import {
  formatPreviewServerLabel,
  previewServerStatusClasses,
  previewServerStatusLabel,
} from './preview-server-format';

export const PreviewServerPill = observer(function PreviewServerPill({
  server,
}: {
  server: DirectPreviewServer;
}) {
  const previews = usePreviewServers();
  const taskView = useTaskComposition();
  const liveActionDisabledReason = projectAvailabilityUi.getLiveActionDisabledReason(
    taskView.projectId
  );
  const url = previewServerUrl(server);
  const hasUrl = url !== null;
  const canOpen = server.status.kind === 'ready' && hasUrl;
  const title = `${previewServerStatusLabel(server)}：${url ?? formatPreviewServerLabel(server)}`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        render={
          <button
            type="button"
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors',
              previewServerStatusClasses(server)
            )}
            aria-label={`打开预览 ${formatPreviewServerLabel(server)}`}
            title={title}
          />
        }
      >
        {server.status.kind === 'starting' || server.status.kind === 'reconnecting' ? (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        ) : (
          <Globe className="size-3 shrink-0" />
        )}
        <span>{formatPreviewServerLabel(server)}</span>
        <ChevronDown className="size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className="min-w-56">
        <div className="px-2 py-1.5">
          <MicroLabel className="mb-1 flex items-center">预览</MicroLabel>
          <div className="truncate text-xs text-foreground-muted" title={url ?? undefined}>
            {url ?? '无本地 URL'}
          </div>
          {server.status.kind === 'failed' ? (
            <div className="mt-1 text-xs text-foreground-destructive">{server.status.message}</div>
          ) : null}
          {liveActionDisabledReason ? (
            <div className="mt-1 text-xs text-foreground-warning">{liveActionDisabledReason}</div>
          ) : null}
        </div>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          disabled={!canOpen || Boolean(liveActionDisabledReason)}
          onClick={() => {
            if (canOpen && url) {
              taskView.paneLayout.open('browser', { initialUrl: url });
              taskView.setFocusedRegion('main');
            }
          }}
        >
          <Globe className="size-3.5" />
          在 ply 浏览器中打开
        </DropdownMenu.Item>
        <DropdownMenu.Item
          disabled={!canOpen || Boolean(liveActionDisabledReason)}
          onClick={() => canOpen && url && void openExternal(url)}
        >
          <ExternalLink className="size-3.5" />
          在系统浏览器中打开
        </DropdownMenu.Item>
        <DropdownMenu.Item disabled={!hasUrl} onClick={() => url && void copyTextToClipboard(url)}>
          <Clipboard className="size-3.5" />
          复制 URL
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          disabled={Boolean(liveActionDisabledReason)}
          variant="destructive"
          onClick={() => void previews.stop(server.id)}
        >
          <Square className="size-3.5" />
          停止
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
});
