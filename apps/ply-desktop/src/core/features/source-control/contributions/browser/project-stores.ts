import {
  projectSettingsStoreToken,
  type ProjectScopedStoreContext,
} from '@core/features/projects/contributions/project-stores';
import { GitRepositoryStore } from '@core/features/source-control/api/browser/stores/git-repository-store';
import {
  contributeScopedStore,
  scopedStoreToken,
  type ScopedStoreContribution,
} from '@core/primitives/scoped-stores/browser';

export const gitRepositoryStoreToken = scopedStoreToken<GitRepositoryStore>(
  'source-control.repository'
);

export const sourceControlProjectStoreContributions: readonly ScopedStoreContribution<ProjectScopedStoreContext>[] =
  [
    contributeScopedStore({
      token: gitRepositoryStoreToken,
      create: ({ project, host }, stores) =>
        new GitRepositoryStore(project.id, stores.get(projectSettingsStoreToken), host),
      activate: (store) => store.start(),
      dispose: (store) => store.dispose(),
    }),
  ];
