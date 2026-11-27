import {
  hostRefEquals,
  LOCAL_HOST_REF,
  parseHostRef,
  type HostRef,
} from '@emdash/core/primitives/host/api';
import { getPluginMetadata } from '@core/features/agents/api/node/plugin-registry';
import { AutomationsService } from '@core/features/automations/api/node/automations-service';
import { buildAutomationDeployment } from '@core/features/automations/node/deployment-builder';
import { getProviderSettingsService } from '@core/features/conversations/node/provider-settings-service';
import { createConversationDeletionSweepKind } from '@core/features/conversations/node/sweep/conversation-deletion-sweep';
import { ConversationBackfillService } from '@core/features/conversations/node/sync/conversation-backfill';
import { ConversationSyncService } from '@core/features/conversations/node/sync/conversation-sync-service';
import { TuiConversationProvider } from '@core/features/conversations/node/tui-conversation-provider';
import type { GitCredentialsService } from '@core/features/github/api/node/services/git-credentials-service';
import {
  createPromptLibraryService,
  type PromptLibraryKV,
} from '@core/features/library/node/prompt-library-service';
import { previewServerService } from '@core/features/preview-servers/api/node/preview-server-service-instance';
import { PreviewServerAccessService } from '@core/features/preview-servers/node/preview-server-access-service';
import type { ProjectAttachmentManager } from '@core/features/projects/api/node/project-attachment-manager';
import { projectEvents } from '@core/features/projects/api/node/project-events';
import { loadStoredGitSettings } from '@core/features/projects/api/node/settings/effective-settings';
import { ProjectSettingsService } from '@core/features/projects/api/node/settings/project-settings-service';
import type { ProjectDeletionDependencies } from '@core/features/projects/node/operations/deleteProject';
import {
  getProjectById,
  getProjectByPath,
} from '@core/features/projects/node/operations/getProjects';
import { createProjectAttachmentAdapter } from '@core/features/projects/node/project-attachment-adapter';
import { createProjectAttachmentManager } from '@core/features/projects/node/project-attachment-manager';
import { migrateAppWorktreeRootToLocalHostDefault } from '@core/features/projects/node/settings/migrations/app-worktree-root';
import { createSearchService } from '@core/features/search/node/search-service';
import { TaskService } from '@core/features/tasks/api/node/task-service';
import type { TaskSessionCleanup } from '@core/features/tasks/api/node/task-session-cleanup';
import { TaskSessionLaunchContextResolver } from '@core/features/tasks/api/node/task-session-launch-context';
import { TaskSessionManager } from '@core/features/tasks/api/node/task-session-manager';
import { desktopHostEvents } from '@core/features/workbench/node/event-host';
import {
  createWorkspaceLifecycleParticipants,
  deactivateWorkspaceParticipants,
} from '@core/features/workspaces/api/node/lifecycle-participants';
import { WorkspacePlacementResolver } from '@core/features/workspaces/api/node/placement/workspace-placement-resolver';
import { WorkspaceCreations } from '@core/features/workspaces/api/node/registry-verbs';
import { acquireWorkspaceRuntime } from '@core/features/workspaces/api/node/runtime-access';
import type { TaskProviderOpts } from '@core/features/workspaces/api/node/workspace-factory';
import { createWorkspaceDeletionSweepKind } from '@core/features/workspaces/node/sweep/workspace-deletion-sweep';
import { WorkspaceRegistryBackfillService } from '@core/features/workspaces/node/sync/workspace-registry-backfill';
import { WorkspaceRegistrySyncService } from '@core/features/workspaces/node/sync/workspace-registry-sync-service';
import { startPeriodicSweep } from '@core/primitives/periodic-sweep/node/periodic-sweep';
import type { HostReachabilityProbe } from '@core/primitives/ssh/api';
import { AppDbKeyValueStore } from '@core/services/app-db/node/key-value-store';
import { createNotificationService } from '@core/services/notifications/node';
import { ReconcileSweepService } from '@core/services/reconcile-sweep/node/reconcile-sweep-service';
import {
  createReconcileSweepTriggers,
  installReconcileSweepTriggers,
} from '@core/services/reconcile-sweep/node/reconcile-sweep-triggers';
import type { AppSettingsKey } from '@core/services/settings/api';
import { createProviderOverrideSettings } from '@core/services/settings/node/provider-settings-service';
import { agentStatusService } from '@main/core/agent-status/agent-status-service';
import { appService } from '@main/core/app/service';
import {
  createFileSearchRuntime,
  searchFileSearchRoot,
} from '@main/core/file-search/runtime-client';
import { GitRepositoryFetchService } from '@main/core/git/repository/fetch-service';
import { GitRepositoryService } from '@main/core/git/repository/service';
import { ensureAbsoluteDir } from '@main/core/runtime/files-helpers';
import {
  killLifecycleAcpSessions,
  killLifecycleTerminalSessions,
  resolveLifecycleSessionTargets,
  type SessionCleanupDependencies,
} from '@main/core/runtime/operations/session-cleanup';
import { sweepSessionHygiene } from '@main/core/runtime/operations/session-hygiene';
import { createDesktopSessionIntentStores } from '@main/core/runtime/session-intent-stores';
import { getTerminalColorEnv } from '@main/core/terminal-shell/color-env';
import { cleanupLegacyOperationsDatabases } from '@main/db/legacy-operations-cleanup';
import type { DesktopRuntimes } from '@main/gateway/desktop-runtimes';
import { createDesktopWorkspaceRuntimeAcquirer } from '@main/gateway/workspace-runtime';
import { setBrowserCorsRelaxationSettings } from '@main/host/browser/browser-profile-session';
import { browserWebContentsRegistry } from '@main/host/browser/browser-webcontents-registry';
import { HostAttachmentRegistry } from '@main/host/host-attachment-registry';
import { createSystemNotificationSink } from '@main/host/notifications/system-notification-sink';
import { setTrayVisible } from '@main/host/tray';
import { installUpdateNotifications } from '@main/host/updates/update-notifications';
import { applyNativeTheme, isAppFocused } from '@main/host/window';
import { log } from '@main/lib/logger';
import { appScope } from '../../core/app-scope';
import { step } from '../../core/phase';
import { setCoreServiceInstances } from '../../core/service-instances';
import type { DatabaseBundle } from './database';

