import { Button } from '@emdash/ui/react/primitives';
import { Loader2, TriangleAlert } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import { isUnregisteredProject } from '@core/features/projects/api/browser/stores/project';
import type { ProjectContextError } from '@core/features/projects/api/browser/stores/project-context';
import {
  getProjectManagerStore,
  getProjectStore,
  projectDisplayName,
  projectViewKind,
} from '@core/features/projects/api/browser/stores/project-selectors';
import { ProjectAvailabilityBoundary } from '@core/features/projects/contributions/browser/project-availability-boundary';
import { useConfirmDeleteProject } from '@core/features/projects/contributions/browser/use-confirm-delete-project';
import { projectViewDef } from '@core/features/projects/contributions/views';
import { BorderlessTitlebar } from '@core/features/workbench/contributions/browser/BorderlessTitlebar';
import { useCurrentViewParams } from '@core/primitives/navigation/browser/navigation-hooks';
import { ProjectErrorDetails } from '../project-error-details';
import { ActiveProject } from './active-project';
import { PendingProjectStatus } from './pending-project';
import { ProjectHeader } from './project-header';

export function ProjectMainPanel() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <BorderlessTitlebar />
      <ProjectMainPanelContent />
    </div>
  );
}

const ProjectMainPanelContent = observer(function ProjectMainPanelContent() {
  const {
    params: { projectId },
  } = useCurrentViewParams(projectViewDef);
  const store = getProjectStore(projectId);
  const kind = projectViewKind(store);
  const displayName = projectDisplayName(store) ?? '此项目';
  const confirmDeleteProject = useConfirmDeleteProject();

  if (kind === 'creating' && store && isUnregisteredProject(store)) {
    return <PendingProjectStatus project={store} />;
  }

  if (kind === 'legacy-ssh') {
    return (
      <ProjectPageShell projectId={projectId}>
        <ProjectAvailabilityBoundary projectId={projectId} layout="inline" />
      </ProjectPageShell>
    );
  }

  if (kind === 'hydrating') {
    return (
      <ProjectPageShell projectId={projectId}>
        <ProjectContextHydratingPanel />
      </ProjectPageShell>
    );
  }

  if (kind === 'context_error' && store?.context?.kind === 'failed') {
    return (
      <ProjectPageShell projectId={projectId}>
        <ProjectContextErrorPanel
          error={store.context.error}
          onRemove={() => {
            void confirmDeleteProject({ projectId, projectLabel: displayName });
          }}
          onRetry={() => {
            void getProjectManagerStore().hydrateProjectContext(projectId);
          }}
        />
      </ProjectPageShell>
    );
  }

  if (kind !== 'ready') {
    return <div className="flex flex-1 items-center justify-center text-foreground-muted" />;
  }

  return (
    <ProjectPageShell projectId={projectId}>
      <ProjectAvailabilityBoundary projectId={projectId} layout="inline">
        <ActiveProject />
      </ProjectAvailabilityBoundary>
    </ProjectPageShell>
  );
});

export function ProjectPageShell({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId: string;
}) {
  return (
    <div
      data-project-page-scroll
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto"
    >
      <div className="flex min-h-full w-full px-8 py-10">
        <div
          data-project-page-content
          className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6"
        >
          <ProjectHeader projectId={projectId} />
          {children}
        </div>
      </div>
    </div>
  );
}

function ProjectContextHydratingPanel() {
  return (
    <div className="flex min-h-64 w-full flex-1 flex-col items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-foreground-passive" />
      <p className="font-sans text-xs text-foreground-passive">正在加载项目…</p>
    </div>
  );
}

export function ProjectContextErrorPanel({
  error,
  onRemove,
  onRetry,
}: {
  error: ProjectContextError;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const detail =
    error.type === 'invalid-project-record'
      ? '保存的项目记录无效。'
      : error.stage === 'memento'
        ? '无法加载已保存的项目视图状态。'
        : '无法初始化项目状态。';
  return (
    <div className="flex min-h-64 w-full flex-1 flex-col items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <TriangleAlert className="size-6 text-foreground-destructive" aria-hidden="true" />
        <p className="font-sans text-sm font-medium text-foreground-destructive">无法加载项目</p>
        <p className="font-sans text-xs text-foreground-muted">{detail}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            重试
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            移除项目
          </Button>
        </div>
        <ProjectErrorDetails message={error.message} />
      </div>
    </div>
  );
}
