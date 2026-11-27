import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it } from 'vitest';
import {
  IntegrationsProvider,
  useIntegrationsContext,
} from '@core/features/integrations/contributions/browser/integrations-provider';

it('supplies a settled local provider state without authentication or network queries', async () => {
  let state: ReturnType<typeof useIntegrationsContext> | undefined;
  function Probe() {
    state = useIntegrationsContext();
    return null;
  }
  renderToString(createElement(IntegrationsProvider, null, createElement(Probe)));
  expect(state).toMatchObject({
    integrations: [],
    integrationAccounts: {},
    connectionStatus: {},
    isCheckingConnections: false,
    isLoadingAccounts: false,
  });
  await expect(state?.connectIntegration('github', {})).resolves.toMatchObject({ success: false });
});
