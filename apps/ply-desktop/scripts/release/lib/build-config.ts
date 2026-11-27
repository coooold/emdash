import type { Configuration } from 'electron-builder';

export function createReleaseBuildConfig(
  baseConfig: Configuration,
  electronVersion: string,
  versionOverride?: string
): Configuration {
  // electron-builder mutates config.files while normalizing it. Each architecture
  // needs its own copy, including nested metadata and platform configuration.
  const config = structuredClone(baseConfig);
  return {
    ...config,
    electronVersion,
    npmRebuild: false,
    ...(versionOverride === undefined
      ? {}
      : { extraMetadata: { ...config.extraMetadata, version: versionOverride } }),
  };
}

export function createGitHubPackageConfig(
  baseConfig: Configuration,
  repository: string
): Configuration {
  if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
  const [owner, repo] = repository.split('/');
  const win = { ...baseConfig.win };
  delete win.azureSignOptions;
  return {
    ...baseConfig,
    compression: 'maximum',
    // Let electron-builder collect the deployed production dependency graph.
    // Including node_modules as regular files would also copy unused packages.
    files: ['out/**/*', 'drizzle/**/*', '!**/*.map', '!out/*/runtime-dependencies.json'],
    publish: { provider: 'github', owner, repo, releaseType: 'release' },
    mac: { ...baseConfig.mac, identity: '-', hardenedRuntime: false, notarize: false },
    dmg: { ...baseConfig.dmg, format: 'UDBZ' },
    win,
  };
}
