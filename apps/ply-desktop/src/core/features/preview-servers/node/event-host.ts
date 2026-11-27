import { createEventStreamHost } from '@ply/wire/live';
import { previewServersContract } from '../api';

export const previewServerEvents = createEventStreamHost(previewServersContract.events);
