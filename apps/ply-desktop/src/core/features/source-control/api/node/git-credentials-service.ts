import type { GitCredentialsSessionSpec } from '@ply/core/primitives/git-credentials/api';
import type { HostRef } from '@ply/core/primitives/host/api';
import type { GitOperationCredentials } from '@ply/core/runtimes/git/api';
import type { AgentGitCredentialsSetting } from '@core/primitives/project-settings/api';
import type { ProviderAccountRef } from '@core/primitives/provider-accounts/api/provider-account-summary';

export type GitOperationCredentialsLease = {
  credentials: GitOperationCredentials;
  release(): void;
};

export type GitCredentialsService = {
  resolveSessionSpec(params: {
    sessionId: string;
    projectId: string;
    host: HostRef;
  }): Promise<GitCredentialsSessionSpec | undefined>;
  mintOperationCredentials(params: {
    projectId: string;
    host: HostRef;
    account?: ProviderAccountRef;
  }): Promise<GitOperationCredentialsLease | undefined>;
  mintCloneCredentials(params: {
    repositoryUrl: string;
    host: HostRef;
    account?: ProviderAccountRef;
  }): Promise<GitOperationCredentialsLease | undefined>;
};

/** Native Git credentials are the only supported authentication source. */
export function createGitCredentialsService(dependencies: {
  getAgentGitCredentialsSetting(projectId: string): Promise<AgentGitCredentialsSetting | undefined>;
}): GitCredentialsService {
  return {
    async resolveSessionSpec({ projectId }) {
      const setting = await dependencies.getAgentGitCredentialsSetting(projectId);
      return { mode: setting === 'none' ? 'none' : 'system' };
    },
    async mintOperationCredentials({ account }) {
      if (account) throw new Error('Managed Git accounts are no longer supported.');
      return undefined;
    },
    async mintCloneCredentials({ account }) {
      if (account) throw new Error('Managed Git accounts are no longer supported.');
      return undefined;
    },
  };
}
