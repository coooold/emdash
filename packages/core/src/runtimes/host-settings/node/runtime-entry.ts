import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { hostSettingsComponent } from './component';

const logger = initWorkerProcessLogging('host-settings-runtime');
void runWireComponentWorker(hostSettingsComponent, { logger });
