import '@emdash/ui/style.css';
import { Dialog } from '@emdash/ui/react/primitives';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { CreateTaskModal } from './create-task-modal';

const mocks = vi.hoisted(() => ({ missingBranch: false }));

vi.mock('@core/features/projects/api/browser/stores/project-selectors', () => ({
  getProjectStore: () => ({}),
  projectData: () => ({ path: '/repo' }),
  getProjectViewStore: () => ({}),
  firstAvailableProjectId: () => 'project-1',
  getProjectSettingsStore: () => undefined,
}));
vi.mock('@core/features/source-control/api/browser/stores/source-control-selectors', () => ({
  getGitRepositoryStore: () => undefined,
}));
vi.mock('@core/features/tasks/api/browser/create-task-modal/use-project-git-context', () => ({
  useProjectGitContext: () => ({ hasRepository: true, isUnborn: false }),
}));
vi.mock('@core/features/tasks/api/browser/hooks/useTaskSettings', () => ({
  useTaskSettings: () => ({}),
}));
vi.mock('./use-create-task-state', () => ({
  useCreateTaskState: () => ({
    workspaceConfig: { missingBranch: mocks.missingBranch },
    linkedType: null,
  }),
}));
vi.mock('./use-create-task-callback', () => ({
  useCreateTaskCallback: () => ({ canCreate: !mocks.missingBranch }),
}));
vi.mock('./task-name-field', () => ({ TaskNameField: () => null }));
vi.mock(
  '@core/features/tasks/contributions/browser/task-config/initial-conversation-section',
  () => ({ useInitialConversationState: () => ({}) })
);
vi.mock('@core/features/tasks/contributions/browser/task-config/task-state-context', () => ({
  TaskStateProvider: () => null,
}));
vi.mock('@core/features/tasks/contributions/browser/task-config/task-config-panel', () => ({
  TaskConfigPanel: () => null,
}));
vi.mock('@core/features/tasks/contributions/browser/task-config/conversation-field', () => ({
  ConversationField: () => null,
}));
vi.mock(
  '@core/features/tasks/contributions/browser/task-config/workspace-settings-section',
  () => ({ WorkspaceSettingsSection: () => null })
);
vi.mock('@core/features/tasks/api/browser/task-state/task-selectors', () => ({
  taskHostActionAvailability: () => ({ kind: 'enabled' }),
}));
vi.mock('@core/manifests/browser/modal-api', () => ({
  useModalController: () => ({}),
  useOpenModal: () => vi.fn(),
}));
vi.mock('@core/primitives/navigation/browser/navigation-hooks', () => ({
  useNavigate: () => ({}),
}));
vi.mock('@core/primitives/navigation/browser/navigation-selectors', () => ({
  getNavigation: () => ({}),
}));
vi.mock('@core/primitives/keybindings/browser/confirm-button', async () => ({
  ConfirmButton: (await import('@emdash/ui/react/primitives')).Button,
}));
vi.mock('@core/manifests/browser/project-availability-ui', () => ({ projectAvailabilityUi: {} }));
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.missingBranch = false;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  client.clear();
});
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Dialog.Root open>
          <Dialog.Content>
            <CreateTaskModal projectId="project-1" />
          </Dialog.Content>
        </Dialog.Root>
      </QueryClientProvider>
    )
  );
}
it('shows a Chinese local-task dialog without hosted issue or review actions', async () => {
  await render();
  await expect.element(page.getByRole('heading', { name: '创建任务' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: '创建', exact: true })).toBeEnabled();
  expect(document.body.textContent).not.toMatch(/Pull Request|Merge Request|工单|合并请求/);
});
it('explains a Create blocked on an unresolved base branch', async () => {
  mocks.missingBranch = true;
  await render();
  const create = page.getByRole('button', { name: /^创建/ });
  await expect.element(create).toBeDisabled();
  await expect.element(create).toHaveAttribute('title', '请在工作区设置中选择分支。');
  await expect.element(create).toHaveAccessibleName('创建。请在工作区设置中选择分支。');
});
it('leaves Create without a reason when a branch is selected', async () => {
  await render();
  const create = page.getByRole('button', { name: '创建', exact: true });
  await expect.element(create).not.toHaveAttribute('title');
});
