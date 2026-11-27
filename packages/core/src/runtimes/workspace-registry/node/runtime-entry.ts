import { runWireComponentWorker } from '@ply/wire/worker';
import { initWorkerProcessLogging } from '@ply/wire/worker/node';
import { workspaceRegistryComponent } from './component';

const logger = initWorkerProcessLogging('workspace-registry-runtime');
void runWireComponentWorker(workspaceRegistryComponent, { logger });
