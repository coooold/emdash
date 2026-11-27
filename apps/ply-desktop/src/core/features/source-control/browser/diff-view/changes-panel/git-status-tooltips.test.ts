import { describe, expect, it } from 'vitest';
import { getBranchTooltipText, getPublishTooltipText } from './git-status-tooltips';

describe('git status tooltips', () => {
  it('shows full branch name for branch tooltip', () => {
    expect(getBranchTooltipText('main', 'branch')).toBe('main');
  });

  it('shows detached HEAD message with short hash', () => {
    expect(getBranchTooltipText('abc1234', 'detached')).toBe('HEAD 已分离，当前指向 abc1234');
  });

  it('shows initial-commit guidance for unborn branch tooltip', () => {
    expect(getBranchTooltipText('main', 'unborn')).toBe('请先创建初始提交');
  });

  it('shows cannot-publish message when HEAD is detached', () => {
    expect(
      getPublishTooltipText({
        isPublishing: false,
        headDisplay: 'abc1234',
        headKind: 'detached',
        shouldOfferAddRemote: false,
      })
    ).toBe('HEAD 处于分离状态，无法发布');
  });

  it('shows initial-commit guidance for disabled publish button when branch is unborn', () => {
    expect(
      getPublishTooltipText({
        isPublishing: false,
        headDisplay: 'main',
        headKind: 'unborn',
        shouldOfferAddRemote: true,
      })
    ).toBe('请先创建初始提交');
  });

  it('preserves existing publish tooltip behavior when branch exists', () => {
    expect(
      getPublishTooltipText({
        isPublishing: false,
        headDisplay: 'main',
        headKind: 'branch',
        shouldOfferAddRemote: true,
      })
    ).toBe('添加远端仓库后发布此分支');

    expect(
      getPublishTooltipText({
        isPublishing: false,
        headDisplay: 'main',
        headKind: 'branch',
        shouldOfferAddRemote: false,
      })
    ).toBe('发布分支');
  });
});
