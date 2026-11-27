import { Button, Resizable, toast, useCollapsiblePanelBinding } from '@ply/ui/react/primitives';
import { Loader2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import {
  getTaskManagerStore,
  getTaskStore,
  taskHostActionAvailability,
  taskErrorMessage,
  taskViewKind,
} from '@core/features/tasks/api/browser/task-state/task-selectors';
import { useTaskViewContext } from '@core/features/tasks/contributions/browser/task-view-context';
import { taskPanelLayoutsMemento } from '@core/features/tasks/contributions/mementos';
import { useTaskComposition } from '@core/features/workbench/api/browser/task-composition-context';
import { taskTabView } from '@core/features/workbench/api/browser/task-tab-registry';
import { useWorkspaceLayoutContext } from '@core/features/workbench/contributions/browser/layout-provider';
import { getWorkspacesWireClient } from '@core/features/workspaces/api/browser/client';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import { createLayoutStorage } from '@core/primitives/mementos/browser';
import { TaskMainColumn } from './view/task-main-column';
import { TaskSidebar } from './view/task-sidebar';

/** The task view's shared loading presentation: a centered spinner with an optional label. */
export function TaskViewLoadingState({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
      {label && <p className="font-sans text-xs text-foreground-muted">{label}</p>}
    </div>
  );
}

export const TaskMainPanel = observer(function TaskMainPanel() {
  const { projectId } = useTaskViewContext();

  return (
    <projectAvailabilityUi.Boundary projectId={projectId}>
      <TaskMainPanelContent />
    </projectAvailabilityUi.Boundary>
  );
});

const TaskMainPanelContent = observer(function TaskMainPanelContent() {
  const { projectId, taskId } = useTaskViewContext();
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);
  const hostAction = taskHostActionAvailability(projectId);
  const hostActionDisabledReason =
    hostAction.kind === 'disabled'
      ? (projectAvailabilityUi.getLiveActionDisabledReason(projectId) ??
        projectAvailabilityUi.defaultLiveActionDisabledReason)
      : undefined;
  const workspaceId =
    taskStore && 'workspaceId' in taskStore.data ? taskStore.data.workspaceId : undefined;

  if (kind === 'creating') {
    return <TaskViewLoadingState label="正在创建任务…" />;
  }

  if (kind === 'create-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-sans text-sm font-medium text-foreground-destructive">创建任务失败</p>
          <p className="font-sans text-xs text-foreground-passive">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'project-hydrating') {
    return <TaskViewLoadingState label="正在加载项目…" />;
  }

  if (kind === 'provisioning' && taskStore) {
    return <TaskProvisionLoader projectId={projectId} taskId={taskId} taskStore={taskStore} />;
  }

  if (kind === 'provision-error' && taskStore) {
    return (
      <TaskProvisionLoader projectId={projectId} taskId={taskId} taskStore={taskStore} error />
    );
  }

  if (taskStore?.state === 'unprovisioned' && taskStore.workspaceObservedStatus === 'missing') {
    return (
      <MissingWorkspaceState
        actionDisabledReason={hostActionDisabledReason}
        reprovision={() => reprovisionWorkspace(projectId, taskId, workspaceId!, false)}
        removeAndReprovision={() => reprovisionWorkspace(projectId, taskId, workspaceId!, true)}
      />
    );
  }

  if (kind === 'project-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-sans text-sm font-medium text-foreground-destructive">
            设置工作区失败
          </p>
          <p className="font-sans text-xs text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'idle' && hostActionDisabledReason) {
    return (
      <MissingWorkspaceState
        title="工作区不可用"
        description="仍可查看任务记录。访问工作区需要项目恢复可用。"
        actionDisabledReason={hostActionDisabledReason}
        reprovision={async () => {
          await getTaskManagerStore(projectId)?.provisionTask(taskId);
        }}
      />
    );
  }

  if (kind === 'idle' || kind === 'teardown') {
    return <TaskViewLoadingState label="正在设置工作区…" />;
  }

  if (kind === 'teardown-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-sans text-sm font-medium text-foreground-destructive">
            清理工作区失败
          </p>
          <p className="font-sans text-xs text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'missing') {
    return <MissingWorkspaceState />;
  }

  return <ReadyTaskMainPanel />;
});

