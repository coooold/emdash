import type { GitBranchRef, GitRemote } from '@emdash/core/runtimes/git/api';
import { deriveWorktreePoolPath } from '@emdash/core/runtimes/workspace-registry/api';
import { Button, Field, Input, Select, Separator, Switch } from '@emdash/ui/react/primitives';
import { Folder } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState, type ReactNode } from 'react';
import {
  resolveRendererEffectiveSettings,
  useEffectiveSettingsInputs,
} from '@core/features/projects/api/browser/effective-settings/use-effective-settings';
import {
  getProjectStore,
  projectData,
} from '@core/features/projects/api/browser/stores/project-selectors';
import {
  BrokenSettingNotice,
  ProvenanceBadge,
  ProvenanceSourceLine,
  ResetProvenanceButton,
} from '@core/features/projects/contributions/browser/settings-provenance';
import type { ProvenanceFlavor } from '@core/features/projects/contributions/browser/settings-provenance-labels';
import { ProjectBranchSelector } from '@core/features/source-control/contributions/browser/project-branch-selector';
import { RemoteSelector } from '@core/features/source-control/contributions/browser/remote-selector';
import { getHostClient } from '@core/primitives/desktop-host/browser/host-client';
import { detectPlatformContext } from '@core/primitives/keybindings/api';
import type {
  AgentGitCredentialsSetting,
  Provenance,
  Resolved,
} from '@core/primitives/project-settings/api';
import { formatDefaultBranch, resolveTmux } from '@core/primitives/project-settings/api';
import { cn } from '@core/primitives/styling/browser/cn';
import type { ProjectPlacementDomainSnapshot } from '../../../../api/project-settings-page';
import {
  formToStoredGitSettings,
  storedDefaultBranchToBranchRef,
  type FormUpdate,
  type GitIdentityFormState,
  type PlacementFormState,
} from '../project-settings-form-model';

const AGENT_GIT_CREDENTIALS_OPTIONS: { value: AgentGitCredentialsSetting; label: string }[] = [
  { value: 'system', label: '系统凭据' },
  { value: 'none', label: '不使用' },
];

type BaseProjectSettingsSectionProps = {
  projectId: string;
  gitIdentityForm: GitIdentityFormState;
  placementForm: PlacementFormState;
  placement: ProjectPlacementDomainSnapshot;
  remotes: GitRemote[];
  worktreeDirectoryError: string | null;
  updateGitIdentity: FormUpdate<GitIdentityFormState>;
  updatePlacement: FormUpdate<PlacementFormState>;
  hostActionReason: string | null;
  hostObservationKind: 'fresh' | 'stale' | 'unavailable';
};

/**
 * Per-field provenance treatment (spec: github-git-settings §9, prototype
 * Variant A): label + badge + reset affordance, source line for inferred
 * values, broken-setting warning below the label row. Provenance is resolved
 * over the *pending* form state so edits preview exactly what a save would
 * resolve to.
 */
function ProvenanceField({
  label,
  description,
  resolved,
  flavor = 'inferred',
  isExplicit,
  onReset,
  children,
}: {
  label: string;
  description: string;
  resolved: Resolved<unknown> | null;
  flavor?: ProvenanceFlavor;
  /** Whether the form currently holds an explicit value (shows the reset affordance). */
  isExplicit: boolean;
  onReset: () => void;
  children: ReactNode;
}) {
  const provenance: Provenance | null = resolved?.provenance ?? null;
  return (
    <Field.Root>
      <div className="flex items-center gap-2">
        <Field.Label>{label}</Field.Label>
        {provenance ? <ProvenanceBadge provenance={provenance} flavor={flavor} /> : null}
        {provenance && isExplicit ? (
          <ResetProvenanceButton flavor={flavor} onReset={onReset} />
        ) : null}
      </div>
      <Field.Description className="text-foreground-muted">{description}</Field.Description>
      {provenance?.kind === 'broken-setting' ? (
        <BrokenSettingNotice
          staleValue={provenance.staleValue}
          effectiveValue={brokenFallbackDisplay(resolved)}
        />
      ) : null}
      {children}
      {provenance ? <ProvenanceSourceLine provenance={provenance} /> : null}
    </Field.Root>
  );
}

