import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type {
  IntegrationConnectOptions,
  IntegrationProviderDescriptor,
} from '@core/features/integrations/api/contract';
import type { IntegrationFormInput } from '@core/features/integrations/browser/types';
import type { ConnectionStatus } from '@core/primitives/issue-providers/api';
import type { ProviderAccountsByProvider } from '@core/primitives/provider-accounts/api';

type ConnectionStatusByIntegration = Partial<Record<string, ConnectionStatus>>;

type ConnectionMutationResult = { success: true } | { success: false; error: string };

type IntegrationsContextValue = {
  integrations: IntegrationProviderDescriptor[];
  integrationById: Partial<Record<string, IntegrationProviderDescriptor>>;
  connectionStatus: ConnectionStatusByIntegration;
  /** Connected accounts per integration, including GitHub. */
  integrationAccounts: ProviderAccountsByProvider;
  isLoadingAccounts: boolean;
  accountsError: Error | null;
  isCheckingConnections: boolean;
  connectIntegration: (
    integrationId: string,
    input: IntegrationFormInput,
    options?: IntegrationConnectOptions
  ) => Promise<ConnectionMutationResult>;
  /** Remove one saved account. */
  disconnectIntegration: (
    integrationId: string,
    accountId: string
  ) => Promise<ConnectionMutationResult>;
  setDefaultIntegrationAccount: (
    integrationId: string,
    accountId: string
  ) => Promise<ConnectionMutationResult>;
  isIntegrationMutating: (integrationId: string) => boolean;
};

const unavailable = async (): Promise<ConnectionMutationResult> => ({
  success: false,
  error: 'Account integrations are unavailable.',
});

const localIntegrations: IntegrationsContextValue = {
  integrations: [],
  integrationById: {},
  connectionStatus: {},
  integrationAccounts: {},
  isLoadingAccounts: false,
  accountsError: null,
  isCheckingConnections: false,
  connectIntegration: unavailable,
  disconnectIntegration: unavailable,
  setDefaultIntegrationAccount: unavailable,
  isIntegrationMutating: () => false,
};

const IntegrationsContext = createContext(localIntegrations);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  return (
    <IntegrationsContext.Provider value={localIntegrations}>
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrationsContext() {
  return useContext(IntegrationsContext);
}
