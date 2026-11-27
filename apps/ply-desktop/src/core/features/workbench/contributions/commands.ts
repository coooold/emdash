import { z } from 'zod';
import { defineCommand } from '@core/primitives/commands/api';
import { code, keybinding } from '@core/primitives/keybindings/api';

export const settingsCommand = defineCommand({
  id: 'app.settings',
  title: '打开设置',
  description: '打开应用设置',
  category: 'App',
  icon: 'settings',
  keybinding: keybinding.settings('settings', 'Mod+,'),
});

export const newProjectCommand = defineCommand({
  id: 'app.newProject',
  title: '新建项目',
  description: '添加本地项目',
  category: 'App',
  icon: 'folder-plus',
  keybinding: keybinding.settings('newProject', 'Mod+Shift+N'),
});

export const newTaskCommand = defineCommand({
  id: 'app.newTask',
  title: '新建任务',
  description: '在此项目中新建任务',
  category: 'App',
  icon: 'square-plus',
  // Keybindings invoke without input; contextual callers may supply a project.
  input: z.object({ projectId: z.string().optional() }).optional(),
  keybinding: keybinding.settings('newTask', 'Mod+N'),
});

export const giveFeedbackCommand = defineCommand({
  id: 'app.giveFeedback',
  title: '提供反馈',
  description: '提供应用反馈',
  category: 'App',
  icon: 'message-square-share',
});

export const toggleThemeCommand = defineCommand({
  id: 'app.toggleTheme',
  title: '切换主题',
  description: '在浅色和深色主题之间切换',
  category: 'View',
  icon: 'palette',
});

export const navigateBackCommand = defineCommand({
  id: 'app.navigateBack',
  title: '后退',
  description: '返回上一处位置',
  category: 'Navigation',
  icon: 'arrow-left',
  keybinding: keybinding.settings('navigateBack', code(['Mod'], 'BracketLeft')),
});

export const navigateForwardCommand = defineCommand({
  id: 'app.navigateForward',
  title: '前进',
  description: '前往下一处位置',
  category: 'Navigation',
  icon: 'arrow-right',
  keybinding: keybinding.settings('navigateForward', code(['Mod'], 'BracketRight')),
});

export const commandPaletteCommand = defineCommand({
  id: 'app.commandPalette',
  title: '命令面板',
  description: '打开命令面板以快速搜索和导航',
  category: 'Navigation',
  keybinding: keybinding.settings('commandPalette', 'Mod+K'),
});

export const openInEditorCommand = defineCommand({
  id: 'app.openInEditor',
  title: '在编辑器中打开',
  description: '在默认编辑器中打开项目',
  category: 'Navigation',
  keybinding: keybinding.settings('openInEditor', 'Mod+O'),
});

export const confirmCommand = defineCommand({
  id: 'app.confirm',
  title: '确认',
  description: '确认当前操作',
  category: 'App',
  keybinding: keybinding.settings('confirm', 'Mod+Enter'),
});

export const closeModalCommand = defineCommand({
  id: 'modal.close',
  title: '关闭对话框',
  description: '关闭当前对话框',
  category: 'Navigation',
  keybinding: keybinding.fixed('Escape'),
});

export const nextTabCommand = defineCommand({
  id: 'workbench.tabNext',
  title: '下一个标签页',
  description: '切换到下一个标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('tabNext', 'Mod+Alt+ArrowRight'),
});

export const previousTabCommand = defineCommand({
  id: 'workbench.tabPrev',
  title: '上一个标签页',
  description: '切换到上一个标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('tabPrev', 'Mod+Alt+ArrowLeft'),
});

export const closeTabCommand = defineCommand({
  id: 'workbench.tabClose',
  title: '关闭标签页',
  description: '关闭当前标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('tabClose', 'Mod+W'),
});

export const reopenTabCommand = defineCommand({
  id: 'workbench.tabReopen',
  title: '重新打开已关闭的标签页',
  description: '重新打开最近关闭的标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('tabReopen', 'Mod+Shift+T'),
});

export const renameTabCommand = defineCommand({
  id: 'workbench.tabRename',
  title: '重命名标签页',
  description: '重命名当前标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('tabRename', 'Mod+Shift+R'),
});

export const splitPaneCommand = defineCommand({
  id: 'workbench.splitPane',
  title: '拆分面板',
  description: '将当前标签页移到右侧的新面板',
  category: 'Tab Navigation',
  keybinding: keybinding.settings('splitPane', code(['Mod'], 'Backslash')),
});

