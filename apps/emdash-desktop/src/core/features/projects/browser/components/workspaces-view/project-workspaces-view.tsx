import { observer } from 'mobx-react-lite';
import {
  asAvailableProject,
  getProjectStore,
} from '@core/features/projects/api/browser/stores/project-selectors';
import { WorkspaceDetailPage } from '@core/features/workspaces/contributions/browser/workspace-detail-page';

export const ProjectWorkspacesView = observer(function ProjectWorkspacesView({
  projectId,
}: {
  projectId: string;
}) {
  const context = asAvailableProject(getProjectStore(projectId));
  if (!context || context.project.type !== 'local') return null;

  return (
    <WorkspaceDetailPage scope={{ kind: 'local' }} host={context.host} projectId={projectId} />
  );
});
