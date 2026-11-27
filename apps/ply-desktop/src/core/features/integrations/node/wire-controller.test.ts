import { describe, expect, it } from 'vitest';
import { createIntegrationsWireController } from './wire-controller';

describe('retired platform integrations', () => {
  it('does not advertise providers or stored accounts', async () => {
    const controller = createIntegrationsWireController();
    await expect(controller.call('listProviders', undefined)).resolves.toEqual([]);
    await expect(controller.call('listAccounts', undefined)).resolves.toEqual({});
  });

  it.each([
    'github',
    'gitlab',
    'linear',
    'jira',
    'plane',
    'trello',
    'asana',
    'monday',
    'notion',
    'featurebase',
    'plain',
    'youtrack',
  ])('rejects credentials and device authorization for %s', async (integrationId) => {
    const controller = createIntegrationsWireController();
    const unavailable = { success: false, error: 'Account integrations are unavailable.' };
    await expect(
      controller.call('connect', { integrationId, credentials: { apiToken: 'test-token' } })
    ).resolves.toEqual(unavailable);
    await expect(controller.call('startDeviceFlow', { integrationId })).resolves.toEqual(
      unavailable
    );
  });
});