export const cycleNextTabCommand = defineCommand({
  id: 'workbench.tabCycleNext',
  title: '切换到下一个标签页',
  description: '切换到下一个标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.fixed('Control+Tab', { allowWhenTerminalFocused: true }),
});

export const cyclePreviousTabCommand = defineCommand({
  id: 'workbench.tabCyclePrev',
  title: '切换到上一个标签页',
  description: '切换到上一个标签页',
  category: 'Tab Navigation',
  keybinding: keybinding.fixed('Control+Shift+Tab', { allowWhenTerminalFocused: true }),
});

export const saveEditorCommand = defineCommand({
  id: 'editor.save',
  title: '保存文件',
  description: '保存编辑器中的当前文件',
  category: 'Editor',
  keybinding: keybinding.fixed('Mod+S', { ignoreWhenBrowserFocused: true }),
});

export const saveAllEditorsCommand = defineCommand({
  id: 'editor.saveAll',
  title: '保存所有文件',
  description: '保存所有打开的文件',
  category: 'Editor',
  keybinding: keybinding.fixed('Mod+Shift+S', { ignoreWhenBrowserFocused: true }),
});

export const findInTerminalCommand = defineCommand({
  id: 'terminal.find',
  title: '在终端中搜索',
  description: '在当前终端中搜索',
  category: 'Terminal',
  keybinding: keybinding.fixed('Mod+F', { allowWhenTerminalFocused: true }),
});

export const closeTerminalSearchCommand = defineCommand({
  id: 'terminalSearch.close',
  title: '关闭终端搜索',
  description: '关闭终端搜索',
  category: 'Terminal',
  keybinding: keybinding.fixed('Escape'),
});

function defineTabIndexCommand<const TIndex extends number>(index: TIndex) {
  return defineCommand({
    id: `workbench.tab${index}` as const,
    title: `打开第 ${index} 个标签页`,
    description: `切换到第 ${index} 个标签页`,
    category: 'Tab Navigation',
    keybinding: keybinding.fixed(`Mod+${index}`),
  });
}

export const tabIndexCommands = [
  defineTabIndexCommand(1),
  defineTabIndexCommand(2),
  defineTabIndexCommand(3),
  defineTabIndexCommand(4),
  defineTabIndexCommand(5),
  defineTabIndexCommand(6),
  defineTabIndexCommand(7),
  defineTabIndexCommand(8),
  defineTabIndexCommand(9),
] as const;

export const toggleLeftSidebarCommand = defineCommand({
  id: 'workbench.toggleLeftSidebar',
  title: '切换左侧边栏',
  description: '显示或隐藏左侧边栏',
  category: 'View',
  keybinding: keybinding.settings('toggleLeftSidebar', 'Mod+B'),
});

export const zenModeCommand = defineCommand({
  id: 'workbench.zenMode',
  title: '专注模式',
  description: '隐藏两侧边栏',
  category: 'View',
  keybinding: keybinding.settings('zenMode', 'Control+Z', {
    ignoreWhenEditorFocused: true,
    ignoreWhenBrowserFocused: true,
  }),
});

export const WINDOW_COMMAND_DEFS = [
  settingsCommand,
  newProjectCommand,
  newTaskCommand,
  giveFeedbackCommand,
  toggleThemeCommand,
  navigateBackCommand,
  navigateForwardCommand,
  commandPaletteCommand,
  openInEditorCommand,
  confirmCommand,
  toggleLeftSidebarCommand,
  zenModeCommand,
] as const;

export const WORKBENCH_COMMAND_DEFS = [
  ...WINDOW_COMMAND_DEFS,
  closeModalCommand,
  nextTabCommand,
  previousTabCommand,
  closeTabCommand,
  reopenTabCommand,
  renameTabCommand,
  splitPaneCommand,
  cycleNextTabCommand,
  cyclePreviousTabCommand,
  saveEditorCommand,
  saveAllEditorsCommand,
  findInTerminalCommand,
  closeTerminalSearchCommand,
  ...tabIndexCommands,
] as const;

export const PANE_COMMAND_DEFS = [
  nextTabCommand,
  previousTabCommand,
  closeTabCommand,
  reopenTabCommand,
  renameTabCommand,
  splitPaneCommand,
  cycleNextTabCommand,
  cyclePreviousTabCommand,
  ...tabIndexCommands,
] as const;
