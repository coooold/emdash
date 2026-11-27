import { exec } from 'node:child_process';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import type { HostRef } from '@ply/core/primitives/host/api';
import { parsePortableRelativePath, type HostFileRef } from '@ply/core/primitives/path/api';
import type { FsError } from '@ply/core/runtimes/files/api';
import { err, ok, type Result } from '@ply/shared';
import type { Disposable } from '@ply/shared/concurrency';
import { app, clipboard, dialog, Menu, shell } from 'electron';
import { nativePathFromHost, resolveRelativePath } from '@core/primitives/desktop-runtime/api';
import {
  getAppById,
  getResolvedLabel,
  type OpenInAppId,
  type PlatformConfig,
  type PlatformKey,
} from '@core/primitives/open-in-apps/api/open-in-apps';
import type { createDesktopWorkspaceRuntimeAcquirer } from '@main/gateway/workspace-runtime';
import { getMainWindow } from '@main/host/window';
import { buildExternalToolEnv } from '@main/lib/childProcessEnv';
import { log } from '@main/lib/logger';
import { lookupAppPath } from './app-path-lookup';
import { createInstalledAppDetector } from './installed-apps';
import {
  execFileCommand,
  listInstalledFontsAll,
  resolveAppVersion,
  spawnDetachedCommand,
} from './utils';

const FONT_CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_AUDIO_FILE_BYTES = 20 * 1024 * 1024;

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

type TerminalContextMenuEvent = {
  type: 'terminal-context-menu-action';
  requestId: string;
  action: 'paste' | 'select-all' | 'clear';
};

type WorkspaceRuntimeAcquirer = ReturnType<typeof createDesktopWorkspaceRuntimeAcquirer>;

type ShowWorkspaceItemInFolderError =
  | FsError
  | {
      type: 'not_found';
      entity: 'workspace';
      workspaceId: string;
      message: string;
    }
  | {
      type: 'unsupported_host';
      host: HostRef;
      message: string;
    };

class AppService implements Disposable {
  private readonly appLookupLifetime = new AbortController();
  private readonly installedAppDetector = createInstalledAppDetector();
  private cachedAppVersion: string | null = null;
  private cachedAppVersionPromise: Promise<string> | null = null;
  private cachedInstalledFonts: { fonts: string[]; fetchedAt: number } | null = null;
  private emitHostEvent: (event: TerminalContextMenuEvent) => void = () => {};
  private acquireWorkspaceRuntime: WorkspaceRuntimeAcquirer | undefined;

  initialize(options: {
    acquireWorkspaceRuntime: WorkspaceRuntimeAcquirer;
    emitHostEvent(event: TerminalContextMenuEvent): void;
  }): void {
    this.acquireWorkspaceRuntime = options.acquireWorkspaceRuntime;
    this.emitHostEvent = options.emitHostEvent;
    void this.getCachedAppVersion();
  }

  dispose(): void {
    this.appLookupLifetime.abort();
    this.installedAppDetector.dispose();
  }

  getCachedAppVersion(): Promise<string> {
    if (this.cachedAppVersion) return Promise.resolve(this.cachedAppVersion);
    if (!this.cachedAppVersionPromise) {
      this.cachedAppVersionPromise = resolveAppVersion().then((version) => {
        this.cachedAppVersion = version;
        return version;
      });
    }
    return this.cachedAppVersionPromise;
  }

