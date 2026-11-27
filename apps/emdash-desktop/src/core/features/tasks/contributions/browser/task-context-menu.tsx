import { ContextMenu, toast } from '@emdash/ui/react/primitives';
import { Archive, Copy, MessageSquare, Pencil, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import React from 'react';

interface TaskContextMenuProps {
  children: React.ReactNode;
  isPinned: boolean;
  canPin: boolean;
  isArchived: boolean;
  archiveDisabledReason?: string;
  branchName?: string;
  onPin: () => void;
  onUnpin: () => void;
  onRename: () => void;
  onArchive: () => void;
  onRestore?: () => void;
  onReconnect?: () => void;
  onConvertAutomation?: () => void;
  onDelete: () => void;
}

export function TaskContextMenu({
  children,
  isPinned,
  canPin,
  isArchived,
  archiveDisabledReason,
  branchName,
  onPin,
  onUnpin,
  onRename,
  onArchive,
  onRestore,
  onReconnect,
  onConvertAutomation,
  onDelete,
}: TaskContextMenuProps) {
  const archiveDisabledReasonId = React.useId();
  const handleCopyBranchName = async () => {
    if (!branchName) return;

    try {
      await navigator.clipboard.writeText(branchName);
      toast('已复制分支名称');
    } catch {
      toast.error('复制失败', {
        description: '无法将分支名称复制到剪贴板。',
      });
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Content>
        {canPin &&
          (isPinned ? (
            <ContextMenu.Item onClick={onUnpin}>
              <PinOff className="size-4" />
              取消置顶
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item onClick={onPin}>
              <Pin className="size-4" />
              置顶任务
            </ContextMenu.Item>
          ))}
        <ContextMenu.Item onClick={onRename}>
          <Pencil className="size-4" />
          重命名
        </ContextMenu.Item>
        {onReconnect && (
          <ContextMenu.Item onClick={onReconnect}>
            <RotateCcw className="size-4" />
            重新连接
          </ContextMenu.Item>
        )}
        {onConvertAutomation && (
          <ContextMenu.Item onClick={onConvertAutomation}>
            <MessageSquare className="size-4" />
            转为普通任务
          </ContextMenu.Item>
        )}
        {!isArchived && (
          <ContextMenu.Item
            disabled={!!archiveDisabledReason}
            aria-describedby={archiveDisabledReason ? archiveDisabledReasonId : undefined}
            onClick={onArchive}
          >
            <Archive className="size-4" />
            归档
          </ContextMenu.Item>
        )}
        {archiveDisabledReason && (
          <span id={archiveDisabledReasonId} className="sr-only">
            {archiveDisabledReason}
          </span>
        )}
        {isArchived && onRestore && (
          <ContextMenu.Item onClick={onRestore}>
            <RotateCcw className="size-4" />
            恢复
          </ContextMenu.Item>
        )}
        {branchName && (
          <ContextMenu.Item onClick={() => void handleCopyBranchName()}>
            <Copy className="size-4" />
            复制分支名称
          </ContextMenu.Item>
        )}
        <ContextMenu.Separator />
        <ContextMenu.Item variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          删除
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
