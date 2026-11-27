export function getBranchTooltipText(
  headDisplay: string | null,
  headKind: 'branch' | 'detached' | 'unborn'
): string {
  if (headKind === 'detached') return `HEAD 已分离，当前指向 ${headDisplay ?? '未知位置'}`;
  if (headKind === 'unborn') return '请先创建初始提交';
  return headDisplay ?? '';
}

export function getPublishTooltipText({
  isPublishing,
  headDisplay,
  headKind,
  shouldOfferAddRemote,
}: {
  isPublishing: boolean;
  headDisplay: string | null;
  headKind: 'branch' | 'detached' | 'unborn';
  shouldOfferAddRemote: boolean;
}): string {
  if (isPublishing) return '正在发布…';
  if (headKind === 'detached') return 'HEAD 处于分离状态，无法发布';
  if (headKind === 'unborn') return '请先创建初始提交';
  if (!headDisplay) return '请先创建初始提交';
  if (shouldOfferAddRemote) return '添加远端仓库后发布此分支';
  return '发布分支';
}
