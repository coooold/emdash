import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskListEmptyState } from '@core/features/projects/browser/components/task-view/task-list-empty-state';

const { openTaskModal } = vi.hoisted(() => ({ openTaskModal: vi.fn() }));

vi.mock('@core/features/projects/contributions/browser/project-availability-ui', () => ({
  projectAvailabilityUiContribution: {},
}));
vi.mock('@core/features/tasks/api/browser/task-state/task-selectors', () => ({
  taskHostActionAvailability: () => ({ kind: 'enabled' }),
}));
vi.mock('@core/manifests/browser/modal-api', () => ({
  useOpenModal: () => openTaskModal,
}));
vi.mock('@core/primitives/react-hooks/browser/use-arrow-key-navigation', () => ({
  useArrowKeyNavigation: () => ({ selectedIndex: -1, setSelectedIndex: vi.fn() }),
}));

describe('TaskListEmptyState', () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost',
    });
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('Element', dom.window.Element);
    vi.stubGlobal('Node', dom.window.Node);
    vi.stubGlobal('Event', dom.window.Event);
    container = dom.window.document.getElementById('root') as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    dom.window.close();
  });

  it('offers local branch tasks without issue or pull request actions', async () => {
    await act(async () => root.render(React.createElement(TaskListEmptyState, { projectId: 'p' })));
    const actions = Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-label]'));
    expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual(['从分支创建任务']);
    await act(async () => actions[0]?.click());
    expect(openTaskModal).toHaveBeenCalledExactlyOnceWith({
      projectId: 'p',
      strategy: 'from-branch',
    });
  });
});
