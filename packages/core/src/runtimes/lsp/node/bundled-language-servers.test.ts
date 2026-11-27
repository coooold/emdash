import { expect, it } from 'vitest';
import { unpackedPath } from './bundled-language-servers';

it.each([
  [
    '/Applications/ply.app/Contents/Resources/app.asar/node_modules/typescript/lib/tsserver.js',
    '/Applications/ply.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/lib/tsserver.js',
  ],
  [
    String.raw`C:\ply\resources\app.asar\node_modules\typescript\lib\tsserver.js`,
    String.raw`C:\ply\resources\app.asar.unpacked\node_modules\typescript\lib\tsserver.js`,
  ],
  [
    '/opt/emdash/node_modules/typescript/lib/tsserver.js',
    '/opt/emdash/node_modules/typescript/lib/tsserver.js',
  ],
])('resolves physical language-server assets at %s', (input, output) => {
  expect(unpackedPath(input)).toBe(output);
});
