import { DropdownMenu, Tooltip, useToast } from '@emdash/ui/react/primitives';
import { ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { useOpenInApps } from '@core/features/settings/api/browser/useOpenInApps';
import { getHostClient } from '@core/primitives/desktop-host/browser/host-client';
import { BoundShortcut } from '@core/primitives/keybindings/browser/shortcut';
import { log } from '@core/primitives/logging/browser/logger';
import {
  getAppById,
  isValidOpenInAppId,
  type OpenInAppId,
} from '@core/primitives/open-in-apps/api/open-in-apps';
import { openInCommandRegistry } from '@core/primitives/open-in-apps/browser/open-in-command-registry';
import { cn } from '@core/primitives/styling/browser/cn';

interface OpenInMenuProps {
  path: string;
  className?: string;
  borderless?: boolean;
}

export const OpenInMenu: React.FC<OpenInMenuProps> = ({
  path,
  className,
  borderless = false,
}) => {
  const { toast } = useToast();
  const { icons, labels, installedApps, availability } = useOpenInApps();
  const { value: openIn, update } = useAppSettingsKey('openIn');

  const defaultApp: OpenInAppId | null =
    openIn?.default && isValidOpenInAppId(openIn.default) ? openIn.default : null;

  const persistPreferredApp = useCallback(
    (appId: OpenInAppId) => {
      update({ default: appId });
    },
    [update]
  );

  const triggerOpenIn = useCallback(
    async (appId: OpenInAppId) => {
      const label = labels[appId] || appId;
      try {
        const res = await (
          await getHostClient()
        ).openIn({ app: appId, path }, { timeoutMs: 75_000 });
        if (!res?.success) {
          toast.error(`无法在 ${label} 中打开`, {
            description: res?.error || '应用不可用。',
          });
        }
      } catch (e: unknown) {
        log.warn('[open-in] Launch request failed', {
          appId,
          error: e instanceof Error ? e.message : String(e),
        });
        toast.error(`无法在 ${label} 中打开`, {
          description: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [labels, path, toast]
  );

  const selectAndOpenApp = useCallback(
    (appId: OpenInAppId) => {
      persistPreferredApp(appId);
      void triggerOpenIn(appId);
    },
    [persistPreferredApp, triggerOpenIn]
  );

  const sortedApps = useMemo(() => {
    if (!defaultApp) return installedApps;
    return [...installedApps].sort((a, b) => {
      if (a.id === defaultApp) return -1;
      if (b.id === defaultApp) return 1;
      return 0;
    });
  }, [defaultApp, installedApps]);

  const menuApps = useMemo(
    () => sortedApps.filter((app) => availability[app.id] === 'detected'),
    [availability, sortedApps]
  );

  const buttonAppId = useMemo(() => {
    if (defaultApp && menuApps.some((app) => app.id === defaultApp)) {
      return defaultApp;
    }
    return menuApps[0]?.id;
  }, [defaultApp, menuApps]);

  const buttonAppLabel = buttonAppId ? (labels[buttonAppId] ?? buttonAppId) : null;

  useEffect(() => {
    if (!buttonAppId) return;
    return openInCommandRegistry.register({
      trigger: () => {
        void triggerOpenIn(buttonAppId);
      },
    });
  }, [buttonAppId, triggerOpenIn]);

  return (
    <div
      className={cn(
        'border border-border rounded-md h-6 flex items-center text-foreground-muted overflow-hidden',
        borderless && 'border-none',
        className
      )}
    >
      <Tooltip.Provider delay={0}>
        <Tooltip.Root>
          <Tooltip.Trigger
            className="flex min-w-0 flex-1"
            render={
              <button
                type="button"
                className={cn(
                  'group flex items-center w-full border-r border-border rounded-r-none px-2 text-xs transition-colors hover:bg-background-1 hover:text-foreground min-w-0',
                  borderless && 'border-none  pr-1'
                )}
                onClick={() => {
                  if (!buttonAppId) return;
                  void triggerOpenIn(buttonAppId);
                }}
                disabled={!buttonAppId}
                aria-label={buttonAppLabel ? `在 ${buttonAppLabel} 中打开` : '打开'}
              >
                {buttonAppId && icons[buttonAppId] && (
                  <img
                    src={icons[buttonAppId]}
                    alt={labels[buttonAppId] || buttonAppId}
                    className={`size-3.5 rounded ${
                      getAppById(buttonAppId)?.invertInDark ? 'emdark:invert' : ''
                    }`}
                  />
                )}
              </button>
            }
          />
          <Tooltip.Content side="bottom">
            <div className="flex flex-col gap-1">
              <span>在 {buttonAppLabel || '编辑器'} 中打开</span>
              <BoundShortcut command="app.openInEditor" variant="keycaps" />
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
      <DropdownMenu.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <DropdownMenu.Trigger
                className="group flex size-6 shrink-0 items-center justify-center border-none bg-transparent transition-colors hover:bg-background-1 hover:text-foreground"
                aria-label="打开方式选项"
                disabled={menuApps.length === 0}
              >
                <ChevronDown className="size-3.5" />
              </DropdownMenu.Trigger>
            }
          ></Tooltip.Trigger>
          <Tooltip.Content side="bottom">选择打开方式</Tooltip.Content>
        </Tooltip.Root>
        <DropdownMenu.Content align="end" sideOffset={6} width="content">
          <DropdownMenu.RadioGroup
            value={defaultApp ?? undefined}
            onValueChange={(value) => {
              if (isValidOpenInAppId(value)) selectAndOpenApp(value as OpenInAppId);
            }}
          >
            {menuApps.map((app) => (
              <DropdownMenu.RadioItem key={app.id} value={app.id}>
                {icons[app.id] && (
                  <img
                    src={icons[app.id]}
                    alt={labels[app.id] || app.label}
                    className={`h-4 w-4 rounded ${app.invertInDark ? 'emdark:invert' : ''}`}
                  />
                )}
                {labels[app.id] || app.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
