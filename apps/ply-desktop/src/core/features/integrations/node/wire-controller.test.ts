import { createTestWire } from '@ply/wire/testing';
import { expect, it } from 'vitest';
import { integrationsContract } from '../api/contract';
import { createIntegrationsWireController } from './wire-controller';

it('exposes no connected accounts or provider sign-in through desktop Wire', async () => {
  const wire = createTestWire(integrationsContract, createIntegrationsWireController());
  try {
    await expect(wire.client.listProviders()).resolves.toEqual([]);
    await expect(wire.client.listAccounts()).resolves.toEqual({});
    await expect(
      wire.client.connect({
        integrationId: 'jira',
        credentials: { siteUrl: 'https://example.atlassian.net', accessToken: 'test-token' },
      })
    ).resolves.toMatchObject({ success: false });
    await expect(wire.client.startDeviceFlow({ integrationId: 'github' })).resolves.toMatchObject({
      success: false,
    });
  } finally {
    await wire.dispose();
  }
});
