import { SettingsCard, SettingsSection } from '@ply/ui/react/patterns';
import {
  Button,
  DropdownMenu,
  Input,
  Select,
  SeparatedList,
  Switch,
  toast,
} from '@ply/ui/react/primitives';
import { Check, ChevronDown, Ellipsis, Eraser, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { browserControlsRegistry } from '@core/features/browser/api/browser/browser-controls-registry';
import { browserSessionStore } from '@core/features/browser/api/browser/browser-session-store';
import { getBrowserClient } from '@core/features/browser/api/browser/client';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import {
  BROWSER_ISOLATED_PROFILE_ID,
  DEFAULT_BROWSER_PROFILE_ID,
  DEFAULT_BROWSER_PROFILES,
  browserProfileLabel,
  isNamedBrowserProfileId,
  normalizeBrowserProfileSelection,
  type BrowserProfile,
  type BrowsingDataKind,
} from '@core/primitives/browser/api';
import { cn } from '@core/primitives/styling/browser/cn';
import { SettingRow } from './SettingRow';

export function BrowserSettingsCard() {
  const {
    value: browserSettings,
    update,
    updateAsync,
    isLoading,
    isSaving,
  } = useAppSettingsKey('browser');
  const openConfirm = useOpenModal('confirmActionModal');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBrowsingDataExpanded, setIsBrowsingDataExpanded] = useState(false);
  const [isClearingBrowsingData, setIsClearingBrowsingData] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const profiles = browserSettings?.profiles ?? DEFAULT_BROWSER_PROFILES;
  const selectedDefault = normalizeBrowserProfileSelection(
    browserSettings?.defaultProfileId,
    profiles
  );
  const disabled = isLoading || isSaving;

  const addProfile = (name: string) => {
    setIsAdding(false);
    const nextName = name.trim();
    if (!nextName) return;
    const profile: BrowserProfile = { id: makeProfileId(nextName, profiles), name: nextName };
    update({ profiles: [...profiles, profile] });
  };

  const renameProfile = (profileId: string, name: string) => {
    setEditingProfileId(null);
    const nextName = name.trim();
    if (!nextName) return;
    update({
      profiles: profiles.map((profile) =>
        profile.id === profileId ? { ...profile, name: nextName } : profile
      ),
    });
  };

  const clearProfileStorage = (profile: BrowserProfile) => {
    void openConfirm({
      title: `清除「${profile.name}」的浏览器存储？`,
      description:
        '将清除该配置的 Cookie、本地存储、IndexedDB 和缓存。使用此配置的标签页将退出网站登录。',
      confirmLabel: '清除存储',
      variant: 'destructive',
    }).then((outcome) => {
      if (outcome.success) void clearProfileStorageAndReload(profile.id);
    });
  };

  const runClearBrowsingData = async (kind: BrowsingDataKind, label: string) => {
    setIsClearingBrowsingData(true);
    try {
      const result = await (await getBrowserClient()).clearBrowsingData({ kind });
      if (!result.success) {
        toast.error('无法清除浏览数据', {
          description: '请重试或手动重新加载浏览器视图。',
        });
        return;
      }
      reloadAllBrowserSessions();
      toast(`${label} cleared`);
    } catch (error) {
      toast.error('无法清除浏览数据', { description: errorMessage(error) });
    } finally {
      setIsClearingBrowsingData(false);
    }
  };

  const clearBrowsingData = (kind: BrowsingDataKind, label: string) => {
    void openConfirm({
      ...BROWSING_DATA_CONFIRMATIONS[kind],
      variant: 'destructive',
    }).then((outcome) => {
      if (outcome.success) void runClearBrowsingData(kind, label);
    });
  };

  const deleteProfile = (profile: BrowserProfile) => {
    if (profiles.length <= 1) return;
    void openConfirm({
      title: `删除浏览器配置「${profile.name}」？`,
      description: '将移除此配置，并清除相关 Cookie、本地存储、IndexedDB 和缓存。',
      confirmLabel: '删除配置',
      variant: 'destructive',
    }).then((outcome) => {
      if (!outcome.success) return;
      const nextProfiles = profiles.filter((candidate) => candidate.id !== profile.id);
      const replacementProfileId =
        selectedDefault === profile.id
          ? (nextProfiles[0]?.id ?? DEFAULT_BROWSER_PROFILE_ID)
          : selectedDefault;
      void deleteProfileAfterStorageClear({
        deletedProfileId: profile.id,
        replacementProfileId,
        nextProfiles,
        updateAsync,
      });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <SettingsCard>
        <SeparatedList gap="1rem" direction="column">
          <SettingRow
            title="默认浏览器配置"
            description="新浏览器标签页使用此配置。可通过标签页工具栏菜单切换配置。"
            control={
              <Select.Root
                value={selectedDefault}
                onValueChange={(next) => {
                  if (next) update({ defaultProfileId: next });
                }}
                disabled={disabled}
              >
                <Select.Trigger className="w-[190px] shrink-0 gap-2">
                  <Select.Value>{browserProfileLabel(selectedDefault, profiles)}</Select.Value>
                </Select.Trigger>
                <Select.Content align="end">
                  {profiles.map((profile) => (
                    <Select.Item key={profile.id} value={profile.id}>
                      {profile.name}
                    </Select.Item>
                  ))}
                  <Select.Item value={BROWSER_ISOLATED_PROFILE_ID}>按任务隔离</Select.Item>
                </Select.Content>
              </Select.Root>
            }
          />

          <SettingRow
            title="关闭 localhost 的 CORS 限制"
            description="允许 ply 浏览器中的 localhost 页面访问缺少匹配 CORS 响应头的 API。"
            control={
              <Switch
                checked={browserSettings?.relaxCorsForLocalhost ?? false}
                disabled={disabled}
                onCheckedChange={(next) => update({ relaxCorsForLocalhost: next })}
              />
            }
          />
        </SeparatedList>
      </SettingsCard>

      <SettingsSection title="浏览器配置" bare>
        <SettingsCard>
          <div className="text-xs text-foreground-passive">
            每个配置独立保存 Cookie 和登录状态，可跨任务使用。 Profiles do not import anything from
            your system browser.
          </div>

          <div className="mt-2 flex flex-col divide-y divide-border/40">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex h-9 items-center gap-2">
                {editingProfileId === profile.id ? (
                  <>
                    <Input
                      ref={renameInputRef}
                      autoFocus
                      defaultValue={profile.name}
                      disabled={disabled}
                      aria-label={`重命名浏览器配置「${profile.name}」`}
                      className="h-7 min-w-0 flex-1"
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter')
                          renameProfile(profile.id, event.currentTarget.value);
                        if (event.key === 'Escape') setEditingProfileId(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      icon
                      className="size-7 shrink-0 text-foreground-muted"
                      disabled={disabled}
                      aria-label={`保存浏览器配置「${profile.name}」的名称`}
                      onClick={() => renameProfile(profile.id, renameInputRef.current?.value ?? '')}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      icon
                      className="size-7 shrink-0 text-foreground-muted"
                      disabled={disabled}
                      aria-label={`取消重命名浏览器配置「${profile.name}」`}
                      onClick={() => setEditingProfileId(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {profile.name}
                    </span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            icon
                            className="size-7 shrink-0 text-foreground-muted"
                            disabled={disabled}
                            aria-label={`浏览器配置「${profile.name}」的操作`}
                          />
                        }
                      >
                        <Ellipsis className="size-4" />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content
                        align="end"
                        className="min-w-40"
                        finalFocus={renameInputRef}
                      >
                        <DropdownMenu.Item onClick={() => setEditingProfileId(profile.id)}>
                          <Pencil className="size-4" />
                          重命名
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={() => clearProfileStorage(profile)}>
                          <Eraser className="size-4" />
                          清除存储
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          variant="destructive"
                          disabled={profiles.length <= 1}
                          onClick={() => deleteProfile(profile)}
                        >
                          <Trash2 className="size-4" />
                          删除
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex h-7 items-center">
            {isAdding ? (
              <div className="flex w-full items-center gap-2">
                <Input
                  ref={addInputRef}
                  autoFocus
                  disabled={disabled}
                  placeholder="配置名称"
                  aria-label="新浏览器配置名称"
                  className="h-7 min-w-0 flex-1"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addProfile(event.currentTarget.value);
                    if (event.key === 'Escape') setIsAdding(false);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  className="size-7 shrink-0 text-foreground-muted"
                  disabled={disabled}
                  aria-label="保存新浏览器配置"
                  onClick={() => addProfile(addInputRef.current?.value ?? '')}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  className="size-7 shrink-0 text-foreground-muted"
                  disabled={disabled}
                  aria-label="取消添加配置"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-foreground-muted"
                disabled={disabled}
                onClick={() => setIsAdding(true)}
              >
                <Plus className="size-4" />
                添加配置
              </Button>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="浏览数据" bare>
        <SettingsCard>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
              <div className="text-xs text-foreground-passive">
                清除内置浏览器的 Cookie、缓存文件和网站数据。
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-foreground-muted"
                disabled={disabled || isClearingBrowsingData}
                onClick={() => clearBrowsingData('all', '全部浏览数据')}
              >
                清除全部浏览数据
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon
                className="shrink-0 text-foreground-muted"
                aria-expanded={isBrowsingDataExpanded}
                aria-label={
                  isBrowsingDataExpanded ? '隐藏分项浏览数据选项' : '显示分项浏览数据选项'
                }
                onClick={() => setIsBrowsingDataExpanded((expanded) => !expanded)}
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    isBrowsingDataExpanded && 'rotate-180'
                  )}
                />
              </Button>
            </div>
          </div>

          {isBrowsingDataExpanded && (
            <div className="mt-2 flex flex-col divide-y divide-border/40">
              {BROWSING_DATA_CATEGORIES.map((category) => (
                <div key={category.kind} className="flex h-9 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {category.label}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-foreground-muted"
                    disabled={disabled || isClearingBrowsingData}
                    onClick={() => clearBrowsingData(category.kind, category.label)}
                  >
                    {category.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}

const BROWSING_DATA_CATEGORIES: ReadonlyArray<{
  kind: Exclude<BrowsingDataKind, 'all'>;
  label: string;
  actionLabel: string;
}> = [
  { kind: 'cookies', label: 'Cookies', actionLabel: '删除 Cookie' },
  { kind: 'siteData', label: '网站数据', actionLabel: '删除网站数据' },
  {
    kind: 'cache',
    label: '缓存的图片和文件',
    actionLabel: '删除缓存的图片和文件',
  },
];

const BROWSING_DATA_CONFIRMATIONS: Record<
  BrowsingDataKind,
  { title: string; description: string; confirmLabel: string }
> = {
  all: {
    title: '清除全部浏览数据?',
    description:
      '将删除内置浏览器所有配置的 Cookie、缓存文件和网站数据。打开的标签页将退出网站登录。',
    confirmLabel: '清除全部数据',
  },
  cookies: {
    title: '删除 Cookie?',
    description: '将删除内置浏览器所有配置的 Cookie。打开的标签页将退出网站登录。',
    confirmLabel: '删除 Cookie',
  },
  siteData: {
    title: '删除网站数据?',
    description:
      '将删除内置浏览器所有配置的本地存储、IndexedDB、Service Worker 和其他网站数据。打开的标签页可能会退出网站登录。',
    confirmLabel: '删除网站数据',
  },
  cache: {
    title: '删除缓存的图片和文件?',
    description: '将删除内置浏览器所有配置中缓存的图片和文件。下次打开页面时，加载速度可能降低。',
    confirmLabel: '删除缓存文件',
  },
};

function reloadAllBrowserSessions(): void {
  for (const session of browserSessionStore.activeSessions) {
    browserControlsRegistry.get(session.browserId)?.adapter?.reload();
  }
}

async function clearProfileStorageAndReload(profileId: string): Promise<void> {
  try {
    const result = await (await getBrowserClient()).clearProfileStorage({ profileId });
    if (!result.success) {
      toast.error('无法清除浏览器存储', {
        description: '浏览器配置已不存在，或无法清除。',
      });
      return;
    }
    reloadBrowserSessionsForProfile(profileId);
  } catch (error) {
    toast.error('无法清除浏览器存储', { description: errorMessage(error) });
  }
}

async function deleteProfileAfterStorageClear({
  deletedProfileId,
  replacementProfileId,
  nextProfiles,
  updateAsync,
}: {
  deletedProfileId: string;
  replacementProfileId: string;
  nextProfiles: BrowserProfile[];
  updateAsync: (partial: { profiles: BrowserProfile[]; defaultProfileId: string }) => Promise<void>;
}): Promise<void> {
  let storageCleared = false;
  try {
    const clearResult = await (
      await getBrowserClient()
    ).clearProfileStorage({
      profileId: deletedProfileId,
    });
    if (!clearResult.success) {
      toast.error('无法删除浏览器配置', {
        description: '无法清除配置的存储，已保留此配置。',
      });
      return;
    }

    storageCleared = true;
    await updateAsync({
      profiles: nextProfiles,
      defaultProfileId: replacementProfileId,
    });
    browserSessionStore.migrateProfileSessions(
      deletedProfileId,
      replacementProfileId,
      nextProfiles
    );
  } catch (error) {
    if (storageCleared) reloadBrowserSessionsForProfile(deletedProfileId);
    toast.error('无法删除浏览器配置', {
      description: storageCleared
        ? `Storage was cleared, but the profile is still listed. ${errorMessage(error)}`
        : errorMessage(error),
    });
  }
}

function reloadBrowserSessionsForProfile(profileId: string): void {
  for (const session of browserSessionStore.activeSessions) {
    if (session.profileId !== profileId) continue;
    browserControlsRegistry.get(session.browserId)?.adapter?.reload();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeProfileId(name: string, profiles: readonly BrowserProfile[]): string {
  const existingIds = new Set(profiles.map((profile) => profile.id));
  const base = slugifyProfileName(name) || 'profile';
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate) || !isNamedBrowserProfileId(candidate)) {
    const suffixText = String(suffix);
    const prefixLength = Math.max(1, 63 - suffixText.length);
    candidate = `${base.slice(0, prefixLength)}-${suffixText}`;
    suffix += 1;
  }
  return candidate;
}

function slugifyProfileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
}
