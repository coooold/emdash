import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Keep external imports and language servers resolved and launched at runtime. */
export function retainDesktopRuntimeDependencies(deployDir: string): void {
  const manifests = ['main', 'preload'].map(
    (target) =>
      JSON.parse(
        readFileSync(join(deployDir, 'out', target, 'runtime-dependencies.json'), 'utf8')
      ) as string[]
  );
  const runtimePackages = new Set([
    ...manifests.flat(),
    'pyright',
    'typescript',
    'typescript-language-server',
  ]);
  const manifestPath = join(deployDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies: Record<string, string>;
  };
  const dependencies = Object.fromEntries(
    [...runtimePackages].sort().map((name) => {
      const version = manifest.dependencies[name];
      if (!version) throw new Error(`Packaged runtime dependency not declared: ${name}`);
      return [name, version];
    })
  );
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, dependencies }, null, 2)}\n`);
}
