import { Dialog, Input, ModalLayout, SelectableCard, toast } from '@ply/ui/react/primitives';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, FolderOpenIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo, useState, type ReactNode } from 'react';
import { getProjectsWireClient } from '@core/features/projects/api/browser/client';
import {
  getProjectManagerStore,
  getProjectSettingsStore,
} from '@core/features/projects/api/browser/stores/project-selectors';
import type { ModeData as ProjectCreationModeData } from '@core/features/projects/browser/stores/project-creation-types';
import { projectViewDef } from '@core/features/projects/contributions/views';
import { useModalController, useOpenModal } from '@core/manifests/browser/modal-api';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { log } from '@core/primitives/logging/browser/logger';
import { defineModal } from '@core/primitives/modals/react';
import { useNavigate } from '@core/primitives/navigation/browser/navigation-hooks';
import { basenameFromAnyPath } from '@core/primitives/path-name/api';
import { ClonePanel, PickExistingPanel } from './content';
import { extractRepoName, useCloneMode, usePickMode } from './modes';
import { UntrustedRepositoryNotice } from './untrusted-repository-notice';
import { useProjectName } from './use-project-name';

export type Mode = 'pick' | 'clone';

export interface AddProjectModalProps {
  mode?: Mode;
}

export const AddProjectModal = observer(function AddProjectModal({
  mode: modeProp,
}: AddProjectModalProps) {
  const modal = useModalController('addProjectModal');
  const [mode, setMode] = useState<Mode>(modeProp === 'clone' ? 'clone' : 'pick');
  const [submitState, setSubmitState] = useState<'idle' | 'creating'>('idle');
  const { navigate } = useNavigate();

  const openProjectConfigImportModal = useOpenModal('projectConfigImportModal');
  const openConfirmAction = useOpenModal('confirmActionModal');

  const maybeShowProjectConfigImportPrompt = async (projectId: string) => {
    const projectManager = getProjectManagerStore();
    await projectManager.hydrateProjectContext(projectId).catch((error) => {
      log.error(error);
    });

    const settingsStore = getProjectSettingsStore(projectId);
    if (!settingsStore) return;

    await settingsStore.load();
    if (!settingsStore.shouldPromptConfigMigration) return;

    const migrations = settingsStore.configMigrations ?? [];
    if (migrations.length === 0) return;

    const outcome = await openProjectConfigImportModal({
      migrations,
      migrateProjectConfig: (request) => settingsStore.migrateProjectConfig(request),
    });
    if (outcome.success) {
      toast(`${outcome.data.migration.label}配置已导入`, {
        description: `${outcome.data.migration.files.join(', ')}已成功导入。`,
      });
    }
  };

  const defaultRepositoriesRootQuery = useQuery({
    queryKey: ['projectDefaultRepositoriesRoot'],
    queryFn: async () => {
      const result = await (
        await getProjectsWireClient()
      ).getDefaultRepositoriesRoot({ type: 'local' });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: mode === 'clone',
  });
  const defaultPath = defaultRepositoriesRootQuery.data ?? '';

  const pickState = usePickMode();
  const cloneState = useCloneMode(defaultPath);
  const generatedProjectName = useMemo(() => {
    switch (mode) {
      case 'pick':
        return basenameFromAnyPath(pickState.path);
      case 'clone':
        return extractRepoName(cloneState.repositoryUrl);
    }
  }, [cloneState.repositoryUrl, mode, pickState.path]);
  const projectName = useProjectName(generatedProjectName);

  const activeMode = { pick: pickState, clone: cloneState }[mode];
  const shouldCheckPickPathStatus = mode === 'pick' && pickState.path.trim().length > 0;
  const pickPathStatusQuery = useQuery({
    queryKey: ['projectPathStatus', pickState.path],
    queryFn: async () =>
      (await getProjectsWireClient()).inspectProjectPath({ type: 'local', path: pickState.path }),
    enabled: shouldCheckPickPathStatus,
  });
  const pickPathInspectionError = mode === 'pick' ? pickPathStatusQuery.data?.error : undefined;
  const requiresGitInitialization =
    mode === 'pick' &&
    pickPathStatusQuery.data?.isDirectory === true &&
    !pickPathStatusQuery.data.error &&
    pickPathStatusQuery.data.isGitRepo === false;
  const isCheckingPickPathStatus = shouldCheckPickPathStatus && pickPathStatusQuery.isPending;

  const renderUntrustedRepositoryNotice = () => {
    if (pickPathInspectionError?.type !== 'inspect-failed') return undefined;
    const { path, dubiousOwnership } = pickPathInspectionError;
    if (!dubiousOwnership) return undefined;
    return (
      <UntrustedRepositoryNotice
        dubiousOwnership={dubiousOwnership}
        confirm={async (confirmation) => (await openConfirmAction(confirmation)).success}
        trust={async () =>
          (await getProjectsWireClient()).trustRepository({
            host: { type: 'local' },
            path,
            safeDirectory: dubiousOwnership.safeDirectory,
          })
        }
        onTrusted={() => pickPathStatusQuery.refetch()}
      />
    );
  };

  const canSubmit =
    activeMode.isValid &&
    projectName.effectiveName.length > 0 &&
    !isCheckingPickPathStatus &&
    !pickPathInspectionError &&
    submitState === 'idle';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitState('creating');
    modal.setCloseGuard(true);

    const id = crypto.randomUUID();
    let data: ProjectCreationModeData;
    switch (mode) {
      case 'pick':
        data = {
          mode: 'pick',
          name: projectName.effectiveName,
          path: pickState.path,
          initGitRepository: pickState.initGitRepository,
        };
        break;
      case 'clone':
        data = {
          mode: 'clone',
          name: projectName.effectiveName,
          path: cloneState.path,
          repositoryUrl: cloneState.repositoryUrl,
        };
        break;
    }

    try {
      const result = await getProjectManagerStore().startProjectCreation({ type: 'local' }, data, {
        id,
      });
      modal.setCloseGuard(false);

      if (result.kind === 'existing') {
        setSubmitState('idle');
        modal.dismiss();
        navigate(projectViewDef({ projectId: result.projectId }));
        return;
      }

      void result.completion
        .then((completion) => {
          if (completion.success) {
            void maybeShowProjectConfigImportPrompt(result.projectId);
            return;
          }
          log.error(completion.error);
        })
        .catch((error) => {
          log.error(error);
        });
      setSubmitState('idle');
      modal.dismiss();
      navigate(projectViewDef({ projectId: result.projectId }));
    } catch (error) {
      log.error(error);
      modal.setCloseGuard(false);
      setSubmitState('idle');
      toast.error('无法检查项目', { description: String(error) });
    }
  };

  return (
    <ModalLayout
      header={
        <Dialog.Header showCloseButton={submitState === 'idle'}>
          <Dialog.Title>添加项目</Dialog.Title>
        </Dialog.Header>
      }
      footer={
        <Dialog.Footer>
          <ConfirmButton
            variant="primary"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {submitState === 'creating' ? '正在创建…' : '创建'}
          </ConfirmButton>
        </Dialog.Footer>
      }
    >
      <Dialog.Body className="gap-4">
        {/* Initial-focus target: keeps the modal from auto-focusing the first input. */}
        <div data-autofocus tabIndex={-1} className="flex flex-col gap-4 outline-none">
          <div className="flex items-center gap-2">
            <Input
              bare
              autoFocus
              value={projectName.name}
              placeholder={projectName.placeholder}
              className="min-w-0 flex-1 px-0 text-lg!"
              onChange={(e) => projectName.handleNameChange(e.target.value)}
            />
          </div>
          <div className="flex w-full gap-2">
            <ModeCard
              mode="pick"
              selected={mode === 'pick'}
              icon={<FolderOpenIcon className="size-3" />}
              label="选择目录"
              onSelect={setMode}
            />
            <ModeCard
              mode="clone"
              selected={mode === 'clone'}
              icon={<DownloadIcon className="size-2" />}
              label="克隆仓库"
              onSelect={setMode}
            />
          </div>
          {mode === 'pick' && (
            <PickExistingPanel
              state={pickState}
              inspectionError={pickPathInspectionError?.message}
              untrustedRepositoryNotice={renderUntrustedRepositoryNotice()}
              showInitializeGitPrompt={requiresGitInitialization}
            />
          )}
          {mode === 'clone' && <ClonePanel state={cloneState} />}
        </div>
      </Dialog.Body>
    </ModalLayout>
  );
});

export const addProjectModal = defineModal<void>()({
  id: 'addProjectModal',
  component: AddProjectModal,
});

function ModeCard({
  mode,
  selected,
  icon,
  label,
  onSelect,
}: {
  mode: Mode;
  selected: boolean;
  icon: ReactNode;
  label: string;
  onSelect: (mode: Mode) => void;
}) {
  return (
    <SelectableCard
      padding="2"
      borderRadius="md"
      className="flex-1"
      selected={selected}
      onClick={() => onSelect(mode)}
    >
      <span className="flex w-full items-center justify-center gap-2">
        {icon}
        <span className="text-xs">{label}</span>
      </span>
    </SelectableCard>
  );
}
