import { defineCommand } from '@core/primitives/commands/api';
import { keybinding } from '@core/primitives/keybindings/api';

export const newConversationCommand = defineCommand({
  id: 'task.newConversation',
  title: '新建对话',
  description: '在当前任务中新建对话',
  category: 'Conversations',
  icon: 'message-square-plus',
  keybinding: keybinding.settings('newConversation', 'Mod+T'),
});

export const newConversationSplitRightCommand = defineCommand({
  id: 'task.newConversationSplitRight',
  title: '在右侧分栏新建对话',
  description: '在右侧分栏中创建对话',
  category: 'Conversations',
  icon: 'columns-2',
  keybinding: keybinding.settings('newConversationSplitRight', 'Mod+D'),
});

export const sidebarChangesCommand = defineCommand({
  id: 'task.sidebarChanges',
  title: '查看更改',
  description: '打开右侧边栏的更改面板',
  category: 'View',
  icon: 'file-diff',
  keybinding: keybinding.settings('sidebarChanges', 'Mod+Shift+1'),
});

export const sidebarConversationsCommand = defineCommand({
  id: 'task.sidebarConversations',
  title: '查看对话',
  description: '打开右侧边栏的对话面板',
  category: 'View',
  icon: 'message-square',
  keybinding: keybinding.settings('sidebarConversations', 'Mod+Shift+3'),
});

export const sidebarFilesCommand = defineCommand({
  id: 'task.sidebarFiles',
  title: '聚焦文件列表',
  description: '将焦点移到左侧文件列表的搜索框',
  category: 'View',
  icon: 'folder-open',
  keybinding: keybinding.settings('sidebarFiles', 'Mod+Shift+2'),
});

export const fileContentSearchCommand = defineCommand({
  id: 'task.fileContentSearch',
  title: '搜索文件内容',
  description: '将焦点移到左侧文件列表的文件内容搜索框',
  category: 'Search',
  icon: 'search',
  keybinding: keybinding.settings('fileContentSearch', 'Mod+Shift+F', {
    allowWhenTerminalFocused: true,
  }),
});

export const viewTerminalsCommand = defineCommand({
  id: 'task.viewTerminals',
  title: '查看终端',
  description: '打开终端面板',
  category: 'View',
  icon: 'terminal',
});

export const toggleTerminalDrawerCommand = defineCommand({
  id: 'task.toggleTerminalDrawer',
  title: '切换终端面板',
  description: '显示或隐藏终端面板',
  category: 'Panel',
  icon: 'terminal',
  keybinding: keybinding.settings('toggleTerminalDrawer', 'Mod+J'),
});

export const toggleRightSidebarCommand = defineCommand({
  id: 'task.toggleRightSidebar',
  title: '切换右侧边栏',
  description: '显示或隐藏右侧边栏',
  category: 'Panel',
  icon: 'panel-right',
  keybinding: keybinding.settings('toggleRightSidebar', 'Mod+.'),
});

export const newTerminalCommand = defineCommand({
  id: 'task.newTerminal',
  title: '新建终端',
  description: '新建终端会话',
  category: 'Terminals',
  icon: 'square-terminal',
  keybinding: keybinding.settings('newTerminal', 'Mod+Shift+`'),
});

export const openBrowserCommand = defineCommand({
  id: 'task.openBrowser',
  title: '打开浏览器',
  description: '为此任务打开内置浏览器',
  category: 'Browser',
  icon: 'globe',
  keybinding: keybinding.settings('openBrowser', 'Mod+Shift+B'),
});

export const browserGoBackCommand = defineCommand({
  id: 'task.browserGoBack',
  title: '浏览器后退',
  description: '在当前浏览器标签页中后退',
  category: 'Browser',
  icon: 'arrow-left',
});

export const browserGoForwardCommand = defineCommand({
  id: 'task.browserGoForward',
  title: '浏览器前进',
  description: '在当前浏览器标签页中前进',
  category: 'Browser',
  icon: 'arrow-right',
});

export const browserReloadCommand = defineCommand({
  id: 'task.browserReload',
  title: '刷新浏览器',
  description: '刷新当前浏览器标签页',
  category: 'Browser',
  icon: 'refresh-cw',
});

