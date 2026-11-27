import type { Readable, Writable } from 'node:stream';
import type { Controller } from '@ply/wire/rpc';
import { serve, streamTransport } from '@ply/wire/rpc';

export type StdioStreams = {
  input: Readable;
  output: Writable;
};

export function serveStdio(
  controller: Controller,
  streams: StdioStreams = { input: process.stdin, output: process.stdout }
): () => void {
  return serve(streamTransport(streams.input, streams.output), controller);
}
