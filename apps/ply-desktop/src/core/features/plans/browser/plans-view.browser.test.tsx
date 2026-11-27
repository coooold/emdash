import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyManualPlanAction,
  emptyManualPlan,
  type ManualPlanAction,
  type ManualPlanDocument,
} from '../api/manual-plan';
import { PlansView } from './plans-view';

const backend = vi.hoisted(() => ({
  document: { version: 1, projects: [] } as ManualPlanDocument,
  load: vi.fn<() => Promise<ManualPlanDocument>>(),
  apply: vi.fn<(action: ManualPlanAction) => Promise<unknown>>(),
  actions: [] as ManualPlanAction[],
}));

vi.mock('../api/browser/client', () => ({
  getPlansClient: async () => ({ load: backend.load, apply: backend.apply }),
}));

vi.mock('@core/features/workbench/contributions/browser/Titlebar', () => ({
  Titlebar: () => <header>计划</header>,
}));

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('PlansView', () => {
  let host: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let id: number;

  beforeEach(() => {
    backend.document = emptyManualPlan();
    backend.actions = [];
    id = 0;
    backend.load.mockImplementation(async () => structuredClone(backend.document));
    backend.apply.mockImplementation(async (action) => {
      try {
        backend.document = applyManualPlanAction(backend.document, action, {
          createId: () => `ui-${++id}`,
          today: '2026-11-27',
        });
        backend.actions.push(action);
        return { success: true, data: structuredClone(backend.document) };
      } catch (error) {
        return {
          success: false,
          error: {
            code:
              typeof error === 'object' && error && 'code' in error
                ? error.code
                : 'invalid-document',
            message: error instanceof Error ? error.message : 'Invalid plan',
          },
        };
      }
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    host.remove();
  });

  it('edits two project plans, rejects a cycle, and restores the full plan after renderer reload', async () => {
    await render();
    await enterText('新项目名称', 'Alpha');
    await clickButton('新建项目');
    await enterText('新项目名称', 'Beta');
    await clickButton('新建项目');

    await enterText('新需求名称 Alpha', 'Alpha requirement');
    await clickButton('新建需求', 0);
    await enterText('新需求名称 Beta', 'Beta requirement');
    await clickButton('新建需求', 1);

    await enterText('新子任务名称 Alpha requirement', 'A1');
    await clickButton('添加子任务', 0);
    await enterText('新子任务名称 Alpha requirement', 'A2');
    await clickButton('添加子任务', 0);
    await enterText('新子任务名称 Beta requirement', 'B1');
    await clickButton('添加子任务', 1);
    await enterText('新子任务名称 Beta requirement', 'B2');
    await clickButton('添加子任务', 1);
    expect(backend.document.projects).toHaveLength(2);
    expect(
      backend.document.projects.map(({ requirements }) => requirements[0]?.tasks)
    ).toHaveLength(2);

    await changeValue('结束日期 A1', '2026-12-05');
    await changeValue('开始日期 A1', '2026-12-02');
    await clickButton('上移 A2');
    await changeSelect('添加依赖 A2', 'ui-5');
    expect(backend.document.projects[0]?.requirements[0]?.tasks.map(({ title }) => title)).toEqual([
      'A2',
      'A1',
    ]);
    expect(
      backend.document.projects[0]?.requirements[0]?.tasks.find(({ title }) => title === 'A1')
    ).toMatchObject({
      startDate: '2026-12-02',
      endDate: '2026-12-05',
    });
    expect(
      backend.document.projects[0]?.requirements[0]?.tasks.find(({ title }) => title === 'A2')
        ?.dependsOn
    ).toEqual(['ui-5']);
    expect(host.querySelector('[aria-label="甘特条 A1"]')).not.toBeNull();

    await changeSelect('添加依赖 A1', 'ui-6');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('循环');
    expect(
      backend.document.projects[0]?.requirements[0]?.tasks.find(({ title }) => title === 'A1')
        ?.dependsOn
    ).toEqual([]);

    await clickButton('Alpha requirement');
    expect(host.querySelector('button[aria-expanded="false"]')?.textContent).toContain(
      'Alpha requirement'
    );
    await clickButton('Alpha requirement');
    expect(host.querySelector('button[aria-expanded="true"]')?.textContent).toContain(
      'Alpha requirement'
    );

    expect(
      backend.actions.every(
        ({ type }) =>
          type.startsWith('create-') ||
          type === 'update-task' ||
          type === 'move-task' ||
          type === 'set-dependency' ||
          type === 'set-requirement-expanded'
      )
    ).toBe(true);

    await act(async () => root.unmount());
    queryClient.clear();
    root = createRoot(host);
    await render();
    expect(host.textContent).toContain('Alpha');
    expect(host.textContent).toContain('Beta');
    expect(host.textContent).toContain('A1');
    expect(host.textContent).toContain('A2');
    expect(host.textContent).toContain('B1');
    expect(host.textContent).toContain('B2');
    expect(
      backend.document.projects[0]?.requirements[0]?.tasks.find(({ title }) => title === 'A2')
        ?.dependsOn
    ).toEqual(['ui-5']);
  });

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PlansView />
        </QueryClientProvider>
      );
    });
    await act(async () => Promise.resolve());
  }

  async function enterText(label: string, value: string) {
    const element = findByLabel<HTMLInputElement>(label);
    await act(async () => {
      setNativeValue(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function changeValue(label: string, value: string) {
    const element = findByLabel<HTMLInputElement>(label);
    await act(async () => {
      setNativeValue(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => Promise.resolve());
  }

  async function changeSelect(label: string, value: string) {
    const element = findByLabel<HTMLSelectElement>(label);
    await act(async () => {
      setNativeValue(element, value);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
  }

  async function clickButton(label: string, index = 0) {
    const buttons = [...host.querySelectorAll('button')].filter(
      (button) => button.textContent?.includes(label) || button.getAttribute('aria-label') === label
    );
    expect(buttons[index], `button ${label} #${index}`).toBeDefined();
    await act(async () => {
      buttons[index]?.click();
      await Promise.resolve();
    });
  }
});

function findByLabel<T extends HTMLElement>(label: string): T {
  const element = [...document.querySelectorAll<HTMLElement>('[aria-label]')].find(
    (candidate) => candidate.getAttribute('aria-label') === label
  );
  if (!element) throw new Error(`Missing element: ${label}`);
  return element as T;
}

function setNativeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
  setter?.call(element, value);
}
