import type { SettingsPageTab } from '@core/features/settings/contributions/views';
import { settingsPageContributions } from '@core/manifests/browser/settings-page-contributions';
import { detectPlatformContext } from '@core/primitives/keybindings/api';

export type SettingsSearchEntry = {
  /** Stable kebab-case id independent of the displayed language. */
  id: string;
  /** The visible label of the setting in the UI. */
  label: string;
  tab: Exclude<SettingsPageTab, 'docs'>;
  description?: string;
  /** Extra terms (synonyms, provider names) that should also match this entry. */
  keywords?: string[];
};

const isMac = detectPlatformContext().os === 'mac';

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  // General
  {
    id: 'version',
    label: '版本',
    tab: 'general',
    description: '查看应用版本和更新。',
    keywords: ['version', 'update', 'upgrade', 'restart', 'release'],
  },
  {
    id: 'auto-generate-task-names',
    label: '自动生成任务名称',
    tab: 'general',
    description: '创建任务时自动建议名称。',
    keywords: ['auto-generate task names'],
  },
  {
    id: 'auto-trust-worktree-directories',
    label: '自动信任工作树目录',
    tab: 'general',
    description: '新任务在支持的 CLI 中可跳过文件夹信任提示。',
    keywords: ['auto-trust worktree directories', 'trust', 'claude code', 'copilot'],
  },
  {
    id: 'create-branch-and-worktree-by-default',
    label: '默认创建分支和工作树',
    tab: 'general',
    description: '从分支创建任务时，为任务创建专用分支和工作树。',
    keywords: ['create branch and worktree by default', 'git'],
  },
  {
    id: 'preserve-task-name-capitalization',
    label: '保留任务名称中的大小写',
    tab: 'general',
    description: '在自动生成或手动输入的任务名称中保留大写字母。',
    keywords: ['preserve task name capitalization', 'lowercase', 'uppercase'],
  },
  {
    id: 'enable-tmux',
    label: '启用 tmux',
    tab: 'general',
    description: '默认在 tmux 中运行智能体会话和终端。',
    keywords: ['enable tmux', 'multiplexer'],
  },
  {
    id: 'notifications',
    label: '通知',
    tab: 'general',
    description: '智能体需要你的注意时发送通知。',
    keywords: ['notifications', 'alerts'],
  },
  {
    id: 'sound',
    label: '提示音',
    tab: 'general',
    description: '智能体有新事件时播放提示音。',
    keywords: ['sound', 'audio', 'notifications'],
  },
  {
    id: 'custom-sound',
    label: '自定义提示音',
    tab: 'general',
    description: '使用音频文件作为提示音。',
    keywords: ['custom sound', 'audio', 'notifications'],
  },
  {
    id: 'sound-timing',
    label: '提示音播放时机',
    tab: 'general',
    description: '设置播放提示音的时机。',
    keywords: ['sound timing', 'audio', 'notifications', 'unfocused'],
  },
  {
    id: 'os-notifications',
    label: '系统通知',
    tab: 'general',
    description: '智能体需要你的注意或完成任务时显示系统通知横幅。',
    keywords: ['os notifications', 'banner', 'system'],
  },
  // Agents
  {
    id: 'agents',
    label: '智能体',
    tab: 'clis-models',
    description: '管理已安装的 CLI 智能体及其配置。',
    keywords: ['agents', 'claude', 'codex', 'copilot', 'cursor', 'gemini', 'cli'],
  },
  {
    id: 'mcp',
    label: 'MCP',
    tab: 'mcp',
    description: '管理智能体可用的本地 MCP 服务器。',
    keywords: ['model context protocol', 'servers', 'tools'],
  },
  {
    id: 'skills',
    label: '技能',
    tab: 'skills',
    description: '管理可复用的本地智能体技能。',
    keywords: ['skills', 'skill modules', 'agents'],
  },

  // Repository
  {
    id: 'branch-prefix',
    label: '分支前缀',
    tab: 'repository',
    description: '留空即可创建无前缀的分支。',
    keywords: ['branch prefix', 'git'],
  },
  {
    id: 'random-branch-suffix',
    label: '随机分支后缀',
    tab: 'repository',
    description: '给分支名称添加随机后缀。',
    keywords: ['random branch suffix', 'git'],
  },
  {
    id: 'auto-push-on-create',
    label: '创建时自动推送',
    tab: 'repository',
    description: '将新分支推送到所选 Git 远端并设置上游。',
    keywords: ['auto-push on create', 'git', 'remote', 'upstream'],
  },
  // Local workspaces
  {
    id: 'task-worktree-storage',
    label: '工作区',
    tab: 'workspaces-local',
    description: '查看任务工作树的使用情况并清理闲置工作树。',
    keywords: ['workspaces', 'disk', 'cleanup', 'storage', 'worktrees', 'worktree storage'],
  },

  // Conversations
  {
    id: 'conversations',
    label: '对话',
    tab: 'conversations',
    description: '查看本机的全部对话记录，包括未关联任务的对话。',
    keywords: ['conversations', 'chats', 'sessions', 'orphaned', 'history', 'agents'],
  },

  // Prompts
  {
    id: 'prompts',
    label: '提示词',
    tab: 'prompts',
    description: '管理可在任务和对话中重复使用的提示词。',
    keywords: ['prompts', 'prompt library', 'snippets'],
  },

  // System
  {
    id: 'system',
    label: '系统',
    tab: 'system',
    description: '查看本机资源占用和系统依赖。',
    keywords: ['system', 'cpu', 'memory', 'disk', 'dependencies', 'git', 'tmux'],
  },

  // Interface
  {
    id: isMac ? 'show-emdash-in-the-menu-bar' : 'show-emdash-in-the-system-tray',
    label: isMac ? '在菜单栏中显示 Emdash' : '在系统托盘中显示 Emdash',
    tab: 'interface',
    description: '智能体在后台运行时，可快速返回 Emdash。',
    keywords: ['menu bar', 'system tray', 'task bar', 'icon', 'hide', 'disable'],
  },
  {
    id: 'color-mode',
    label: '配色模式',
    tab: 'interface',
    description: '选择 Emdash 的外观。',
    keywords: ['color mode', 'theme', 'dark mode', 'light mode', 'appearance', 'system'],
  },
  {
    id: 'default-terminal-shell',
    label: '默认终端 Shell',
    tab: 'interface',
    description: '用于新建终端。',
    keywords: ['default terminal shell', 'bash', 'zsh', 'fish'],
  },
  {
    id: 'terminal-font',
    label: '终端字体',
    tab: 'interface',
    description: '选择终端使用的字体。',
    keywords: ['terminal font', 'font family', 'menlo'],
  },
  {
    id: 'terminal-font-size',
    label: '终端字号',
    tab: 'interface',
    description: '调整终端和 CLI 智能体的字号。',
    keywords: ['terminal font size', 'text size', 'zoom'],
  },
  {
    id: 'auto-copy-selected-text',
    label: '自动复制所选文本',
    tab: 'interface',
    description: '在终端选中文本时自动复制到剪贴板。',
    keywords: ['auto-copy selected text', 'clipboard', 'terminal'],
  },
  {
    id: 'use-option-as-meta-key',
    label: '将 Option 键用作 Meta 键',
    tab: 'interface',
    description: '在终端中将 Option 键视作 Meta 键。',
    keywords: ['use option as meta key', 'macos', 'alt', 'terminal'],
  },
  {
    id: 'left-sidebar-line-changes',
    label: '侧边栏中的行数变更',
    tab: 'interface',
    description: '在左侧边栏显示任务新增和删除的行数。',
    keywords: ['left sidebar line changes', 'diff'],
  },
  {
    id: 'left-sidebar-pr-status',
    label: '侧边栏中的拉取请求状态',
    tab: 'interface',
    description: '在左侧边栏显示 GitHub 拉取请求的合并和状态图标。',
    keywords: ['left sidebar pr status', 'pull request'],
  },
  {
    id: 'left-sidebar-timestamps',
    label: '侧边栏中的时间戳',
    tab: 'interface',
    description: '在左侧边栏显示任务的相对时间。',
    keywords: ['left sidebar timestamps', 'time'],
  },
  {
    id: 'resource-monitor',
    label: '资源监视器',
    tab: 'interface',
    description: '跟踪运行中智能体的 CPU 和内存占用。',
    keywords: ['resource monitor', 'cpu', 'memory', 'performance'],
  },
  {
    id: 'context-bar',
    label: '上下文栏',
    tab: 'interface',
    description: '隐藏界面中的上下文按钮。',
    keywords: ['context bar'],
  },
  {
    id: 'keyboard-shortcuts',
    label: '键盘快捷键',
    tab: 'interface',
    description: '修改、重置或移除应用的键盘快捷键。',
    keywords: ['keyboard shortcuts', 'hotkeys', 'keybindings', 'rebind'],
  },
  {
    id: 'open-in-tools',
    label: '工具',
    tab: 'interface',
    description: '在打开方式菜单中显示或隐藏已检测到的应用。',
    keywords: ['tools', 'open in', 'editor', 'hidden tools'],
  },
  // Browser
  {
    id: 'default-browser-profile',
    label: '默认浏览器配置',
    tab: 'browser',
    description: '新浏览器标签页使用此配置。',
    keywords: ['default browser profile', 'isolated'],
  },
  {
    id: 'disable-cors-for-localhost',
    label: '关闭 localhost 的 CORS 限制',
    tab: 'browser',
    description: '允许 Emdash 浏览器中的 localhost 页面访问缺少 CORS 响应头的 API。',
    keywords: ['disable cors for localhost', 'cross-origin'],
  },
  {
    id: 'browser-profiles',
    label: '浏览器配置',
    tab: 'browser',
    description: '每个配置独立保存 Cookie 和登录状态，可跨任务使用。',
    keywords: ['browser profiles', 'cookies', 'logins'],
  },
  {
    id: 'browsing-data',
    label: '浏览数据',
    tab: 'browser',
    description: '清除内置浏览器的 Cookie、缓存文件和网站数据。',
    keywords: ['browsing data', 'cookies', 'cache', 'clear', 'site data'],
  },
];

function normalizeQuery(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function entryMatchesTokens(entry: SettingsSearchEntry, tokens: string[]): boolean {
  const haystack = [entry.label, entry.description ?? '', ...(entry.keywords ?? [])]
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/** All index entries matching the query. An empty/whitespace query matches nothing. */
export function searchSettings(
  query: string,
  index: SettingsSearchEntry[] = SETTINGS_SEARCH_INDEX
): SettingsSearchEntry[] {
  const tokens = normalizeQuery(query);
  if (tokens.length === 0) return [];
  return index.filter((entry) => entryMatchesTokens(entry, tokens));
}

/** Tabs containing at least one match, in sidebar order. */
export function matchedTabsForQuery(
  query: string,
  index: SettingsSearchEntry[] = SETTINGS_SEARCH_INDEX
): SettingsPageTab[] {
  const matchedTabs = new Set(searchSettings(query, index).map((entry) => entry.tab));
  return settingsPageContributions
    .filter((page) => matchedTabs.has(page.id))
    .map((page) => page.id);
}
