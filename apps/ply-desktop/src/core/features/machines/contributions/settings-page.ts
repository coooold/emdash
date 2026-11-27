import { getProjectManagerStore } from '@core/features/projects/api/browser/stores/project-selectors';
import type { SettingsPageTab } from '@core/features/settings/contributions/views';
import {
  defineSettingsPageContribution,
  type SettingsPageContribution,
} from '@core/primitives/settings/api/page-contribution';
import { ConversationsSettingsPage } from '../browser/pages/conversations-settings-page';
import { LocalWorkspacesSettingsPage } from '../browser/pages/local-workspaces-settings-page';
import { SystemSettingsPage } from '../browser/pages/system-settings-page';
import { LocalWorkspaceDetailPage } from '../browser/pages/workspace-detail-page';

function projectBreadcrumbLabel(path: string[]): string | null {
  const projectId = path.at(-1);
  return projectId ? (getProjectManagerStore().projects.get(projectId)?.data?.name ?? null) : null;
}

export const systemSettingsPage = defineSettingsPageContribution({
  id: 'system',
  label: '系统',
  icon: 'activity',
  component: SystemSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);

export const localWorkspacesSettingsPage = defineSettingsPageContribution({
  id: 'workspaces-local',
  label: '工作区',
  icon: 'folder-git-2',
  component: LocalWorkspacesSettingsPage,
  detail: {
    component: LocalWorkspaceDetailPage,
    breadcrumbLabel: projectBreadcrumbLabel,
  },
} satisfies SettingsPageContribution<SettingsPageTab>);

export const conversationsSettingsPage = defineSettingsPageContribution({
  id: 'conversations',
  label: '对话',
  icon: 'message-square',
  component: ConversationsSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);
