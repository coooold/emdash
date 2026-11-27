import { PageLayout } from '@ply/ui/react/patterns';
import type { SettingsPageProps } from '@core/primitives/settings/api/page-contribution';
import { WorkspacesListView } from '../components/workspaces-list-view';

export function LocalWorkspacesSettingsPage({ openDetail }: SettingsPageProps) {
  return (
    <div className="space-y-8 pb-4">
      <PageLayout.Header
        sticky
        title="工作区"
        description="查看本地项目的工作区并清理闲置任务工作树。"
      />
      <WorkspacesListView openDetail={openDetail} />
    </div>
  );
}