  async listInstalledFonts(
    refresh?: boolean
  ): Promise<{ fonts: string[]; cached: boolean; error?: string }> {
    const now = Date.now();
    if (
      !refresh &&
      this.cachedInstalledFonts &&
      now - this.cachedInstalledFonts.fetchedAt < FONT_CACHE_TTL_MS
    ) {
      return { fonts: this.cachedInstalledFonts.fonts, cached: true };
    }
    try {
      const fonts = await listInstalledFontsAll();
      this.cachedInstalledFonts = { fonts, fetchedAt: now };
      return { fonts, cached: false };
    } catch (error) {
      return {
        fonts: this.cachedInstalledFonts?.fonts ?? [],
        cached: Boolean(this.cachedInstalledFonts),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  checkInstalledApps() {
    return this.installedAppDetector.check();
  }

  async openExternal(url: string): Promise<void> {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL');
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(
        `Protocol "${parsedUrl.protocol}" is not allowed. Only http and https URLs are permitted.`
      );
    }
    await shell.openExternal(url);
  }

  async openPath(ref: HostFileRef): Promise<void> {
    if (ref.host.type !== 'local') {
      throw new Error('Default applications are only available for local files');
    }
    const realPath = await realpath(nativePathFromHost(ref.path));
    const errorMessage = await shell.openPath(realPath);
    if (errorMessage) throw new Error(errorMessage);
  }

  async showWorkspaceItemInFolder(args: {
    workspaceId: string;
    relativePath: string;
  }): Promise<Result<void, ShowWorkspaceItemInFolderError>> {
    const acquireWorkspaceRuntime = this.acquireWorkspaceRuntime;
    if (!acquireWorkspaceRuntime) throw new Error('App service has not been initialized');
    const workspace = await acquireWorkspaceRuntime(args.workspaceId);
    if (!workspace) {
      return err({
        type: 'not_found',
        entity: 'workspace',
        workspaceId: args.workspaceId,
        message: `Workspace not found: ${args.workspaceId}`,
      });
    }
    if (workspace.identity.host.type !== 'local') {
      return err({
        type: 'unsupported_host',
        host: workspace.identity.host,
        message: 'Show in file manager is only available for local workspaces',
      });
    }

    const relativePath = parsePortableRelativePath(args.relativePath, {
      unicodeNormalization: 'preserve',
    });
    if (!relativePath.success) {
      return err({
        type: 'invalid-path',
        path: args.relativePath,
        message: relativePath.error.message,
      });
    }

    const resolved = await workspace.files.client.fs.realPath({
      path: resolveRelativePath(workspace.files.root, relativePath.data),
    });
    if (!resolved.success) return resolved;

    shell.showItemInFolder(nativePathFromHost(resolved.data.path));
    return ok();
  }

  clipboardWriteText(text: string): void {
    if (typeof text !== 'string') throw new Error('Invalid clipboard text');
    clipboard.writeText(text);
  }

  showTerminalContextMenu(args: {
    requestId: string;
    selectionText?: string | null;
    linkText?: string | null;
    x: number;
    y: number;
  }): void {
    if (!args.requestId || typeof args.requestId !== 'string') {
      throw new Error('Invalid context menu request');
    }
    const selectionText = args.selectionText ?? '';
    const linkText = args.linkText?.trim() ?? '';
    const hasSelection = selectionText.length > 0;
    const hasLink = linkText.length > 0;
    const emitAction = (action: 'paste' | 'select-all' | 'clear') => {
      this.emitHostEvent({
        type: 'terminal-context-menu-action',
        requestId: args.requestId,
        action,
      });
    };
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '复制',
        accelerator: 'CmdOrCtrl+C',
        enabled: hasSelection,
        click: () => clipboard.writeText(selectionText),
      },
      ...(hasLink
        ? [
            {
              label: '复制链接',
              click: () => clipboard.writeText(linkText),
            },
          ]
        : []),
      {
        label: '粘贴',
        accelerator: 'CmdOrCtrl+V',
        click: () => emitAction('paste'),
      },
      { type: 'separator' },
      {
        label: '全选',
        accelerator: 'CmdOrCtrl+A',
        click: () => emitAction('select-all'),
      },
      {
        label: '清屏',
        click: () => emitAction('clear'),
      },
    ];

    Menu.buildFromTemplate(template).popup({
      window: getMainWindow() ?? undefined,
      x: Math.round(args.x),
      y: Math.round(args.y),
    });
  }

  quit(): void {
    app.quit();
  }

  minimizeWindow(): void {
    getMainWindow()?.minimize();
  }

  toggleMaximizeWindow(): void {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }

  closeWindow(): void {
    getMainWindow()?.close();
  }

  isWindowMaximized(): boolean {
    return getMainWindow()?.isMaximized() ?? false;
  }

  async openIn(args: {
    app: OpenInAppId;
    path: string;
    isRemote?: boolean;
    sshConnectionId?: string | null;
  }): Promise<void> {
    const started = Date.now();
    const fields = {
      appId: args.app,
      platform: process.platform,
      isRemote: args.isRemote ?? false,
    };
    log.info('[open-in] Launch requested', fields);
    try {
      await this.performOpenIn(args);
      log.info('[open-in] Launch completed', { ...fields, elapsedMs: Date.now() - started });
    } catch (error) {
      log.warn('[open-in] Launch failed', {
        ...fields,
        elapsedMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
        code: error instanceof Error && 'code' in error ? error.code : undefined,
      });
      throw error;
    }
  }

