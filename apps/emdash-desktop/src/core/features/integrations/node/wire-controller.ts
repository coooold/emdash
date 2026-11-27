import { createController, type Controller } from '@emdash/wire/rpc';
import { integrationsContract } from '../api';
import { integrationsEvents } from './event-host';

const accountIntegrationUnavailable = {
  success: false,
  error: 'Account integrations are unavailable.',
} as const;

export function createIntegrationsWireController(): Controller {
  return createController(integrationsContract, {
    listProviders: () => [],
    listAccounts: () => ({}),
    connect: () => accountIntegrationUnavailable,
    startDeviceFlow: () => accountIntegrationUnavailable,
    completeDeviceFlow: () => accountIntegrationUnavailable,
    cancelDeviceFlow: () => undefined,
    disconnect: () => accountIntegrationUnavailable,
    setDefaultAccount: () => accountIntegrationUnavailable,
    events: integrationsEvents,
  });
}
