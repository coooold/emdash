import {
  defineSettingsPageContribution,
  type SettingsPageContribution,
} from '@core/primitives/settings/api/page-contribution';
import { AgentsSettingsPage } from '../browser/agents-page/AgentsSettingsPage';
import { BrowserSettingsPage } from '../browser/pages/browser-settings-page';
import { GeneralSettingsPage } from '../browser/pages/general-settings-page';
import { InterfaceSettingsPage } from '../browser/pages/interface-settings-page';
import { RepositorySettingsPage } from '../browser/pages/repository-settings-page';
import type { SettingsPageTab } from './views';

export const generalSettingsPage = defineSettingsPageContribution({
  id: 'general',
  label: '常规',
  icon: 'settings',
  component: GeneralSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);

export const interfaceSettingsPage = defineSettingsPageContribution({
  id: 'interface',
  label: '界面',
  icon: 'panel-left',
  component: InterfaceSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);

export const browserSettingsPage = defineSettingsPageContribution({
  id: 'browser',
  label: '浏览器',
  icon: 'globe',
  component: BrowserSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);

export const repositorySettingsPage = defineSettingsPageContribution({
  id: 'repository',
  label: '仓库',
  icon: 'git-branch',
  component: RepositorySettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);

export const agentsSettingsPage = defineSettingsPageContribution({
  id: 'clis-models',
  label: '智能体',
  icon: 'bot',
  component: AgentsSettingsPage,
} satisfies SettingsPageContribution<SettingsPageTab>);
