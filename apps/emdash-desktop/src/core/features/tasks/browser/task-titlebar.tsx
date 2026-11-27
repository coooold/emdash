import {
  Badge,
  Button,
  MicroLabel,
  Popover,
  Separator,
  Toggle,
  ToggleGroup,
  Tooltip,
} from '@emdash/ui/react/primitives';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  FileDiff,
  FolderOpen,
  GitBranch,
  Pin,
  RefreshCcw,
  Terminal,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  getProjectStore,
  projectDisplayName,
} from '@core/features/projects/api/browser/stores/project-selectors';
import { projectViewDef } from '@core/features/projects/contributions/views';
import { OpenInMenu } from '@core/features/settings/contributions/browser/open-in-menu';
import { getGitRepositoryStore } from '@core/features/source-control/api/browser/stores/source-control-selectors';
import { useGitActions } from '@core/features/source-control/api/browser/use-git-actions';
import { gitCheckoutStoreToken } from '@core/features/source-control/contributions/browser/workspace-store-tokens';
import {
  getRegisteredTaskData,
  getTaskStore,
  taskDisplayName,
  taskViewKind,
} from '@core/features/tasks/api/browser/task-state/task-selectors';
import { type SidebarTab } from '@core/features/tasks/api/browser/types';
import { useTaskViewContext } from '@core/features/tasks/contributions/browser/task-view-context';
import {
  useTaskComposition,
  useWorkspace,
} from '@core/features/workbench/api/browser/task-composition-context';
import { Titlebar } from '@core/features/workbench/contributions/browser/Titlebar';
import { openExternal } from '@core/primitives/desktop-host/browser/host-client';
import { formatDiffLineCount } from '@core/primitives/formatting/browser/format-diff-line-count';
import { BoundShortcut } from '@core/primitives/keybindings/browser/shortcut';
import { linkedIssueDisplayIdentifier, type LinkedIssue } from '@core/primitives/linked-issues/api';
import { useNavigate } from '@core/primitives/navigation/browser/navigation-hooks';
import { cn } from '@core/primitives/styling/browser/cn';
import { ActivityBadge } from './components/activity-badge';
import { AutomationRunPill } from './components/automation-run-pill';
import { IssueSelector, ProviderLogo } from './components/issue-selector/issue-selector';
import { PreviewServerPills } from './components/preview-servers/preview-server-pills';

export const TaskTitlebar = observer(function TaskTitlebar() {
  const { projectId, taskId } = useTaskViewContext();
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);

  if (kind !== 'ready') {
    return <PendingTaskTitlebar taskId={taskId} projectId={projectId} />;
  }

  return <ActiveTaskTitlebar taskId={taskId} projectId={projectId} />;
});

