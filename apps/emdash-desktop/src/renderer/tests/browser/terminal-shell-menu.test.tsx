import { Tooltip } from '@emdash/ui/react/primitives';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewTerminalButton } from '@core/features/terminals/browser/task-terminal/terminal-drawer-tab-bar';

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('terminal shell menu', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it('shows a loading item while shell availability is unresolved', async () => {
    await act(async () => {
      root.render(
        <Tooltip.Provider>
          <NewTerminalButton
            shellMenuState={{ kind: 'loading' }}
            onShellMenuOpen={() => {}}
            onRetryShellAvailability={() => {}}
            onAddTerminal={() => {}}
          />
        </Tooltip.Provider>
      );
    });

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="选择 Shell 新建终端"]')!.click();
    });

    expect(document.body.textContent).toContain('正在加载 Shell');
  });

  it('offers a retry after an availability failure', async () => {
    const onRetry = vi.fn();
    await act(async () => {
      root.render(
        <Tooltip.Provider>
          <NewTerminalButton
            shellMenuState={{ kind: 'error', message: 'Remote endpoint unavailable' }}
            onShellMenuOpen={() => {}}
            onRetryShellAvailability={onRetry}
            onAddTerminal={() => {}}
          />
        </Tooltip.Provider>
      );
    });

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="选择 Shell 新建终端"]')!.click();
    });
    const retry = Array.from(
      document.body.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')
    ).find((item) => item.textContent?.includes('无法加载 Shell'));

    expect(retry?.title).toBe('Remote endpoint unavailable');
    await act(async () => retry!.click());
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('loads again whenever the shell menu is reopened', async () => {
    const onOpen = vi.fn();
    await act(async () => {
      root.render(
        <Tooltip.Provider>
          <NewTerminalButton
            shellMenuState={{
              kind: 'ready',
              availability: [
                {
                  id: 'bash',
                  label: 'Bash',
                  isSystemDefault: true,
                  available: true,
                },
              ],
            }}
            onShellMenuOpen={onOpen}
            onRetryShellAvailability={() => {}}
            onAddTerminal={() => {}}
          />
        </Tooltip.Provider>
      );
    });
    const trigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="选择 Shell 新建终端"]'
    )!;

    await act(async () => trigger.click());
    expect(document.body.textContent).toContain('Bash');
    await act(async () => trigger.click());
    await act(async () => trigger.click());

    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
