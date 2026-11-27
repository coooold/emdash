import { EmptyState, WorkspaceIcon } from '@emdash/ui/react/components';
import {
  CollectionToolbar,
  CollectionView,
  CollectionViewCell,
  useQueryListSource,
  type CollectionViewColumn,
} from '@emdash/ui/react/patterns';
import { Button, RelativeTime } from '@emdash/ui/react/primitives';
import { PlusIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useWorkspaceRows } from '@core/features/workspaces/api/browser/use-workspace-rows';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import {
  buildWorkspaceItems,
  createWorkspacesListView,
  type WorkspacesListItem,
  type WorkspacesListViewModel,
} from './workspaces-list-model';

const WORKSPACE_COLUMNS: CollectionViewColumn<WorkspacesListItem>[] = [
  {
    id: 'icon',
    width: '2.25rem',
    cell: (item) => <WorkspaceIcon type={item.kind} status={item.status} />,
  },
  {
    id: 'name',
    width: 'minmax(0, 1fr)',
    cell: (item) => <CollectionViewCell primary={item.name} secondary={item.path} />,
  },
  {
    id: 'worktrees',
    width: '10rem',
    cell: (item) => (
      <CollectionViewCell
        primary={`${item.worktreeCount} 个工作树`}
        secondary={`${item.linkedTaskCount} 个关联任务`}
      />
    ),
  },
  {
    id: 'usage',
    width: '10rem',
    cell: (item) => (
      <CollectionViewCell
        primary={item.lastActivityAt ? <RelativeTime value={item.lastActivityAt} /> : '无活动记录'}
        secondary={`${item.activeTaskCount} 个活跃任务`}
      />
    ),
  },
];

/**
 * One row per project, rendered through CollectionView in state mode; clicking
 * a row opens the local project's workspace detail.
 */
export const WorkspacesListView = observer(function WorkspacesListView({
  openDetail,
}: {
  openDetail: (projectId: string) => void;
}) {
  const openAddProject = useOpenModal('addProjectModal');
  const workspaceRows = useWorkspaceRows({ scope: { kind: 'local' }, enabled: true });
  const { workspaceQuery, groups } = workspaceRows;

  // `groups` is derived from the query plus usage joins, so it stands in for
  // the query's data; loading/error still come from the query itself.
  const source = useQueryListSource(
    {
      data: groups,
      isLoading: workspaceQuery.isLoading,
      isError: workspaceQuery.isError,
      error: workspaceQuery.error,
    },
    buildWorkspaceItems
  );
  const [view] = useState(() => createWorkspacesListView(source));

  return (
    <view.Root>
      <CollectionView
        view={view}
        columns={WORKSPACE_COLUMNS}
        toolbar={
          <WorkspacesToolbar
            view={view}
            onAddProject={() => void openAddProject({ mode: 'pick' })}
          />
        }
        onItemClick={(item) => openDetail(item.id)}
        errorSlot={
          <EmptyState
            bare
            label="无法加载工作区"
            description={errorMessage(workspaceQuery.error)}
          />
        }
        emptySlot={<WorkspacesEmpty view={view} />}
      />
    </view.Root>
  );
});

const WorkspacesToolbar = observer(function WorkspacesToolbar({
  view,
  onAddProject,
}: {
  view: WorkspacesListViewModel;
  onAddProject: () => void;
}) {
  const search = view.useSearch();
  return (
    <CollectionToolbar.Root>
      <CollectionToolbar.Search
        value={search.query}
        onValueChange={search.setQuery}
        placeholder="搜索工作区…"
      />
      <CollectionToolbar.Spacer />
      <CollectionToolbar.Group>
        <Button type="button" variant="primary" onClick={onAddProject}>
          <PlusIcon />
          添加项目
        </Button>
      </CollectionToolbar.Group>
    </CollectionToolbar.Root>
  );
});

const WorkspacesEmpty = observer(function WorkspacesEmpty({
  view,
}: {
  view: WorkspacesListViewModel;
}) {
  const search = view.useSearch();
  return (
    <EmptyState
      bare
      label={
        search.query.trim().length > 0 ? '没有匹配的工作区' : '暂无工作区'
      }
    />
  );
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