const PendingTaskTitlebar = observer(function PendingTaskTitlebar({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const taskStore = getTaskStore(projectId, taskId);
  const projectName = projectDisplayName(getProjectStore(projectId));
  const name = taskDisplayName(taskStore);
  const { navigate } = useNavigate();

  return (
    <Titlebar
      leftSlot={
        <div className="flex items-center gap-1 px-2 text-sm text-foreground-muted">
          <span className="flex items-center gap-1">
            <button
              type="button"
              className="text-sm text-foreground-passive hover:text-foreground"
              onClick={() => navigate(projectViewDef({ projectId }))}
            >
              {projectName}
            </button>
            <span className="text-sm text-foreground-passive">/</span>
            {name}
          </span>
        </div>
      }
    />
  );
});

const ActiveTaskTitlebar = observer(function ActiveTaskTitlebar({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const taskStore = getTaskStore(projectId, taskId);
  const taskPayload = getRegisteredTaskData(projectId, taskId);
  const workspace = useWorkspace();
  const taskView = useTaskComposition();
  const gitCheckout = workspace.get(gitCheckoutStoreToken);

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

  const linesAdded = gitCheckout.totalLinesAdded;
  const linesDeleted = gitCheckout.totalLinesDeleted;
  const hasDiffStats = linesAdded > 0 || linesDeleted > 0;

  const projectName = projectDisplayName(getProjectStore(projectId));
  const { navigate } = useNavigate();

  if (!taskStore || !taskPayload) return null;

  return (
    <Titlebar
      leftSlot={
        <div className="flex items-center gap-1 px-2">
          <button
            type="button"
            className="text-sm text-foreground-passive hover:text-foreground"
            onClick={() => navigate(projectViewDef({ projectId }))}
          >
            {projectName}
          </button>
          <span className="text-sm text-foreground-passive">/</span>
          <Popover.Root>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Popover.Trigger className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="max-w-56 truncate">{taskDisplayName(taskStore)}</span>
                    </span>
                    <ChevronDown className="size-3.5 shrink-0" />
                  </Popover.Trigger>
                }
              />
              <Tooltip.Content>任务详情</Tooltip.Content>
            </Tooltip.Root>
            <Popover.Content align="start" className="flex w-96 flex-col gap-2 p-4">
              <div className="flex w-full flex-col gap-1">
                <MicroLabel className="flex items-center text-foreground-passive">任务</MicroLabel>
                <span className="text-sm tracking-tight">{taskDisplayName(taskStore)}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-md border border-border p-2">
                <span className="flex items-center gap-1 text-foreground-muted">
                  <GitBranch className="size-3.5" />
                  <span>{gitCheckout.branchName}</span>
                </span>
                <div className="flex w-full items-center gap-1">
                  {isPublished ? (
                    <>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="secondary"
                            size="xs"
                            disabled={isFetching}
                            onClick={() => fetch()}
                          >
                            <RefreshCcw className="size-3" />
                            {isFetching ? '正在获取…' : '获取'}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {isFetching ? '正在获取…' : '获取更改'}
                        </Tooltip.Content>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="secondary"
                            disabled={isPulling || behindCount === 0}
                            size="xs"
                            onClick={() => pull()}
                          >
                            <ArrowDown className="size-3" />
                            {isPulling ? (
                              '正在拉取…'
                            ) : (
                              <span className="flex items-center gap-1">
                                拉取
                                <Badge>{behindCount}</Badge>
                              </span>
                            )}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {isPulling
                            ? '正在拉取…'
                            : behindCount === 0
                              ? '没有可拉取的更改'
                              : '拉取更改'}
                        </Tooltip.Content>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="secondary"
                            disabled={isPushing || aheadCount === 0}
                            size="xs"
                            onClick={() => push()}
                          >
                            <ArrowUp className="size-3" />
                            {isPushing ? (
                              '正在推送…'
                            ) : (
                              <span className="flex items-center gap-1">
                                推送
                                <Badge>{aheadCount}</Badge>
                              </span>
                            )}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          {isPushing
                            ? '正在推送…'
                            : aheadCount === 0
                              ? '没有可推送的更改'
                              : '推送更改'}
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </>
                  ) : (
                    <Tooltip.Root>
                      <Tooltip.Trigger className="flex-1">
                        <Button
                          className="w-full"
                          variant="secondary"
                          disabled={isPublishing || gitCheckout.headKind !== 'branch'}
                          size="xs"
                          onClick={() => publish()}
                        >
                          <ArrowUp className="size-3" />
                          {isPublishing ? '正在发布…' : '发布'}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {isPublishing
                          ? '正在发布…'
                          : gitCheckout.headKind === 'unborn'
                            ? '请先创建初始提交'
                            : '发布分支'}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  )}
                </div>
              </div>
              <IssueSelector
                value={taskPayload.linkedIssue ?? null}
                onValueChange={(issue) => {
                  void taskStore.updateLinkedIssue(issue ?? undefined);
                }}
                projectId={projectId}
                repositoryUrl={getGitRepositoryStore(projectId)?.canonicalRepositoryUrl ?? ''}
                projectPath={workspace.path}
                excludeTaskId={taskId}
              />
            </Popover.Content>
          </Popover.Root>
          {taskPayload.linkedIssue ? <LinkedIssueBadge issue={taskPayload.linkedIssue} /> : null}
          {taskPayload.type === 'task' && (
            <button
              className={cn(
                'text-foreground-muted ml-1',
                taskPayload.isPinned && 'text-muted-foreground'
              )}
              onClick={() => taskStore.setPinned(!taskPayload.isPinned)}
            >
              <Pin
                className={cn('size-3.5', taskPayload.isPinned && 'text-foreground-muted')}
                fill={taskPayload.isPinned ? 'currentColor' : 'none'}
              />
            </button>
          )}
          {taskPayload.automationRunId && (
            <AutomationRunPill taskStore={taskStore} isConverted={taskPayload.type === 'task'} />
          )}
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-2">
          <ActivityBadge projectId={projectId} taskId={taskId} />
          <PreviewServerPills />
          <OpenInMenu
            path={workspace.path}
            className="h-7 bg-transparent"
            borderless
          />
          <Separator orientation="vertical" className="h-5 self-center!" />
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Toggle
                size="sm"
                icon
                pressed={taskView.isTerminalDrawerOpen}
                onPressedChange={() => taskView.chrome.commands.toggleTerminalDrawer()}
              >
                <Terminal className="size-3.5" />
              </Toggle>
            </Tooltip.Trigger>
            <Tooltip.Content>
              显示或隐藏终端{' '}
              <BoundShortcut command="task.toggleTerminalDrawer" variant="keycaps" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Separator orientation="vertical" className="h-5 self-center!" />
          <ToggleGroup.Root
            value={taskView.isSidebarCollapsed ? [] : [taskView.sidebarTab]}
            onValueChange={([tab]) => {
              if (!tab) {
                taskView.chrome.commands.collapseSidebar();
              } else {
                taskView.chrome.commands.openSidebarTab(tab as SidebarTab);
              }
            }}
            className="bg-transparent"
          >
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <ToggleGroup.Item
                    value="changes"
                    size="sm"
                    aria-label="更改"
                    className={cn('w-auto! min-w-7! gap-0', hasDiffStats && 'w-full px-2!')}
                  >
                    <FileDiff className="size-3.5" />
                    <span
                      className={cn(
                        'overflow-hidden transition-[max-width,padding-left] duration-500 ease-in-out flex items-center tabular-nums text-xs leading-none gap-1',
                        hasDiffStats ? 'max-w-20 pl-1' : 'max-w-0 pl-0'
                      )}
                    >
                      {linesAdded > 0 && (
                        <span className="text-foreground-diff-added">
                          +{formatDiffLineCount(linesAdded)}
                        </span>
                      )}
                      {linesDeleted > 0 && (
                        <span className="text-foreground-diff-deleted">
                          -{formatDiffLineCount(linesDeleted)}
                        </span>
                      )}
                    </span>
                  </ToggleGroup.Item>
                }
              />
              <Tooltip.Content>
                更改 <BoundShortcut command="task.sidebarChanges" variant="keycaps" />
              </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <ToggleGroup.Item size="sm" icon value="files" aria-label="文件">
                    <FolderOpen className="size-3.5" />
                  </ToggleGroup.Item>
                }
              />
              <Tooltip.Content>
                文件 <BoundShortcut command="task.sidebarFiles" variant="keycaps" />
              </Tooltip.Content>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <ToggleGroup.Item size="sm" icon value="conversations" aria-label="对话">
                    <Clock className="size-3.5" />
                  </ToggleGroup.Item>
                }
              />
              <Tooltip.Content>
                对话{' '}
                <BoundShortcut command="task.sidebarConversations" variant="keycaps" />
              </Tooltip.Content>
            </Tooltip.Root>
          </ToggleGroup.Root>
        </div>
      }
    />
  );
});

function LinkedIssueBadge({ issue }: { issue: LinkedIssue }) {
  const displayIdentifier = linkedIssueDisplayIdentifier(issue);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            type="button"
            disabled={!issue.url}
            onClick={() => {
              if (issue.url) void openExternal(issue.url);
            }}
            className="hover:bg-muted/30 flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground-muted disabled:cursor-default disabled:opacity-60"
          >
            <ProviderLogo provider={issue.provider} className="h-3 w-3" />
            {displayIdentifier ? (
              <span className="font-sans">{displayIdentifier}</span>
            ) : (
              <span className="max-w-[180px] truncate">{issue.title || '关联工单'}</span>
            )}
          </button>
        }
      />
      <Tooltip.Content>{issue.title || issue.identifier}</Tooltip.Content>
    </Tooltip.Root>
  );
}
