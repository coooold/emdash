import { createEventStreamHost } from '@ply/wire/live';
import { projectsWireContract } from '../api';

export const projectEvents = createEventStreamHost(projectsWireContract.events);
