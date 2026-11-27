import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskFilesSidebar } from './task-files-sidebar';

const state = vi.hoisted(() => ({
  kind: 'ready',
  task: { taskId: 'task-a', paneLayout: {} },
  workspace: { workspaceId: 'workspace-a', path: '/repo/worktrees/a' },
}));

vi.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }));

vi.mock('@core/features/tasks/contributions/browser/task-view-context', () => ({
  useTaskViewKind: () => state.kind,
}));
vi.mock('@core/features/workbench/api/browser/task-composition-context', () => ({
  useTaskComposition: () => state.task,
  useWorkspace: () => state.workspace,
}));
vi.mock('@core/features/workbench/api/browser/task-tab-registry', () => ({
  taskTabView: { TabLayoutProvider: ({ children }: { children: ReactNode }) => children },
}));
vi.mock('@core/features/editor/contributions/browser/editor-file-tree', () => ({
  EditorFileTree: function Tree() {
    // Capture the root on mount to detect accidental reuse across worktrees.
    const [initialRoot] = useState(state.workspace.path);
    return <div data-testid="tree" data-root={initialRoot} />;
  },
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  state.kind = 'ready';
  state.task = { taskId: 'task-a', paneLayout: {} };
  state.workspace = { workspaceId: 'workspace-a', path: '/repo/worktrees/a' };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function render() {
  await act(async () => root.render(<TaskFilesSidebar />));
}

describe('task files in the left sidebar', () => {
  it('shows files immediately without a visibility toggle', async () => {
    await render();
    expect(host.querySelector('[aria-label="任务文件"]')).not.toBeNull();
    expect(host.querySelector('[data-root]')?.getAttribute('data-root')).toBe('/repo/worktrees/a');
    expect(host.querySelector('button')).toBeNull();
  });

  it('replaces the tree when switching tasks and when a worktree changes', async () => {
    await render();
    state.task = { taskId: 'task-b', paneLayout: {} };
    state.workspace = { workspaceId: 'workspace-b', path: '/repo/worktrees/b' };
    await render();
    expect(host.querySelector('[data-root]')?.getAttribute('data-root')).toBe('/repo/worktrees/b');
    state.workspace = { workspaceId: 'workspace-b-new', path: '/repo/worktrees/b-new' };
    await render();
    expect(host.querySelector('[data-root]')?.getAttribute('data-root')).toBe(
      '/repo/worktrees/b-new'
    );
  });

  it('does not render a stale tree while the new task is being provisioned', async () => {
    state.kind = 'provisioning';
    await render();
    expect(host.querySelector('[data-root]')).toBeNull();
    state.kind = 'ready';
    await render();
    expect(host.querySelector('[data-root]')).not.toBeNull();
  });
});
