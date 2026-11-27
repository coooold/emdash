import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe.skipIf(process.platform === 'win32')('Makefile entry points', () => {
  let directory: string;
  let logFile: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'ply-make-'));
    logFile = join(directory, 'commands.log');
    writeFileSync(logFile, '');
    writeFileSync(
      join(directory, 'pnpm'),
      '#!/bin/sh\nprintf "<%s>" "$@" >> "$MAKE_TEST_LOG"\nprintf "\\n" >> "$MAKE_TEST_LOG"\nexit "${MAKE_TEST_EXIT:-0}"\n',
      { mode: 0o755 }
    );
    writeFileSync(
      join(directory, 'uname'),
      '#!/bin/sh\ncase "$1" in -s) echo "${MAKE_TEST_OS:-Darwin}" ;; -m) echo "${MAKE_TEST_ARCH:-arm64}" ;; esac\n',
      { mode: 0o755 }
    );
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function run(args: string[], env: Record<string, string> = {}) {
    const result = spawnSync('make', [...args, `PNPM=${join(directory, 'pnpm')}`], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        MAKE_TEST_LOG: logFile,
        ...env,
      },
    });
    if (result.error) throw result.error;
    return {
      ...result,
      commands: readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean),
    };
  }

  it('shows help without starting any processes by default', () => {
    const result = run([]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('make dev');
    expect(result.commands).toEqual([]);
  });

  it('passes the DevTools switch through the existing dev script to Electron', () => {
    const result = run(['dev']);
    expect(result.status).toBe(0);
    expect(result.commands).toEqual([
      '<--dir><apps/ply-desktop><run><dev><--><--auto-open-devtools-for-tabs>',
    ]);
  });

  it.each([
    ['arm64', 'arm64'],
    ['x86_64', 'x64'],
  ])('builds dependencies before packaging a local DMG on %s', (hostArch, targetArch) => {
    const result = run(['build'], { MAKE_TEST_ARCH: hostArch });
    expect(result.status).toBe(0);
    expect(result.commands).toEqual([
      '<exec><nx><build><@ply/ply-desktop>',
      `<--dir><apps/ply-desktop><exec><node><--experimental-strip-types><scripts/release/build.ts><--platform><mac><--arch><${targetArch}><--targets><dmg><--package-only>`,
    ]);
  });

  it('allows an explicit target architecture', () => {
    const result = run(['build', 'ARCH=x64'], { MAKE_TEST_ARCH: 'arm64' });
    expect(result.status).toBe(0);
    expect(result.commands[1]).toContain('<--arch><x64>');
  });

  it('rejects non-macOS hosts before building', () => {
    const result = run(['build'], { MAKE_TEST_OS: 'Linux' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('requires macOS');
    expect(result.commands).toEqual([]);
  });

  it('rejects unsupported architectures before building', () => {
    const result = run(['build', 'ARCH=invalid']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ARCH must be arm64 or x64');
    expect(result.commands).toEqual([]);
  });

  it('does not package when compilation fails', () => {
    const result = run(['build'], { MAKE_TEST_EXIT: '1' });
    expect(result.status).not.toBe(0);
    expect(result.commands).toEqual(['<exec><nx><build><@ply/ply-desktop>']);
    expect(result.stdout).not.toContain('DMG output:');
  });
});
