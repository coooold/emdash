import type { WorkspaceLifecycleStepInfo } from '@core/primitives/tasks/api';

/**
 * Render-time titles for the workspace lifecycle step vocabulary — the single copy
 * source for the create-task preview ("what will happen") and the Activity badge
 * ("what is happening"), so the two surfaces cannot drift apart.
 */
export const LIFECYCLE_STEP_TITLES: Record<WorkspaceLifecycleStepInfo['id'], string> = {
  'adopt-worktree': '复用工作树',
  'fetch-branch': '获取分支',
  'fetch-remote-base': '获取远端基准分支',
  'create-worktree': '创建工作树',
  'configure-branch': '配置分支',
  'copy-artifacts': '复制保留文件',
  'push-branch': '推送分支',
  'fetch-refs': '获取引用',
  prepare: '准备',
  setup: '设置',
  run: '运行',
  teardown: '清理',
};