function brokenFallbackDisplay(resolved: Resolved<unknown> | null): string | null {
  const value = resolved?.value ?? null;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'branch' in value) {
    return formatDefaultBranch(value as { remote: string | null; branch: string });
  }
  return String(value);
}

export const BaseProjectSettingsSection = observer(function BaseProjectSettingsSection({
  projectId,
  gitIdentityForm,
  placementForm,
  placement,
  remotes,
  worktreeDirectoryError,
  updateGitIdentity,
  updatePlacement,
  hostActionReason,
  hostObservationKind,
}: BaseProjectSettingsSectionProps) {
  const inputs = useEffectiveSettingsInputs(projectId);
  const effective = inputs
    ? resolveRendererEffectiveSettings(
        inputs,
        formToStoredGitSettings({ gitIdentity: gitIdentityForm, placement: placementForm })
      )
    : null;
  const [isBrowsingWorktreeDirectory, setIsBrowsingWorktreeDirectory] = useState(false);

  const inheritedWorktreeRoot =
    placement.layers.hostWorktreeRoot ?? placement.layers.builtInWorktreeRoot;
  const projectPath = projectData(getProjectStore(projectId))?.path ?? null;
  const effectiveWorktreeRoot = effective?.worktreeRoot.value ?? null;
  const effectiveTmux = resolveTmux({
    projectTmux: placementForm.tmux,
    hostTmux: placement.layers.hostTmux,
    appDefaultTmux: placement.layers.appDefaultTmux,
  });
  const tmuxSupported = detectPlatformContext().os !== 'windows';
  const derivedPoolPath =
    projectPath !== null && effectiveWorktreeRoot !== null
      ? deriveWorktreePoolPath({ worktreeRoot: effectiveWorktreeRoot, repoPath: projectPath })
      : null;

  const handleBrowseWorktreeDirectory = async () => {
    if (isBrowsingWorktreeDirectory) return;

    setIsBrowsingWorktreeDirectory(true);
    try {
      const result = await (
        await getHostClient()
      ).openSelectDirectoryDialog({
        title: '选择工作树根目录',
        message: '选择用于创建工作树的目录。',
        defaultPath:
          placementForm.worktreeDirectory || (effectiveWorktreeRoot ?? inheritedWorktreeRoot),
      });
      if (result) {
        updatePlacement('worktreeDirectory', result);
      }
    } finally {
      setIsBrowsingWorktreeDirectory(false);
    }
  };

  const effectiveDefaultBranchRef = storedDefaultBranchToBranchRef(
    effective?.defaultBranch.value ?? undefined,
    remotes
  );

  return (
    <>
      {hostObservationKind === 'unavailable' ? (
        <Field.Root>
          <Field.Label>工作树根目录</Field.Label>
          <Field.Description className="text-foreground-muted">
            本地运行环境就绪后，才能设置工作树位置。
          </Field.Description>
        </Field.Root>
      ) : (
        <>
          <fieldset disabled={hostActionReason !== null} className="contents">
            <ProvenanceField
              label="工作树根目录"
              description="任务的 Git 工作树将创建在此目录。"
              resolved={hostActionReason ? null : (effective?.worktreeRoot ?? null)}
              flavor="inherited"
              isExplicit={placementForm.worktreeDirectory.trim() !== ''}
              onReset={() => updatePlacement('worktreeDirectory', '')}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    aria-invalid={worktreeDirectoryError ? true : undefined}
                    className={cn(worktreeDirectoryError ? 'pr-44' : undefined)}
                    placeholder={effectiveWorktreeRoot ?? inheritedWorktreeRoot}
                    value={placementForm.worktreeDirectory}
                    onChange={(e) => updatePlacement('worktreeDirectory', e.target.value)}
                  />
                  {worktreeDirectoryError ? (
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-foreground-error">
                      {worktreeDirectoryError}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBrowsingWorktreeDirectory}
                  onClick={handleBrowseWorktreeDirectory}
                >
                  <Folder data-icon="inline-start" className="size-4" />
                  浏览
                </Button>
              </div>
              {derivedPoolPath ? (
                <span className="text-xs text-foreground-muted">
                  此仓库的工作树目录：
                  <code className="font-mono break-all">{derivedPoolPath}</code>
                </span>
              ) : null}
            </ProvenanceField>
          </fieldset>
          {hostActionReason ? (
            <p role="status" className="text-xs text-foreground-muted">
              {hostActionReason}
            </p>
          ) : null}
        </>
      )}

      <Separator />

      <ProvenanceField
        label="默认分支"
        description="新任务默认基于此分支创建。"
        resolved={effective?.defaultBranch ?? null}
        isExplicit={gitIdentityForm.defaultBranch !== null}
        onReset={() => updateGitIdentity('defaultBranch', null)}
      >
        <ProjectBranchSelector
          projectId={projectId}
          value={gitIdentityForm.defaultBranch ?? effectiveDefaultBranchRef ?? undefined}
          onValueChange={(branch: GitBranchRef) => updateGitIdentity('defaultBranch', branch)}
        />
      </ProvenanceField>

      <Separator />

      <ProvenanceField
        label="基准远程仓库"
        description="用于获取远程分支和选择任务的基准分支。"
        resolved={effective?.baseRemote ?? null}
        isExplicit={gitIdentityForm.baseRemote.trim() !== ''}
        onReset={() => updateGitIdentity('baseRemote', '')}
      >
        <RemoteSelector
          remotes={remotes}
          value={gitIdentityForm.baseRemote || (effective?.baseRemote.value ?? '')}
          onValueChange={(value) => updateGitIdentity('baseRemote', value)}
          className="w-full"
        />
      </ProvenanceField>

      <Separator />

      <ProvenanceField
        label="推送目标"
        description="用于发布任务分支和推送提交。"
        resolved={effective?.pushRemote ?? null}
        isExplicit={gitIdentityForm.pushRemote.trim() !== ''}
        onReset={() => updateGitIdentity('pushRemote', '')}
      >
        <RemoteSelector
          remotes={remotes}
          value={gitIdentityForm.pushRemote || (effective?.pushRemote.value ?? '')}
          onValueChange={(value) => updateGitIdentity('pushRemote', value)}
          className="w-full"
        />
      </ProvenanceField>

      <Separator />

      <Field.Root>
        <Field.Label>Git 凭据</Field.Label>
        <Field.Description className="text-foreground-muted">
          选择代理和终端会话是否使用本机的 Git 凭据。
        </Field.Description>
        <Select.Root
          value={gitIdentityForm.agentGitCredentials === 'none' ? 'none' : 'system'}
          onValueChange={(value) => {
            if (!value) return;
            updateGitIdentity('agentGitCredentials', value as AgentGitCredentialsSetting);
          }}
        >
          <Select.Trigger className="w-full min-w-0">
            {AGENT_GIT_CREDENTIALS_OPTIONS.find(
              (option) => option.value === gitIdentityForm.agentGitCredentials
            )?.label ?? '系统凭据'}
          </Select.Trigger>
          <Select.Content align="start" alignItemWithTrigger={false} sideOffset={6}>
            {AGENT_GIT_CREDENTIALS_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Field.Root>

      <Separator />

      <Field.Root orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Field.Label>启用 tmux</Field.Label>
            {tmuxSupported &&
            (hostObservationKind !== 'unavailable' || placementForm.tmux !== undefined) ? (
              <ProvenanceBadge provenance={effectiveTmux.provenance} flavor="inherited" />
            ) : null}
            {tmuxSupported && placementForm.tmux !== undefined ? (
              <ResetProvenanceButton
                flavor="inherited"
                onReset={() => updatePlacement('tmux', undefined)}
              />
            ) : null}
          </div>
          <Field.Description className="text-foreground-muted">
            {!tmuxSupported
              ? 'Windows 本地会话不支持 tmux，已保存的偏好仍会保留。'
              : hostObservationKind === 'unavailable' && placementForm.tmux === undefined
                ? '无法读取继承的 tmux 设置。可以为此项目指定设置。'
                : '在 tmux 中运行代理会话。'}
          </Field.Description>
        </div>
        <Switch
          checked={
            !tmuxSupported
              ? false
              : hostObservationKind === 'unavailable'
                ? (placementForm.tmux ?? false)
                : effectiveTmux.value
          }
          disabled={!tmuxSupported}
          onCheckedChange={(checked) => updatePlacement('tmux', checked)}
        />
      </Field.Root>
    </>
  );
});
