import { Button, Tooltip } from '@emdash/ui/react/primitives';
import { ArrowDown, ArrowUp, GitBranch, RefreshCcw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  asAvailableProject,
  getProjectStore,
  projectDisplayName,
} from '@core/features/projects/api/browser/stores/project-selectors';
import { getGitRepositoryStore } from '@core/features/source-control/api/browser/stores/source-control-selectors';
import { getTaskGitCheckoutStore } from '@core/features/source-control/api/browser/stores/task-source-control-selectors';
import { useGitActions } from '@core/features/source-control/api/browser/use-git-actions';
import { getTaskStore } from '@core/features/tasks/api/browser/task-state/task-selectors';
import { useTaskViewContext } from '@core/features/tasks/contributions/browser/task-view-context';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import { getBranchTooltipText, getPublishTooltipText } from './git-status-tooltips';

export const GitStatusSection = observer(function GitStatusSection() {
  const { projectId, taskId } = useTaskViewContext();
  const workspaceId = getTaskStore(projectId, taskId)?.workspaceId;
  const git = getTaskGitCheckoutStore(projectId, taskId);
  const headDisplay = git?.headDisplay ?? null;
  const headKind = git?.headKind ?? 'branch';
  const isDetached = headKind === 'detached';
  const project = getProjectStore(projectId);
  const projectName = projectDisplayName(project) ?? 'repository';
  const context = asAvailableProject(project);
  const hostActionReason = context
    ? projectAvailabilityUi.getLiveActionDisabledReason(projectId)
    : '恢复项目访问后可用。';
  const hostActionDisabled = hostActionReason !== null;
  const repositoryStore = getGitRepositoryStore(projectId);
  const openAddRemoteModal = useOpenModal('addRemoteModal');

  const {
    isPublished,
    aheadCount,
    behindCount,
    fetch,
    pull,
    push,
    publish,
    isPublishing,
    isFetching,
    isPulling,
    isPushing,
  } = useGitActions(projectId, taskId);
  const shouldOfferAddRemote = (repositoryStore?.remotes.length ?? 0) === 0;

  const handlePublishClick = () => {
    if (hostActionDisabled || !headDisplay || headKind !== 'branch' || !workspaceId) return;
    if (shouldOfferAddRemote) {
      void openAddRemoteModal({
        projectId,
        projectName,
        workspaceId,
      });
      return;
    }
    publish();
  };

  return (
    <Tooltip.Provider>
      <div className="flex flex-col gap-2 border-t border-border p-2">
        <div className="flex items-center justify-between gap-2 text-foreground-muted">
          <Tooltip.Root>
            <Tooltip.Trigger className="flex min-w-0 items-center gap-2">
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate text-xs">{headDisplay}</span>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">
              {getBranchTooltipText(headDisplay, headKind)}
            </Tooltip.Content>
          </Tooltip.Root>
          <div className="flex items-center gap-1">
            {isPublished && !isDetached ? (
              <>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        variant="secondary"
                        size="xs"
                        icon
                        disabled={isFetching}
                        aria-disabled={hostActionDisabled}
                        aria-description={hostActionReason ?? undefined}
                        onClick={() => {
                          if (!hostActionDisabled) fetch();
                        }}
                      >
                        <RefreshCcw className="size-3" />
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    {hostActionReason ?? (isFetching ? '正在获取…' : '获取变更')}
                  </Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        variant="secondary"
                        size="xs"
                        icon
                        disabled={isPulling || behindCount === 0}
                        aria-disabled={hostActionDisabled}
                        aria-description={hostActionReason ?? undefined}
                        onClick={() => {
                          if (!hostActionDisabled) pull();
                        }}
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    {hostActionReason ??
                      (isPulling
                        ? '正在拉取…'
                        : behindCount === 0
                          ? '没有需要拉取的变更'
                          : '拉取变更')}
                  </Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        variant="secondary"
                        size="xs"
                        icon
                        disabled={isPushing || aheadCount === 0}
                        aria-disabled={hostActionDisabled}
                        aria-description={hostActionReason ?? undefined}
                        onClick={() => {
                          if (!hostActionDisabled) push();
                        }}
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    {hostActionReason ??
                      (isPushing
                        ? '正在推送…'
                        : aheadCount === 0
                          ? '没有需要推送的变更'
                          : '推送变更')}
                  </Tooltip.Content>
                </Tooltip.Root>
              </>
            ) : (
              !isDetached && (
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={isPublishing || !headDisplay || headKind !== 'branch'}
                        aria-disabled={hostActionDisabled}
                        aria-description={hostActionReason ?? undefined}
                        onClick={handlePublishClick}
                      >
                        <ArrowUp className="size-3" />
                        {isPublishing
                          ? '正在发布…'
                          : shouldOfferAddRemote
                            ? '添加远端'
                            : '发布'}
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    {hostActionReason ??
                      getPublishTooltipText({
                        isPublishing,
                        headDisplay,
                        headKind,
                        shouldOfferAddRemote,
                      })}
                  </Tooltip.Content>
                </Tooltip.Root>
              )
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
});
