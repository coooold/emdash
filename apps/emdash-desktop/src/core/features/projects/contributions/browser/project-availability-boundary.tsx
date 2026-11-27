import { Button } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import {
  asAvailableProject,
  getProjectStore,
} from '@core/features/projects/api/browser/stores/project-selectors';
import {
  ProjectAvailabilityFrame,
  type ProjectAvailabilityLayout,
} from '@core/features/projects/browser/components/project-availability-banner';
import { useConfirmDeleteProject } from '@core/features/projects/contributions/browser/use-confirm-delete-project';
import { settingsViewDef } from '@core/features/settings/contributions/views';
import { getUpdateStore } from '@core/features/updates/contributions/app-stores';
import { useNavigate } from '@core/primitives/navigation/browser/navigation-hooks';

export const ProjectAvailabilityBoundary = observer(function ProjectAvailabilityBoundary({
  children,
  projectId,
  layout,
}: {
  children?: ReactNode;
  projectId: string;
  layout?: ProjectAvailabilityLayout;
}) {
  const store = getProjectStore(projectId);
  const context = asAvailableProject(store);
  const confirmDeleteProject = useConfirmDeleteProject();
  const { navigate } = useNavigate();
  const saved = store?.data;

  if (saved?.type === 'ssh') {
    return (
      <section role="status" className="rounded-lg border border-border bg-background-1 p-4">
        <h2 className="text-sm font-medium">此版本已移除 SSH 开发</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          此项目的记录仍保存在本机。若要继续开发，请将仓库复制到本机，再从项目列表打开本地目录。
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          原项目路径：<code className="break-all">{saved.path}</code>
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() =>
            void confirmDeleteProject({ projectId, projectLabel: saved.name ?? '此项目' })
          }
        >
          移除项目记录
        </Button>
      </section>
    );
  }

  if (!context) return children;
  const project = context.project;
  const openHostDetails = () => navigate(settingsViewDef({ tab: 'system' }));
  return (
    <ProjectAvailabilityFrame
      project={project}
      state={context.host.state}
      layout={layout}
      actionHandlers={{
        retry: () => context.host.recover(),
        diagnostics: openHostDetails,
        'update-client': () => {
          navigate(settingsViewDef({ tab: 'general' }));
          void getUpdateStore().check();
        },
        'remove-project': () =>
          confirmDeleteProject({
            projectId,
            projectLabel: project.name,
          }),
      }}
    >
      {children}
    </ProjectAvailabilityFrame>
  );
});
