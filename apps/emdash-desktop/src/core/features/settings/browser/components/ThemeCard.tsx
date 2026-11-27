import { SelectableCard } from '@emdash/ui/react/primitives';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import React from 'react';
import type { Theme } from '@core/primitives/app-settings/api';
import { useTheme } from '@core/primitives/theme/browser';

const themeOptions: Array<{
  value: Theme;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
}> = [
  { value: null, label: '跟随系统', ariaLabel: '主题跟随系统', icon: Monitor },
  { value: 'emlight', label: '浅色', ariaLabel: '使用浅色主题', icon: Sun },
  { value: 'emdark', label: '深色', ariaLabel: '使用深色主题', icon: Moon },
];

const ThemeCard: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2 text-sm">
      {themeOptions.map(({ value, label, ariaLabel, icon: Icon }) => (
        <SelectableCard
          key={label}
          selected={theme === value}
          onClick={() => setTheme(value)}
          aria-label={ariaLabel}
          aria-pressed={theme === value}
          className="min-h-24"
        >
          <span className="flex flex-col items-center justify-center gap-2 px-2 py-2.5 text-sm font-medium sm:px-3">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-center">{label}</span>
          </span>
        </SelectableCard>
      ))}
    </div>
  );
};

export default ThemeCard;
