import { defineCommand } from '@core/primitives/commands/api';
import { keybinding } from '@core/primitives/keybindings/api';

export const closeSettingsCommand = defineCommand({
  id: 'settings.close',
  title: '关闭设置',
  description: '返回上一个视图',
  category: 'Navigation',
  keybinding: keybinding.fixed('Escape'),
});

export const SETTINGS_COMMAND_DEFS = [closeSettingsCommand] as const;