function MissingWorkspaceState({
  title = '工作区缺失',
  description = 'ply 无法激活此工作区。请重新配置工作区或删除任务。',
  actionDisabledReason,
  reprovision,
  removeAndReprovision,
}: {
  title?: string;
  description?: string;
  actionDisabledReason?: string;
  reprovision?: () => Promise<void>;
  removeAndReprovision?: () => Promise<void>;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-foreground-muted">{description}</p>
      {reprovision && (
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!!actionDisabledReason}
            title={actionDisabledReason}
            aria-label={actionDisabledReason ? `重新配置。${actionDisabledReason}` : '重新配置'}
            onClick={() => void reprovision()}
          >
            重新配置
          </Button>
          {removeAndReprovision && (
            <Button
              size="sm"
              variant="ghost"
              disabled={!!actionDisabledReason}
              title={actionDisabledReason}
              aria-label={
                actionDisabledReason ? `删除并重新配置。${actionDisabledReason}` : '删除并重新配置'
              }
              onClick={() => void removeAndReprovision()}
            >
              删除并重新配置
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

async function reprovisionWorkspace(
  projectId: string,
  taskId: string,
  workspaceId: string,
  removeFirst: boolean
): Promise<void> {
  if (
    removeFirst &&
    !window.confirm('删除并重新配置此工作区？所有未提交的文件和更改都将永久丢失。此操作无法撤销。')
  ) {
    return;
  }
  try {
    const client = await getWorkspacesWireClient();
    const result = removeFirst
      ? await client.removeAndReprovision({ workspaceId })
      : await client.reprovision({ workspaceId });
    if (!result.success) throw new Error(result.error.message);
    await getTaskManagerStore(projectId)?.provisionTask(taskId);
  } catch (error) {
    toast.error('无法重新配置工作区', {
      description: error instanceof Error ? error.message : String(error),
    });
  }
}

const PROVISION_LOADER_DELAY_MS = 300;

/** Human labels for the host createWorktree stages streamed via the records overlay. */
const CREATION_STAGE_LABELS: Record<string, string> = {
  inspect: '正在检查仓库',
  'fetch-branch': '正在获取分支',
  'resolve-base': '正在解析基准分支',
  'fetch-base': '正在获取基准分支',
  'add-worktree': '正在创建工作树',
  'configure-branch': '正在配置分支',
  verify: '正在验证工作树',
};

const TaskProvisionLoader = observer(function TaskProvisionLoader({
  projectId,
  taskId,
  taskStore,
  error = false,
}: {
  projectId: string;
  taskId: string;
  taskStore: NonNullable<ReturnType<typeof getTaskStore>>;
  error?: boolean;
}) {
  const showLoader = useDelayedVisible(error ? 0 : PROVISION_LOADER_DELAY_MS);
  const errorMessage = taskErrorMessage(taskStore);
  const creation = taskStore.workspaceCreation;
  const failedCreation =
    taskStore.workspaceCreateOutcome?.status === 'failed' ? taskStore.workspaceCreateOutcome : null;

  const retry = () => {
    void getTaskManagerStore(projectId)?.provisionTask(taskId);
  };
  const action = taskHostActionAvailability(projectId);
  const retryDisabledReason =
    action.kind === 'disabled'
      ? (projectAvailabilityUi.getLiveActionDisabledReason(projectId) ??
        projectAvailabilityUi.defaultLiveActionDisabledReason)
      : undefined;

  if (!showLoader) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8">
      {!error && <Loader2 className="size-5 animate-spin text-foreground-muted" />}
      <p className="text-sm font-medium text-foreground">
        {error
          ? failedCreation
            ? '创建工作区失败'
            : '激活工作区失败'
          : creation
            ? '正在创建工作区…'
            : '正在激活工作区…'}
      </p>
      {!error && creation && (
        <p className="text-center font-sans text-xs text-foreground-muted">
          {CREATION_STAGE_LABELS[creation.stage] ?? creation.stage}…
        </p>
      )}
      {error && (
        <p className="text-center font-sans text-xs text-foreground-muted">
          {failedCreation
            ? [
                failedCreation.stage
                  ? `执行步骤「${CREATION_STAGE_LABELS[failedCreation.stage] ?? failedCreation.stage}」失败`
                  : null,
                failedCreation.message ?? null,
              ]
                .filter(Boolean)
                .join('：')
            : errorMessage}
        </p>
      )}
      {error && (
        <Button
          size="sm"
          variant="ghost"
          disabled={!!retryDisabledReason}
          title={retryDisabledReason}
          aria-label={retryDisabledReason ? `重试。${retryDisabledReason}` : '重试'}
          onClick={retry}
        >
          重试
        </Button>
      )}
    </div>
  );
});

function useDelayedVisible(delayMs: number): boolean {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) {
      setVisible(true);
      return;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return visible;
}

// Drag-to-close threshold for the right sidebar, in percent of the group. A
// drag can only settle at the 280px floor or wider, or snap to 0 below half
// of it, so the threshold only has to catch the snap. The sidebar keeps its
// pixel width as the window grows, and 280px stays above 1% of any window up
// to 28000px wide, so a drag that settles at the floor never closes it.
const SIDEBAR_CLOSE_THRESHOLD = 1;

// Resize floor (the released builds' value): dragging shrinks the sidebar only
// down to this width; dragging past it snaps the collapsible panel's layout to
// `collapsedSize` (0), which the binding's close-threshold check turns into a
// semantic close.
const SIDEBAR_MIN_SIZE = '280px';

const ReadyTaskMainPanel = observer(function ReadyTaskMainPanel() {
  const taskView = useTaskComposition();
  // Zen is workspace-chrome data; the task sidebar hides while zen is active
  // as a derived condition — no task-chrome mutation, no task-side restore.
  const { isZenActive } = useWorkspaceLayoutContext();
  const isSidebarOpen = !taskView.isSidebarCollapsed && !isZenActive;

  // One storage facade per composition. ReadyTaskMainPanel renders below the
  // task view's space.isHydrated gate, so synchronous reads are safe by
  // contract.
  const layoutStorage = useMemo(
    () => createLayoutStorage(taskView.space, taskPanelLayoutsMemento),
    [taskView.space]
  );
  const sidebarBinding = useCollapsiblePanelBinding({
    storageKey: 'task-sidebar-layout',
    storage: layoutStorage,
    panelIds: ['task-main-area', 'task-sidebar'],
    collapsiblePanelId: 'task-sidebar',
    orientation: 'horizontal',
    open: isSidebarOpen,
    onCloseRequest: () => taskView.chrome.commands.collapseSidebar(),
    closeThreshold: SIDEBAR_CLOSE_THRESHOLD,
  });

  return (
    <taskTabView.TabLayoutProvider layout={taskView.paneLayout}>
      <Resizable.Group id="task-sidebar-layout" {...sidebarBinding.groupProps}>
        <Resizable.Panel id="task-main-area">
          <TaskMainColumn />
        </Resizable.Panel>
        {/* Collapsed = panel AND handle unmounted (sync contract: never
            program the panels). */}
        {isSidebarOpen && (
          <>
            <Resizable.Handle />
            <Resizable.Panel
              {...sidebarBinding.collapsiblePanelProps}
              defaultSize={sidebarBinding.collapsiblePanelProps.defaultSize ?? '25%'}
              minSize={SIDEBAR_MIN_SIZE}
              maxSize="50%"
              collapsible
              collapsedSize="0%"
            >
              <TaskSidebar />
            </Resizable.Panel>
          </>
        )}
      </Resizable.Group>
    </taskTabView.TabLayoutProvider>
  );
});
