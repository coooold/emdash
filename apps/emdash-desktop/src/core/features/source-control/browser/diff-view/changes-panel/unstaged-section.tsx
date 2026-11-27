import type { GitChange } from '@emdash/core/runtimes/git/api';
import { EmptyState } from '@emdash/ui/react/components';
import { Button, toast } from '@emdash/ui/react/primitives';
import { Plus, Undo2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { gitCheckoutStoreToken } from '@core/features/source-control/contributions/browser/workspace-store-tokens';
import { formatErrorType } from '@core/features/tasks/api/browser/utils';
import {
  useTaskComposition,
  useWorkspace,
} from '@core/features/workbench/api/browser/task-composition-context';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import { HEAD_REF } from '@core/primitives/git/api';
import { commitRef } from '@core/primitives/git/api';
import { activeDiffEntry } from '../pane-selectors';
import { ActionCard } from './components/action-card';
import { ChangesListOrTree } from './components/changes-list-or-tree';
import { ChangesViewModeToggle } from './components/changes-view-mode-toggle';
import { CommitCard } from './components/commit-card';
import { SectionHeader } from './components/section-header';
import { useChangesViewMode } from './hooks/use-changes-view-mode';
import { usePrefetchDiffModels } from './hooks/use-prefetch-diff-models';

/** Always-visible header row; rendered as a direct child of the sections group. */
export const UnstagedSectionHeader = observer(function UnstagedSectionHeader() {
  const taskView = useTaskComposition();
  const workspace = useWorkspace();
  const git = workspace.get(gitCheckoutStoreToken);
  const changesView = taskView.diffView?.changesView;
  const { mode: viewMode, setMode: setViewMode } = useChangesViewMode('unstaged');

  if (!changesView) return null;

  return (
    <SectionHeader
      label="未暂存"
      collapsed={!changesView.expandedSections.unstaged}
      onToggleCollapsed={() => changesView.toggleExpanded('unstaged')}
      count={git.unstagedFileChanges.length}
      selectionState={changesView.unstagedSelectionState}
      onToggleAll={() => changesView.toggleAllUnstaged()}
      actions={<ChangesViewModeToggle value={viewMode} onChange={setViewMode} label="未暂存" />}
    />
  );
});

/** Section body; mounted inside a Resizable.Panel only while the section is expanded. */
export const UnstagedSectionBody = observer(function UnstagedSectionBody() {
  const taskView = useTaskComposition();
  const workspace = useWorkspace();
  const git = workspace.get(gitCheckoutStoreToken);
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView;

  const changes = git.unstagedFileChanges;
  const hasChanges = changes.length > 0;
  const hasStagedChanges = git.stagedFileChanges.length > 0;

  const _activeDiff = activeDiffEntry(taskView.activePane);
  const activePath = _activeDiff?.diffGroup === 'disk' ? _activeDiff.path : undefined;

  const prefetch = usePrefetchDiffModels('disk', HEAD_REF);

  const { mode: viewMode } = useChangesViewMode('unstaged');

  const openConfirmActionModal = useOpenModal('confirmActionModal');

  if (!diffView || !changesView) return null;

  const handleSelectChange = (change: GitChange) => {
    taskView.activePane.open(
      'diff',
      {
        activeFile: {
          path: change.path,
          type: 'disk',
          group: 'disk',
          originalRef: commitRef('HEAD'),
        },
        status: change.status,
      },
      { preview: true }
    );
  };

  const handleDoubleClickChange = (change: GitChange) => {
    taskView.activePane.open(
      'diff',
      {
        activeFile: {
          path: change.path,
          type: 'disk',
          group: 'disk',
          originalRef: commitRef('HEAD'),
        },
        status: change.status,
      },
      { preview: false }
    );
  };

  const handleDiscardSelection = () => {
    const paths = [...changesView.unstagedSelection];
    void (async () => {
      const outcome = await openConfirmActionModal({
        title: '丢弃文件变更',
        variant: 'destructive',
        description:
          '确定丢弃选中文件的变更吗？此操作无法撤销。',
      });
      if (!outcome.success) return;

      const result = await git.discardFiles(paths);
      if (!result.success) {
        toast.error(`丢弃变更失败：${formatErrorType(result.error)} `);
        return;
      }
      changesView.removeUnstagedSelection(paths);
    })();
  };

  const handleDiscardAll = () => {
    void (async () => {
      const outcome = await openConfirmActionModal({
        title: '丢弃所有变更',
        variant: 'destructive',
        description: '确定丢弃所有变更吗？此操作无法撤销。',
      });
      if (!outcome.success) return;

      const result = await git.discardAllFiles();
      if (!result.success) {
        toast.error(`丢弃变更失败：${formatErrorType(result.error)} `);
      }
    })();
  };

  const handleStageSelection = () => {
    const paths = [...changesView.unstagedSelection];
    void git.stageFiles(paths).then((result) => {
      if (!result.success) {
        toast.error(`暂存变更失败：${formatErrorType(result.error)} `);
        return;
      }
      changesView.removeUnstagedSelection(paths);
    });
  };

  const handleStageAll = () => {
    void git.stageAllFiles().then((result) => {
      if (!result.success) {
        toast.error(`暂存变更失败：${formatErrorType(result.error)} `);
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!hasChanges && (
        <EmptyState label="工作树干净" description="没有未提交的文件变更。" />
      )}
      {hasChanges && (
        <ActionCard
          selectedCount={changesView.unstagedSelection.size}
          selectionActions={
            <>
              <Button
                variant="link"
                size="xs"
                onClick={handleDiscardSelection}
                title="丢弃选中文件的变更"
                className="text-foreground-destructive"
              >
                <Undo2 className="size-3" />
                丢弃
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={handleStageSelection}
                title="暂存选中的文件"
              >
                <Plus className="size-3" />
                暂存
              </Button>
            </>
          }
          generalActions={
            <>
              <Button
                variant="link"
                size="xs"
                disabled={!hasChanges}
                onClick={handleDiscardAll}
                title="丢弃所有变更"
                className="text-foreground-destructive"
              >
                <Undo2 className="size-3" />
                全部丢弃
              </Button>
              <Button
                variant="secondary"
                size="xs"
                disabled={!hasChanges}
                onClick={handleStageAll}
                title="暂存所有变更"
              >
                <Plus className="size-3" />
                全部暂存
              </Button>
            </>
          }
        />
      )}
      <div className="min-h-0 flex-1 px-1">
        <ChangesListOrTree
          viewMode={viewMode}
          changes={changes}
          rootPath={workspace.path}
          isSelected={(path) => changesView.unstagedSelection.has(path)}
          onToggleSelect={(path) => changesView.toggleUnstagedItem(path)}
          activePath={activePath}
          onSelectChange={handleSelectChange}
          onDoubleClickChange={handleDoubleClickChange}
          onPrefetch={(change) => prefetch(change.path)}
        />
      </div>
      {hasChanges && !hasStagedChanges && <CommitCard autoStage />}
    </div>
  );
});
