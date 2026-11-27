import { EmptyState } from '@emdash/ui/react/components';
import {
  Button,
  Resizable,
  useResizableDefaultLayout,
  useToast,
} from '@emdash/ui/react/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranchPlus, RotateCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { Fragment, useMemo } from 'react';
import {
  asAvailableProject,
  getProjectStore,
} from '@core/features/projects/api/browser/stores/project-selectors';
import {
  initializeProjectRepository,
  inspectProjectPath,
} from '@core/features/source-control/api/browser/client';
import { getGitRepositoryStore } from '@core/features/source-control/api/browser/stores/source-control-selectors';
import { GitStatusSection } from '@core/features/source-control/browser/diff-view/changes-panel/git-status-section';
import {
  StagedSectionBody,
  StagedSectionHeader,
} from '@core/features/source-control/browser/diff-view/changes-panel/staged-section';
import {
  UnstagedSectionBody,
  UnstagedSectionHeader,
} from '@core/features/source-control/browser/diff-view/changes-panel/unstaged-section';
import type { ChangesViewStore } from '@core/features/source-control/browser/diff-view/stores/changes-view-store';
import { gitCheckoutStoreToken } from '@core/features/source-control/contributions/browser/workspace-store-tokens';
import { useTaskViewContext } from '@core/features/tasks/contributions/browser/task-view-context';
import { taskPanelLayoutsMemento } from '@core/features/tasks/contributions/mementos';
import {
  useTaskComposition,
  useWorkspace,
} from '@core/features/workbench/api/browser/task-composition-context';
import { createLayoutStorage } from '@core/primitives/mementos/browser';
import type { InitializeRepositoryError } from '@core/primitives/projects/api';

const SECTION_IDS = ['unstaged', 'staged'] as const;
type SectionId = (typeof SECTION_IDS)[number];

/** Persistence id for the sections group's per-combination layouts. */
const SECTIONS_STORAGE_ID = 'changes-panel-sections';

// Drag-to-collapse threshold in percent of the group. A drag that settles a
// section body below this issues the semantic collapse command instead of
// persisting the sliver; matches the task sidebar's 8% close threshold.
const SECTION_COLLAPSE_THRESHOLD = 8;

