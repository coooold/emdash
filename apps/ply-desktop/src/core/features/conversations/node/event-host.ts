import { createEventStreamHost } from '@ply/wire/live';
import { conversationsContract } from '../api';

export const conversationWireEvents = createEventStreamHost(conversationsContract.events);
