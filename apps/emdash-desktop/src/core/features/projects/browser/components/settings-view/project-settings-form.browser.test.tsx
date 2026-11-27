import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@core/features/source-control/api/browser/stores/source-control-selectors', () => ({
  getGitRepositoryStore: () => undefined,
}));
vi.mock('./project-settings-footer', () => ({
  ProjectSettingsFooter: () => null,
}));
vi.mock('./sections/base-project-settings-section', () => ({
  BaseProjectSettingsSection: () => null,
}));
vi.mock('./sections/shareable-project-settings-section', () => ({
  ShareableSettingsSection: () => null,
}));
vi.mock('./use-project-settings-form', () => ({
  useProjectSettingsForm: () => ({
    form: {
      gitIdentity: {},
      placement: {},
      lifecycle: {},
      fileHandling: {},
    },
    configMigrations: [],
  }),
}));

const { ProjectSettingsForm } = await import('./project-settings-form');

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('ProjectSettingsForm unavailable copy', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it('explains stale repository settings when the local runtime is unavailable', async () => {
    await renderForm(root, 'stale');

    expect(host.textContent).toContain('本地运行环境暂不可用，仓库设置可能不是最新的。');
  });

  it('explains when repository settings become available', async () => {
    await renderForm(root, 'unavailable');

    expect(host.textContent).toContain('本地运行环境就绪后，才能访问仓库设置。');
  });

  it('lets the Project page own vertical scrolling', async () => {
    await renderForm(root, 'unavailable');

    expect(host.querySelector('.overflow-y-auto')).toBeNull();
  });
});

async function renderForm(root: Root, hostObservationKind: 'stale' | 'unavailable'): Promise<void> {
  await act(async () => {
    root.render(
      <ProjectSettingsForm
        projectId="project-1"
        domains={{} as never}
        configMigrations={[]}
        hostActionReason={null}
        hostObservationKind={hostObservationKind}
        onSuccess={vi.fn()}
        save={vi.fn()}
        writeConfigToRepo={vi.fn()}
        migrateProjectConfig={vi.fn()}
      />
    );
  });
}