export const ChangesPanel = observer(function ChangesPanel() {
  const { projectId } = useTaskViewContext();
  const taskView = useTaskComposition();
  const workspace = useWorkspace();
  const gitCheckout = workspace.get(gitCheckoutStoreToken);
  const project = asAvailableProject(getProjectStore(projectId))?.project;
  const isSshWorkspace = Boolean(workspace.sshConnectionId);
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const noRepositoryQueryKey = [
    'changesPanelRepositoryStatus',
    projectId,
    workspace.workspaceId,
    workspace.path,
  ] as const;
  const repositoryStatusQuery = useQuery({
    queryKey: noRepositoryQueryKey,
    enabled: !isSshWorkspace && !gitCheckout.hasData && project?.type === 'local',
    queryFn: () => inspectProjectPath({ type: 'local', path: workspace.path }),
  });

  const retryCheckoutMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        gitCheckout.retry(),
        queryClient.invalidateQueries({ queryKey: noRepositoryQueryKey }),
      ]);
    },
  });

  const initializeRepositoryMutation = useMutation({
    mutationFn: async () => {
      return initializeProjectRepository(projectId);
    },
    onSuccess: async (result) => {
      if (!result.success) {
        toast.error('初始化 Git 仓库失败', {
          description: initializeRepositoryErrorMessage(result.error),
        });
        return;
      }

      await Promise.all([
        gitCheckout.retry(),
        getGitRepositoryStore(projectId)?.retry(),
        queryClient.invalidateQueries({ queryKey: ['projectPathStatus'] }),
        queryClient.invalidateQueries({ queryKey: noRepositoryQueryKey }),
      ]);
      toast('已初始化 Git 仓库');
    },
    onError: (error) => {
      toast.error('初始化 Git 仓库失败', {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });

  if (isSshWorkspace) {
    return <EmptyState label="无法获取 Git 状态" description="此 SSH 工作区已停用。" />;
  }

  if (!diffView || !changesView) return null;
  if (!gitCheckout.hasData) {
    const status = repositoryStatusQuery.data;
    if (status?.isDirectory && !status.error && status.isGitRepo === false) {
      return (
        <EmptyState
          label="此文件夹不是 Git 仓库"
          description="初始化 Git 后即可查看变更、提交代码、管理分支和使用工作树任务。"
          action={
            <Button
              variant="primary"
              type="button"
              size="sm"
              onClick={() => initializeRepositoryMutation.mutate()}
              disabled={initializeRepositoryMutation.isPending}
            >
              <GitBranchPlus className="size-3.5" />
              {initializeRepositoryMutation.isPending
                ? '正在初始化…'
                : '初始化 Git 仓库'}
            </Button>
          }
        />
      );
    }
    // The store's startup timeout guarantees loading eventually resolves to an
    // error; never leave the panel silently blank once syncing has failed.
    if (gitCheckout.error) {
      return (
        <EmptyState
          label="无法获取 Git 状态"
          description={gitCheckout.error}
          action={
            <Button
              variant="secondary"
              type="button"
              size="sm"
              onClick={() => retryCheckoutMutation.mutate()}
              disabled={retryCheckoutMutation.isPending}
            >
              <RotateCw className="size-3.5" />
              {retryCheckoutMutation.isPending ? '正在重试…' : '重试'}
            </Button>
          }
        />
      );
    }
    return null;
  }

  return <ChangesPanelSections changesView={changesView} />;
});

/**
 * The multi-section composition (per-feature variant of the shared panel
 * binding, per the panel-binding decision): section headers are inert
 * fixed-height rows rendered as direct Group children, only expanded section
 * bodies are panels, and section expansion is owned by
 * `ChangesViewStore.expandedSections` — toggling mounts/unmounts bodies, never
 * imperative panel calls.
 *
 * Sizes persist per expansion combination through the task-scoped
 * panel-layouts memento: `useResizableDefaultLayout({ panelIds })` natively
 * keys storage by the expanded panel ids. The library reads `defaultLayout`
 * only at group mount, so the Group is keyed by the combination — sibling
 * bodies remounting on any toggle is the accepted cost.
 */
const ChangesPanelSections = observer(function ChangesPanelSections({
  changesView,
}: {
  changesView: ChangesViewStore;
}) {
  const taskView = useTaskComposition();
  // One storage facade per composition. The panel renders below the task
  // view's space.isHydrated gate, so synchronous reads are safe by contract.
  const layoutStorage = useMemo(
    () => createLayoutStorage(taskView.space, taskPanelLayoutsMemento),
    [taskView.space]
  );

  const expanded = changesView.expandedSections;
  const expandedIds = SECTION_IDS.filter((id) => expanded[id]);

  const { defaultLayout, onLayoutChanged: persist } = useResizableDefaultLayout({
    id: SECTIONS_STORAGE_ID,
    panelIds: expandedIds,
    storage: layoutStorage,
  });

  const handleLayoutChanged = (layout: Record<string, number>) => {
    // onLayoutChanged also fires on mount and reflows; ignore layouts that do
    // not describe the current combination (e.g. a dying group's last reflow).
    if (expandedIds.length === 0 || expandedIds.some((id) => layout[id] === undefined)) {
      return;
    }
    for (const id of expandedIds) {
      if (layout[id]! < SECTION_COLLAPSE_THRESHOLD) {
        // The one semantic/pixel crossing point: the drag settled below the
        // collapse threshold, so issue the semantic command (which unmounts
        // the body and remounts the group) and never persist the sliver.
        changesView.collapseSection(id);
        return;
      }
    }
    persist(layout);
  };

  const hasLaterExpanded = (id: SectionId) =>
    SECTION_IDS.slice(SECTION_IDS.indexOf(id) + 1).some((later) => expanded[later]);

  const sections: Array<{
    id: SectionId;
    header: React.ReactNode;
    body: React.ReactNode;
  }> = [
    { id: 'unstaged', header: <UnstagedSectionHeader />, body: <UnstagedSectionBody /> },
    { id: 'staged', header: <StagedSectionHeader />, body: <StagedSectionBody /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <Resizable.Group
        orientation="vertical"
        className="min-h-0 flex-1"
        id="changes-panel-sections"
        // Remount the group per expansion combination so the freshly-read
        // per-combination defaultLayout applies (only consulted at mount).
        key={expandedIds.join('|')}
        defaultLayout={defaultLayout}
        onLayoutChanged={handleLayoutChanged}
        disableCursor
      >
        {sections.map(({ id, header, body }) => (
          // Fragments create no DOM nodes, so headers, panels, and handles
          // stay direct DOM children of the Group as the library requires.
          <Fragment key={id}>
            {header}
            {expanded[id] && (
              <Resizable.Panel id={id} minSize="0%" className="flex flex-col overflow-hidden">
                {body}
              </Resizable.Panel>
            )}
            {expanded[id] && hasLaterExpanded(id) && <Resizable.Handle variant="ghost" />}
          </Fragment>
        ))}
      </Resizable.Group>
      <GitStatusSection />
    </div>
  );
});

function initializeRepositoryErrorMessage(error: InitializeRepositoryError): string {
  if (error.type === 'not-repository') return `在 ${error.path} 未找到 Git 仓库`;
  if ('message' in error) return error.message;
  return '无法初始化 Git 仓库';
}