  private async performOpenIn(args: {
    app: OpenInAppId;
    path: string;
    isRemote?: boolean;
    sshConnectionId?: string | null;
  }): Promise<void> {
    const { path: target, app: appId, isRemote, sshConnectionId } = args;

    if (!target || typeof target !== 'string' || !appId) {
      throw new Error('Invalid arguments');
    }

    if (isRemote || sshConnectionId != null) throw new Error('此版本仅支持本地开发。');

    const platform = process.platform as PlatformKey;
    const appConfig = getAppById(appId);
    if (!appConfig) throw new Error('Invalid app ID');

    const platformConfig = appConfig.platforms?.[platform];
    const label = getResolvedLabel(appConfig, platform);

    if (!platformConfig && !appConfig.alwaysAvailable) {
      throw new Error(`${label} is not available on this platform.`);
    }

    await this.openInLocal({ appId, label, target, platformConfig });
  }

  private async openInLocal(args: {
    appId: OpenInAppId;
    label: string;
    target: string;
    platformConfig: PlatformConfig | undefined;
  }): Promise<void> {
    const { appId, label, target, platformConfig } = args;

    if (appId === 'finder') {
      const errorMessage = await shell.openPath(target);
      if (errorMessage) throw new Error(errorMessage);
      return;
    }

    if (platformConfig?.winVswhere || platformConfig?.mdfindQuery) {
      const found = await lookupAppPath(
        platformConfig,
        process.platform as PlatformKey,
        buildExternalToolEnv(),
        this.appLookupLifetime.signal
      );
      this.appLookupLifetime.signal.throwIfAborted();
      if (found.status === 'detected') {
        if (process.platform === 'win32') {
          await spawnDetachedCommand(found.path, [target]);
          return;
        }
        try {
          await execFileCommand('/usr/bin/open', ['-a', found.path, target]);
          return;
        } catch {}
      }
      // Fall through to the configured CLI or app-name launch fallback.
    }

    if (platformConfig?.openUrls) {
      for (const urlTemplate of platformConfig.openUrls) {
        const url = urlTemplate
          .replace('{{path_url}}', encodeURIComponent(target))
          .replace('{{path}}', target);
        try {
          await shell.openExternal(url);
          return;
        } catch {
          // try next URL
        }
      }
      throw new Error(
        `${label} is not installed or its URI scheme is not registered on this platform.`
      );
    }

    const quoted = (p: string) =>
      process.platform !== 'win32' ? `'${p.replace(/'/g, "'\\''")}'` : `"${p.replace(/"/g, '""')}"`;
    const commands: string[] = platformConfig?.openCommands ?? [];
    const command = commands
      .map((cmd) => cmd.replace('{{path}}', quoted(target)).replace('{{path_raw}}', target))
      .join(' || ');

    if (!command) throw new Error('Unsupported platform or app');

    await new Promise<void>((resolve, reject) => {
      exec(command, { cwd: target, env: buildExternalToolEnv() }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async openSelectDirectoryDialog(args: {
    title: string;
    message: string;
    defaultPath?: string;
  }): Promise<string | undefined> {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      title: args.title,
      properties: ['openDirectory'],
      message: args.message,
      defaultPath: args.defaultPath,
    });
    if (result.canceled) return undefined;
    return result.filePaths[0];
  }

  async openSelectAudioFileDialog(args: {
    title: string;
    message: string;
  }): Promise<string | undefined> {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      title: args.title,
      properties: ['openFile'],
      message: args.message,
      filters: [
        {
          name: 'Audio',
          extensions: ['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'webm'],
        },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return undefined;
    return result.filePaths[0];
  }

  async saveTextFile(args: {
    title: string;
    defaultPath: string;
    content: string;
  }): Promise<string | undefined> {
    const result = await dialog.showSaveDialog(getMainWindow()!, {
      title: args.title,
      defaultPath: args.defaultPath,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return undefined;
    await writeFile(result.filePath, args.content, 'utf8');
    return result.filePath;
  }

  async readAudioFileDataUrl(filePath: string): Promise<string> {
    if (!filePath || typeof filePath !== 'string') throw new Error('Invalid audio path');

    const resolvedPath = await realpath(resolve(filePath));
    const resolvedHome = resolve(homedir());
    const homePrefix = resolvedHome.endsWith(sep) ? resolvedHome : `${resolvedHome}${sep}`;
    if (!resolvedPath.startsWith(homePrefix) && resolvedPath !== resolvedHome) {
      throw new Error('Audio file must be located within the user home directory');
    }

    const extension = extname(filePath).toLowerCase();
    const mimeType = AUDIO_MIME_TYPES[extension];
    if (!mimeType) throw new Error('Unsupported audio file type');

    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) throw new Error('Audio path is not a file');
    if (fileStat.size > MAX_AUDIO_FILE_BYTES) throw new Error('Audio file is larger than 20 MB');

    const file = await readFile(resolvedPath);
    return `data:${mimeType};base64,${file.toString('base64')}`;
  }
}

export const appService = new AppService();
