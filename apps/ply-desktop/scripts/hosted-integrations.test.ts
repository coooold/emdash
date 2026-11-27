import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function manifest(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}

describe('retired hosted-platform dependencies', () => {
  const sdkNames = [
    '@gitbeaker/rest',
    '@linear/sdk',
    '@llamaduck/forgejo-ts',
    '@makeplane/plane-node-sdk',
    '@mondaydotcomorg/api',
    '@notionhq/client',
    '@octokit/rest',
    '@team-plain/graphql',
    'asana',
    'featurebase-node',
    'jira.js',
    'trello.js',
    'youtrack-client',
  ];

  it.each(['../package.json', '../../../packages/plugins/package.json'])(
    'does not ship hosted platform SDKs from %s',
    (path) => {
      const { dependencies } = manifest(path);
      for (const name of sdkNames) expect(dependencies[name]).toBeUndefined();
    }
  );

  it('retains the release SDK as a development dependency only', () => {
    expect(manifest('../package.json').devDependencies['@octokit/rest']).toBeDefined();
  });
});
