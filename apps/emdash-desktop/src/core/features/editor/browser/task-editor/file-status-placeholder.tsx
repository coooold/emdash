import { Button, Spinner } from '@emdash/ui/react/primitives';
import { FileQuestion, FileX, FileX2, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import type { FileTabResource } from '@core/features/editor/api/browser/task-editor/stores/file-tab-resource';
import { openWithOS } from '@core/features/workbench/api/browser/open-with-os';

/**
 * Placeholder for a file tab whose OpenFileStore entry is not ready: the
 * bounded loading state, the retryable seam errors, and the orphaned state
 * (which auto-recovers when the store transitions back to ready).
 */
export const FileStatusPlaceholder = observer(function FileStatusPlaceholder({
  resource,
}: {
  resource: FileTabResource;
}) {
  const status = resource.contentStatus;
  const fileName = resource.path.split('/').pop() ?? resource.path;

  if (status.kind === 'ready') return null;

  if (status.kind === 'loading') {
    return (
      <Shell>
        <Spinner size="sm" />
        <span className="text-xs text-foreground-passive">正在加载文件…</span>
      </Shell>
    );
  }

  if (status.kind === 'orphaned') {
    return (
      <Shell>
        <Notice
          icon={FileX2}
          fileName={fileName}
          message="文件已从磁盘删除"
          detail="文件恢复后将自动显示内容。"
        />
      </Shell>
    );
  }

  const openInDefaultApp = () => {
    if (resource.ref) void openWithOS(resource.ref);
  };
  const retry = () => resource.retryLoad();

  switch (status.code) {
    case 'not-found':
      return (
        <Shell>
          <Notice icon={FileX2} fileName={fileName} message="找不到文件" />
          <RetryButton onRetry={retry} />
        </Shell>
      );
    case 'no-permissions':
      return (
        <Shell>
          <Notice icon={ShieldAlert} fileName={fileName} message="权限不足" />
          <RetryButton onRetry={retry} />
        </Shell>
      );
    case 'too-large':
      return (
        <Shell>
          <Notice
            icon={FileX}
            fileName={fileName}
            message="文件过大，无法在编辑器中显示"
          />
          {resource.ref?.host.type === 'local' && (
            <Button variant="secondary" size="sm" onClick={openInDefaultApp}>
              用默认应用打开
            </Button>
          )}
        </Shell>
      );
    case 'binary':
      return (
        <Shell>
          <Notice icon={FileQuestion} fileName={fileName} message="二进制文件无法预览" />
          {resource.ref?.host.type === 'local' && (
            <Button variant="secondary" size="sm" onClick={openInDefaultApp}>
              用默认应用打开
            </Button>
          )}
        </Shell>
      );
    case 'unavailable':
      return (
        <Shell>
          <Notice icon={FileX2} fileName={fileName} message="无法加载文件" />
          <RetryButton onRetry={retry} />
        </Shell>
      );
  }
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-(--em-surface)">
      {children}
    </div>
  );
}

function Notice({
  icon: Icon,
  fileName,
  message,
  detail,
}: {
  icon: LucideIcon;
  fileName: string;
  message: string;
  detail?: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3">
      <Icon className="h-10 w-10 opacity-30" />
      <div className="text-center">
        <p className="text-sm font-medium">{fileName}</p>
        <p className="mt-1 text-xs opacity-70">{message}</p>
        {detail ? <p className="mt-0.5 text-xs opacity-50">{detail}</p> : null}
      </div>
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      重试
    </Button>
  );
}