export const browserFocusUrlCommand = defineCommand({
  id: 'task.browserFocusUrl',
  title: '聚焦浏览器地址栏',
  description: '将焦点移到当前浏览器标签页的地址栏',
  category: 'Browser',
  icon: 'text-cursor-input',
});

export const browserOpenExternalCommand = defineCommand({
  id: 'task.browserOpenExternal',
  title: '在系统浏览器中打开',
  description: '在系统浏览器中打开当前页面地址',
  category: 'Browser',
  icon: 'external-link',
});

export const browserCopyUrlCommand = defineCommand({
  id: 'task.browserCopyUrl',
  title: '复制网页地址',
  description: '复制当前页面地址',
  category: 'Browser',
  icon: 'copy',
  keybinding: keybinding.settings('browserCopyUrl', 'Mod+Shift+C'),
});

export const gitFetchCommand = defineCommand({
  id: 'task.gitFetch',
  title: 'Git 获取',
  description: '获取远端的最新更改',
  category: 'Git',
  icon: 'git-pull-request',
});

export const gitPullCommand = defineCommand({
  id: 'task.gitPull',
  title: 'Git 拉取',
  description: '拉取远端的最新更改',
  category: 'Git',
  icon: 'arrow-down-to-line',
});

export const gitPushCommand = defineCommand({
  id: 'task.gitPush',
  title: 'Git 推送',
  description: '将提交推送到远端',
  category: 'Git',
  icon: 'arrow-up-to-line',
});

export const pinTaskCommand = defineCommand({
  id: 'task.pin',
  title: '置顶任务',
  description: '将此任务固定在列表顶部',
  category: 'Task',
  icon: 'pin',
});

export const archiveTaskCommand = defineCommand({
  id: 'task.archive',
  title: '归档任务',
  description: '归档当前任务',
  category: 'Task',
  icon: 'archive',
  keybinding: keybinding.settings('archiveTask', 'Mod+Shift+E', {
    ignoreWhenEditorFocused: true,
  }),
});

export const convertAutomationCommand = defineCommand({
  id: 'task.convertAutomation',
  title: '转为普通任务',
  description: '解除此任务与自动化运行的关联',
  category: 'Task',
  icon: 'message-square',
});

export const nextTaskCommand = defineCommand({
  id: 'task.nextTask',
  title: '下一个任务',
  description: '切换到下一个任务',
  category: 'Navigation',
  icon: 'chevron-down',
  keybinding: keybinding.settings('taskNext', 'Mod+Alt+ArrowDown', {
    ignoreWhenEditorFocused: true,
  }),
});

export const previousTaskCommand = defineCommand({
  id: 'task.prevTask',
  title: '上一个任务',
  description: '切换到上一个任务',
  category: 'Navigation',
  icon: 'chevron-up',
  keybinding: keybinding.settings('taskPrev', 'Mod+Alt+ArrowUp', {
    ignoreWhenEditorFocused: true,
  }),
});

export const deleteSelectedTasksCommand = defineCommand({
  id: 'task.deleteSelected',
  title: '删除所选任务',
  description: '删除当前选中的任务',
  category: 'Task',
  keybinding: keybinding.settings('deleteSelectedTasks', 'Mod+Backspace', {
    ignoreWhenTextInputFocused: true,
  }),
});

export const TASK_COMMAND_DEFS = [
  newConversationCommand,
  newConversationSplitRightCommand,
  sidebarChangesCommand,
  sidebarConversationsCommand,
  sidebarFilesCommand,
  fileContentSearchCommand,
  viewTerminalsCommand,
  toggleTerminalDrawerCommand,
  toggleRightSidebarCommand,
  newTerminalCommand,
  openBrowserCommand,
  browserGoBackCommand,
  browserGoForwardCommand,
  browserReloadCommand,
  browserFocusUrlCommand,
  browserOpenExternalCommand,
  browserCopyUrlCommand,
  gitFetchCommand,
  gitPullCommand,
  gitPushCommand,
  pinTaskCommand,
  archiveTaskCommand,
  convertAutomationCommand,
  nextTaskCommand,
  previousTaskCommand,
] as const;

export const TASK_LIST_COMMAND_DEFS = [deleteSelectedTasksCommand] as const;
