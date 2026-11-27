import type { PullRequest } from '@ply/plugins/pull-requests/schemas';
import { Dialog } from '@ply/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { firstAvailableProjectId } from '@core/features/projects/api/browser/stores/project-selectors';
import { useProjectGitContext } from '@core/features/tasks/api/browser/create-task-modal/use-project-git-context';
import { MISSING_BRANCH_REASON } from '@core/features/tasks/api/browser/create-task-modal/use-workspace-config';
import { useTaskSettings } from '@core/features/tasks/api/browser/hooks/useTaskSettings';
import { taskHostActionAvailability } from '@core/features/tasks/api/browser/task-state/task-selectors';
import { ConversationField } from '@core/features/tasks/contributions/browser/task-config/conversation-field';
import { useInitialConversationState } from '@core/features/tasks/contributions/browser/task-config/initial-conversation-section';
import { TaskConfigPanel } from '@core/features/tasks/contributions/browser/task-config/task-config-panel';
import { TaskStateProvider } from '@core/features/tasks/contributions/browser/task-config/task-state-context';
import { WorkspaceSettingsSection } from '@core/features/tasks/contributions/browser/task-config/workspace-settings-section';
import { useModalController } from '@core/manifests/browser/modal-api';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { defineModal } from '@core/primitives/modals/react';
import { useNavigate } from '@core/primitives/navigation/browser/navigation-hooks';
import { getNavigation } from '@core/primitives/navigation/browser/navigation-selectors';
import { createTaskModalDefaults, type CreateTaskStrategy } from './create-task-modal-defaults';
import { TaskNameField } from './task-name-field';
import { useCreateTaskCallback } from './use-create-task-callback';
import { useCreateTaskState } from './use-create-task-state';

function useDefaultProjectId(propProjectId?: string): string | undefined {
  return useMemo(() => {
    if (propProjectId) return propProjectId;
    const nav = getNavigation();
    const params = nav.currentRef.params as { projectId?: string };
    const navProjectId =
      nav.currentViewId === 'task' || nav.currentViewId === 'project'
        ? params.projectId
        : undefined;
    return navProjectId ?? firstAvailableProjectId();
    // oxlint-disable-next-line react/exhaustive-deps
  }, []); // computed once on mount
}

export const CreateTaskModal = observer(function CreateTaskModal({
  projectId,
  strategy: initialStrategy,
  initialWorkspaceId,
}: {
  projectId?: string;
  strategy?: CreateTaskStrategy;
  initialPR?: PullRequest;
  initialWorkspaceId?: string;
}) {
  const { complete } = useModalController('taskModal');
  const selectedProjectId = useDefaultProjectId(projectId);

  const { defaultBranch, isUnborn, hasRepository, currentBranch, repositoryWorkspaceId } =
    useProjectGitContext(selectedProjectId);

  const defaults = createTaskModalDefaults(initialStrategy, {
    hasIssues: false,
    hasPullRequests: false,
  });
  const state = useCreateTaskState(
    selectedProjectId,
    defaultBranch,
    isUnborn,
    hasRepository,
    currentBranch,
    repositoryWorkspaceId,
    undefined,
    null,
    initialWorkspaceId
  );

  const { includeIssueContextByDefault } = useTaskSettings();
  const initialConversation = useInitialConversationState(selectedProjectId);
  const { navigate } = useNavigate();

  const { handleCreateTask, canCreate } = useCreateTaskCallback({
    selectedProjectId,
    state,
    initialConversation,
    navigate,
    onCreated: complete,
  });
  const createAvailability = selectedProjectId
    ? taskHostActionAvailability(selectedProjectId)
    : ({ kind: 'disabled' } as const);
  const createDisabledReason = !selectedProjectId
    ? '请选择项目。'
    : createAvailability.kind === 'disabled'
      ? (projectAvailabilityUi.getLiveActionDisabledReason(selectedProjectId) ??
        projectAvailabilityUi.defaultLiveActionDisabledReason)
      : state.workspaceConfig.missingBranch
        ? MISSING_BRANCH_REASON
        : undefined;

  return (
    <>
      <Dialog.Header className="flex items-center gap-2">
        <Dialog.Title>创建任务</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <div className="flex w-full flex-col gap-5">
          <TaskNameField state={state.taskName} />
          <TaskStateProvider
            workspaceConfig={state.workspaceConfig}
            initialConversation={initialConversation}
            projectId={selectedProjectId}
            isUnborn={isUnborn}
            hasRepository={hasRepository}
            hasPR={state.linkedType === 'pr' && state.linkedPR !== null}
            linkedIssue={
              state.linkedType === 'issue' ? (state.linkedIssue ?? undefined) : undefined
            }
            includeIssueContextByDefault={includeIssueContextByDefault}
          >
            <TaskConfigPanel
              defaultTab={defaults.tab}
              tabs={[
                {
                  value: 'conversation',
                  label: '初始对话',
                  content: <ConversationField />,
                },
                {
                  value: 'workspace',
                  label: '工作区设置',
                  content: (
                    <WorkspaceSettingsSection
                      defaultOpen={defaults.tab === 'workspace' || !!initialWorkspaceId}
                    />
                  ),
                },
              ]}
            />
          </TaskStateProvider>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <ConfirmButton
          variant="primary"
          size="sm"
          onClick={handleCreateTask}
          disabled={
            !canCreate || initialConversation.issueContextEditorOpen || !!createDisabledReason
          }
          title={createDisabledReason}
          aria-label={createDisabledReason ? `创建。${createDisabledReason}` : '创建'}
        >
          创建
        </ConfirmButton>
      </Dialog.Footer>
    </>
  );
});

export const taskModal = defineModal<void>()({
  id: 'taskModal',
  component: CreateTaskModal,
  ignoreOutsidePressAfterWindowBlur: true,
});