export type ServicesBundle = {
  readonly automations: AutomationsService;
  readonly gitCredentials: GitCredentialsService;
  readonly hostIsReachable: HostReachabilityProbe;
  readonly hostAttachments: HostAttachmentRegistry;
  readonly notifications: ReturnType<typeof createNotificationService>;
  readonly previewServerAccess: PreviewServerAccessService;
  readonly promptLibrary: ReturnType<typeof createPromptLibraryService>;
  readonly projectDeletion: ProjectDeletionDependencies;
  readonly projects: ProjectAttachmentManager;
  readonly projectSettings: ProjectSettingsService;
  readonly providerSettings: ReturnType<typeof createProviderOverrideSettings>;
  readonly search: ReturnType<typeof createSearchService>;
  readonly sessionLaunchContexts: TaskSessionLaunchContextResolver;
  readonly taskService: TaskService;
  readonly taskSessions: TaskSessionManager;
  readonly workspacePlacement: WorkspacePlacementResolver;
  readonly conversationSync: ConversationSyncService;
  readonly reconcileSweep: ReconcileSweepService;
};

export async function bootServices(
  database: DatabaseBundle,
  desktopRuntimes: DesktopRuntimes
): Promise<ServicesBundle> {
  const { appSettings: appSettingsService, db, sqlite, workspaceIdentity } = database;
  const { clients, broker: runtimes } = desktopRuntimes;
  const getMementosRuntimeClient = async () => clients.mementos;
  const getTerminalsRuntimeClient = async () => clients.terminals;
  const getTuiAgentsRuntimeClient = async () => clients.tuiAgents;
  const fileSearchRuntime = createFileSearchRuntime(runtimes, {
    getSearchExclusions: async () => (await appSettingsService.get('files')).searchExclude,
  });
  const handleFileSearchSettingsChanged = (key: AppSettingsKey) => {
    if (key === 'files') void fileSearchRuntime.refreshExclusions();
  };
  appSettingsService.on('app-settings:changed', handleFileSearchSettingsChanged);
  appScope.add(() => {
    appSettingsService.off('app-settings:changed', handleFileSearchSettingsChanged);
  });
  const providerOverrideSettings = createProviderOverrideSettings(db);
  const workspacePlacement = new WorkspacePlacementResolver({
    broker: runtimes,
    getSettings: () => appSettingsService,
    findProjectByPath: (host, projectPath) => getProjectByPath(db, host, projectPath),
    // Placement is record-only and must not depend on Host attachment.
    getStoredProjectWorktreeRoot: async (projectId) => {
      const stored = await loadStoredGitSettings(db, projectId);
      return stored.worktreeRoot;
    },
  });
  const lifecycleParticipants = createWorkspaceLifecycleParticipants({
    acquireFileSearchRoot: fileSearchRuntime.acquireRoot,
    releaseFileSearchRoot: fileSearchRuntime.releaseRoot,
    stopPreviewServers: (projectId, workspaceId) =>
      previewServerService.stopForWorkspace(projectId, workspaceId),
  });
  const taskSessionManager = new TaskSessionManager({
    db,
    runtimes,
    workspaceIdentity,
    deactivateWorkspaceParticipants: (identity) =>
      deactivateWorkspaceParticipants(lifecycleParticipants, identity),
  });
  const tuiConversationDependencies = {
    db,
    getProviderConfig: (providerId: string) => providerOverrideSettings.getItem(providerId),
    getTaskSettings: () => appSettingsService.get('tasks'),
    getTerminalColorEnv,
    // Late-bound: the git-credentials service is constructed further down in
    // this phase; sessions only call this after boot completes.
    resolveSessionGitCredentials: (params: {
      sessionId: string;
      projectId: string;
      host: HostRef;
    }) => gitCredentials.resolveSessionSpec(params),
  };
  const projectAttachmentAdapter = createProjectAttachmentAdapter({
    db,
    taskSessions: taskSessionManager,
    createGitRepository: (client, repository, resolveEffectiveSettings) =>
      new GitRepositoryService(client, repository, resolveEffectiveSettings),
    createGitRepositoryFetch: (client, repository, getBaseRemote) =>
      new GitRepositoryFetchService(client, repository, getBaseRemote),
    ensureAbsoluteDir: (client, rootPath, absolutePath, options) =>
      ensureAbsoluteDir(async () => client, rootPath, absolutePath, options),
    runtimes,
    getProjectDefaults: async () => ({
      tmuxByDefault: (await appSettingsService.get('project')).tmuxByDefault,
    }),
    migrateAppWorktreeRoot: async () => {
      const local = await runtimes.client(LOCAL_HOST_REF);
      if (!local.success) throw new Error('local host runtime unavailable');
      const hostSettings = local.data.hostSettings;
      await migrateAppWorktreeRootToLocalHostDefault({
        getAppDefaultWorktreeDirectoryOverride: async () => {
          const { overrides } = await appSettingsService.getWithMeta('localProject');
          return Object.hasOwn(overrides, 'defaultWorktreeDirectory')
            ? overrides.defaultWorktreeDirectory
            : undefined;
        },
        clearAppDefaultWorktreeDirectory: () =>
          appSettingsService.resetField('localProject', 'defaultWorktreeDirectory'),
        localHostSettings: {
          getWorktreeRoot: async () => {
            const state = await hostSettings.get();
            return state.success
              ? { success: true, worktreeRoot: state.data.settings.worktreeRoot }
              : { success: false };
          },
          setWorktreeRoot: async (worktreeRoot) => {
            const result = await hostSettings.update({ worktreeRoot });
            return { success: result.success };
          },
        },
      });
    },
  });
  const projectManager = createProjectAttachmentManager({
    scope: appScope,
    availability: desktopRuntimes.hostAvailability,
    adapter: projectAttachmentAdapter,
  });
  const sessionLaunchContexts = new TaskSessionLaunchContextResolver({
    db,
    projects: projectManager,
    runtimes,
    workspaceIdentity,
  });
  const previewServerAccess = new PreviewServerAccessService({
    projects: projectManager,
    previewServers: previewServerService,
  });
  appScope.add(
    projectEvents.on('project:deleted', (projectId) => {
      previewServerAccess.forgetProject(projectId);
    })
  );
  const projectSettingsService = new ProjectSettingsService({
    db,
    projects: projectManager,
    workspaceIdentity,
  });
  const createConversationProvider = (options: TaskProviderOpts) =>
    new TuiConversationProvider(
      {
        projectId: options.projectId,
        taskId: options.taskId,
        taskPath: options.taskPath,
        host: options.host,
        tuiAgents: options.tuiAgents,
        launchContextSource: options.launchContextSource,
      },
      tuiConversationDependencies
    );
  const workspaceCreations = new WorkspaceCreations();
  const sessionCleanupDependencies: SessionCleanupDependencies = {
    getAcpRuntimeClient: async () => clients.acp,
    getProjectTerminals: (projectId: string) => {
      const attached = projectManager.requireAttached(projectId);
      return attached.success ? attached.data.terminals : undefined;
    },
    getTerminalsRuntimeClient,
    getTuiAgentsRuntimeClient,
  };
  const lifecycleSessions: TaskSessionCleanup = {
    resolve: (database, scope, context) =>
      resolveLifecycleSessionTargets(sessionCleanupDependencies, database, scope, context),
    killAcp: (database, scope, targets) =>
      killLifecycleAcpSessions(sessionCleanupDependencies, database, scope, targets),
    killTerminals: (database, scope, context, targets) =>
      killLifecycleTerminalSessions(sessionCleanupDependencies, database, scope, context, targets),
  };
  const hostIsReachable: HostReachabilityProbe = (host) =>
    hostRefEquals(parseHostRef(host), LOCAL_HOST_REF);
  const taskService = new TaskService({
    db,
    projects: projectManager,
    sessions: taskSessionManager,
    workspacePlacement,
    runtimes,
    lifecycleParticipants,
    sessionLaunchContexts,
    createConversationProvider,
    workspaceIdentity,
    creations: workspaceCreations,
    // Plain task deletion (spec §3): no kernel submit; the host-artifact half rides
    // the workspace removal verbs and the reconcile-sweep tombstones.
    deletion: {
      db,
      runtimes,
      sessionCleanup: lifecycleSessions,
      getMementosRuntimeClient,
      evictFileSearchRoot: fileSearchRuntime.evictRoot,
    },
  });
  const searchService = createSearchService({
    db,
    sqlite,
    acquireWorkspaceRuntime: (workspaceId) =>
      acquireWorkspaceRuntime(runtimes, workspaceIdentity, workspaceId),
    searchFileSearchRoot,
    getSearchExclusions: async () => (await appSettingsService.get('files')).searchExclude,
    tasks: taskService,
  });
  searchService.initialize();
  const automationRuntime = {
    runtimes,
    getProjectById: (projectId: string) => getProjectById(db, projectId),
  };
  const automationsService = new AutomationsService({
    db,
    runtime: automationRuntime,
    buildDeployment: (automation) =>
      buildAutomationDeployment(
        {
          db,
          getProjectById: (projectId) => getProjectById(db, projectId),
          getRepoFacts: async (project) => {
            const attached = projectManager.requireAttached(project.id);
            return attached.success ? attached.data.repoFacts.get() : null;
          },
          resolveWorkspace: (workspaceId) => workspaceIdentity.resolve(workspaceId),
          resolveWorktreePool: (project) => workspacePlacement.resolveWorktreePool(project),
        },
        automation
      ),
  });

  // Unmigrated string-typed consumers get the documented plaintext view over
  const promptLibraryService = createPromptLibraryService({
    db,
    keyValueStore: new AppDbKeyValueStore<PromptLibraryKV>(db, 'prompt-library', log),
  });
  const notificationService = createNotificationService({
    db,
    settings: appSettingsService,
    isAppFocused,
    onAgentEvent: (handler) => agentStatusService.on('agent:event', handler),
    resolveProviderName: (providerId) => {
      try {
        return getPluginMetadata(providerId).name;
      } catch {
        return providerId;
      }
    },
    logger: log,
    createSystemSink: createSystemNotificationSink,
  });
  const gitCredentials: GitCredentialsService = {
    resolveSessionSpec: async ({ projectId }) => {
      const settings = await loadStoredGitSettings(db, projectId);
      return { mode: settings.agentGitCredentials === 'none' ? 'none' : 'system' };
    },
    mintOperationCredentials: async () => undefined,
    mintCloneCredentials: async () => undefined,
  };

  setCoreServiceInstances({
    appSettings: appSettingsService,
    notifications: notificationService,
    promptLibrary: promptLibraryService,
    providerSettings: providerOverrideSettings,
  });
  projectSettingsService.initialize();
  appService.initialize({
    acquireWorkspaceRuntime: createDesktopWorkspaceRuntimeAcquirer(runtimes, workspaceIdentity),
    emitHostEvent: (event) => desktopHostEvents.emit(undefined, event),
  });
  appScope.add(() => appService.dispose());
  await step('services:app-settings-init', () => appSettingsService.initialize());
  setTrayVisible((await appSettingsService.get('interface')).showTrayIcon);
  applyNativeTheme(await appSettingsService.get('theme'));
  await step('services:automations-init', () => automationsService.initialize());
  await step('services:notifications-init', () => notificationService.initialize());
  installUpdateNotifications(notificationService);
  browserWebContentsRegistry.setKeyboardSettings(await appSettingsService.get('keyboard'));
  setBrowserCorsRelaxationSettings(await appSettingsService.get('browser'));
  await step('services:prompt-library-init', () => promptLibraryService.initialize());
  // Plain project deletion (spec §3): the cascade reuses the task session cleanup and
  // the workspace removal verbs; nothing submits to the operations kernel.
  const projectDeletion: ProjectDeletionDependencies = {
    db,
    runtimes,
    automations: automationsService,
    getMementosRuntimeClient,
    logger: log,
    projects: projectManager,
    sessionCleanup: lifecycleSessions,
  };
  // Push-based mirror of each host's workspace registry (ADR 0005).
  const workspaceRegistrySync = new WorkspaceRegistrySyncService({
    db,
    runtimes,
    scope: appScope,
    onError: (context, error) => log.warn(context, { error }),
  });
  const workspaceRegistryBackfill = new WorkspaceRegistryBackfillService({
    db,
    runtimes,
    onError: (context, error) => log.warn(context, { error }),
  });
  const conversationPreferences = getProviderSettingsService(db);
  appScope.add(() => conversationPreferences.dispose());
  const conversationSync = new ConversationSyncService({
    db,
    runtimes,
    scope: appScope,
    onError: (context, error) => log.warn(context, { error }),
  });
  const conversationBackfill = new ConversationBackfillService({
    db,
    runtimes,
    onError: (context, error) => log.warn(context, { error }),
  });
  // The operations kernel is gone (ADR 0006 demolition): best-effort cleanup of the
  // orphaned SQLite store older builds left next to the app database.
  cleanupLegacyOperationsDatabases(log);
  // The reconcile sweep (ADR 0006): tombstoned mirror rows are the durable deletion
  // queue; they converge whenever their host is reachable. Boot trigger: the local
  // host attaches once its registry sync is up; the service's internal 10-minute
  // backstop is the retry vehicle (per-item backoff, no separate scheduler).
  const reconcileSweep = new ReconcileSweepService({
    scope: appScope,
    onError: (context, error) => log.warn(context, { error: String(error) }),
  });
  reconcileSweep.registerKind(createWorkspaceDeletionSweepKind({ db, runtimes }));
  // Conversations sweep after workspaces: the same-host ordering heuristic lets a
  // workspace cascade's freshly written conversation tombstones converge in the same
  // pass; correctness never depends on the order (ADR 0006).
  reconcileSweep.registerKind(createConversationDeletionSweepKind({ db, runtimes }));
  const hostAttachments = new HostAttachmentRegistry({
    scope: appScope,
    logger: log,
  });
  // Registration order is the per-host convergence order. Backfills precede the
  // authoritative live subscription, and workspace convergence precedes deletion sweeps.
  hostAttachments.register({
    label: 'conversation-sync',
    async attach(host) {
      await conversationBackfill.backfillHost(host);
      await conversationSync.attachHost(host);
    },
    detach: (host) => conversationSync.detachHost(host),
  });
  hostAttachments.register({
    label: 'workspace-registry-sync',
    async attach(host) {
      const backfill = await workspaceRegistryBackfill.backfillHost(host);
      if (backfill.status !== 'complete') return;
      await workspaceRegistrySync.attachHost(host);
      reconcileSweep.attachHost(host);
    },
    detach(host) {
      workspaceRegistrySync.detachHost(host);
      reconcileSweep.detachHost(host);
    },
  });
  // Tombstoned-while-reachable trigger: constructed here (composition root) and
  // installed on the module bridge the tombstone write paths poke.
  const reconcileSweepTriggers = createReconcileSweepTriggers();
  installReconcileSweepTriggers(reconcileSweepTriggers);
  appScope.add(
    reconcileSweepTriggers.subscribe((host) => {
      void reconcileSweep.sweepHost(host);
    })
  );
  const sessionHygieneDependencies = {
    agentStatus: agentStatusService,
    createSessionIntentStores: createDesktopSessionIntentStores,
    logger: log,
  };
  const sessionHygieneSweep = startPeriodicSweep({
    scope: appScope,
    intervalMs: 10 * 60 * 1000,
    run: () => sweepSessionHygiene(db, sessionHygieneDependencies),
    onError: (error) => {
      log.warn('session hygiene sweep failed', { error: String(error) });
    },
  });
  void sessionHygieneSweep.runNow().catch((error) => {
    log.warn('session hygiene sweep failed', { error: String(error) });
  });
  return {
    automations: automationsService,
    gitCredentials,
    hostIsReachable,
    hostAttachments,
    notifications: notificationService,
    previewServerAccess,
    promptLibrary: promptLibraryService,
    projectDeletion,
    projects: projectManager,
    projectSettings: projectSettingsService,
    providerSettings: providerOverrideSettings,
    search: searchService,
    sessionLaunchContexts,
    taskService,
    taskSessions: taskSessionManager,
    workspacePlacement,
    conversationSync,
    reconcileSweep,
  };
}
