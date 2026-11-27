import { app, Menu, shell } from 'electron';
import { desktopHostEvents } from '@core/features/workbench/node';
import { MENU_ITEMS } from '@core/manifests/shared/menu-items';
import {
  resolveEffectiveChord,
  toElectronAccelerator,
  type PlatformContext,
} from '@core/primitives/keybindings/api';
import {
  EMDASH_DOCS_URL,
  EMDASH_RELEASES_URL,
} from '@core/primitives/urls/api/urls';

export interface MenuKeybindingSnapshotEntry {
  readonly commandId: string;
  readonly title: string;
  readonly accelerator: string | null;
}

const platformContext: PlatformContext = {
  os: process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows' : 'linux',
};
let currentKeybindings: readonly MenuKeybindingSnapshotEntry[] = MENU_ITEMS.map((command) => {
  const chord = command.keybinding
    ? resolveEffectiveChord(command.keybinding, {}, platformContext)
    : null;
  return {
    commandId: command.id,
    title: command.title,
    accelerator: chord ? toElectronAccelerator(chord) : null,
  };
});

function emitCommand(commandId: string): void {
  desktopHostEvents.emit(undefined, { type: 'menu-command', commandId });
}

export function setupApplicationMenu(
  snapshot: readonly MenuKeybindingSnapshotEntry[] = currentKeybindings
): void {
  currentKeybindings = snapshot;
  const isMac = process.platform === 'darwin';
  const acceleratorFor = (commandId: string) =>
    snapshot.find((entry) => entry.commandId === commandId)?.accelerator ?? undefined;

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: `关于 ${app.name}`,
                click: () => app.showAboutPanel(),
              },
              { type: 'separator' as const },
              {
                label: '设置…',
                accelerator: acceleratorFor('app.settings'),
                click: () => emitCommand('app.settings'),
              },
              {
                label: '检查更新…',
                click: () => desktopHostEvents.emit(undefined, { type: 'menu-check-for-updates' }),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              {
                label: `退出 ${app.name}`,
                accelerator: 'CmdOrCtrl+Q',
                click: () => app.quit(),
              },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
    // File menu
    {
      label: '文件',
      submenu: [
        // On non-macOS, put Settings in File menu
        ...(!isMac
          ? [
              {
                label: '设置…',
                accelerator: acceleratorFor('app.settings'),
                click: () => emitCommand('app.settings'),
              },
              { type: 'separator' as const },
            ]
          : []),
        isMac
          ? {
              label: '关闭标签页',
              accelerator: acceleratorFor('workbench.tabClose'),
              click: () => emitCommand('workbench.tabClose'),
            }
          : {
              label: '退出',
              accelerator: 'CmdOrCtrl+Q',
              click: () => app.quit(),
            },
      ],
    },
    // Edit menu
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          click: () => desktopHostEvents.emit(undefined, { type: 'menu-undo' }),
        },
        {
          label: '重做',
          accelerator: isMac ? 'Shift+CmdOrCtrl+Z' : 'CmdOrCtrl+Y',
          click: () => desktopHostEvents.emit(undefined, { type: 'menu-redo' }),
        },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' as const }] : []),
        { role: 'delete' as const },
        { role: 'selectAll' as const },
      ],
    },
    // View menu
    {
      label: '视图',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        {
          label: '命令面板…',
          accelerator: acceleratorFor('app.commandPalette'),
          click: () => emitCommand('app.commandPalette'),
        },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    { role: 'windowMenu' as const },
    // Help menu
    {
      role: 'help' as const,
      label: '帮助',
      submenu: [
        ...(!isMac
          ? [
              {
                label: '检查更新…',
                click: () => desktopHostEvents.emit(undefined, { type: 'menu-check-for-updates' }),
              },
              { type: 'separator' as const },
            ]
          : []),
        {
          label: '文档',
          click: () => {
            void shell.openExternal(EMDASH_DOCS_URL);
          },
        },
        {
          label: '更新日志',
          click: () => {
            void shell.openExternal(EMDASH_RELEASES_URL);
          },
        },
        { type: 'separator' as const },
        {
          label: '提供反馈',
          click: () => emitCommand('app.giveFeedback'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

export function setApplicationMenuKeybindings(
  snapshot: readonly MenuKeybindingSnapshotEntry[]
): void {
  setupApplicationMenu(snapshot);
}
