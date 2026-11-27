import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import { describe, expect, it } from 'vitest';
import type { AgentGitCredentialsSetting } from '@core/primitives/project-settings/api';
import { createGitCredentialsService } from './git-credentials-service';

const session = { projectId: 'project', sessionId: 'terminal', host: LOCAL_HOST_REF };

describe('native Git credential policy', () => {
  it.each([undefined, 'system', 'effective-account'] as const)(
    'uses system credentials for %s without minting a channel',
    async (setting) => {
      const service = createGitCredentialsService({
        getAgentGitCredentialsSetting: async () => setting,
      });
      await expect(service.resolveSessionSpec(session)).resolves.toEqual({ mode: 'system' });
      await expect(service.mintOperationCredentials(session)).resolves.toBeUndefined();
      await expect(
        service.mintCloneCredentials({
          repositoryUrl: 'https://code.example.com/team/repo.git',
          host: LOCAL_HOST_REF,
        })
      ).resolves.toBeUndefined();
    }
  );

  it('preserves the explicit restriction on credentials in agent sessions', async () => {
    const service = createGitCredentialsService({
      getAgentGitCredentialsSetting: async (): Promise<AgentGitCredentialsSetting> => 'none',
    });
    await expect(service.resolveSessionSpec(session)).resolves.toEqual({ mode: 'none' });
  });

  it('rejects explicit managed accounts instead of silently switching identities', async () => {
    const service = createGitCredentialsService({
      getAgentGitCredentialsSetting: async () => 'system',
    });
    const account = { providerId: 'retired-platform', accountId: 'saved-account' };
    await expect(service.mintOperationCredentials({ ...session, account })).rejects.toThrow(
      'Managed Git accounts are no longer supported.'
    );
    await expect(
      service.mintCloneCredentials({
        repositoryUrl: 'https://code.example.com/team/repo.git',
        host: LOCAL_HOST_REF,
        account,
      })
    ).rejects.toThrow('Managed Git accounts are no longer supported.');
  });
});
