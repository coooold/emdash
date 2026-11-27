import { createPluginRegistry } from '@ply/shared/plugins';
import type { IntegrationPluginProvider } from './plugin';

export const integrationPluginRegistry = createPluginRegistry<IntegrationPluginProvider>();
