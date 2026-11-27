import { createEventStreamHost } from '@ply/wire/live';
import { browserContract } from '../api';

export const browserEvents = createEventStreamHost(browserContract.events);
