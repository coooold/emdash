import { AgentStatus, ListPopoverCard } from '@emdash/ui/react/components';
import { createListView, defineSelection, ListView } from '@emdash/ui/react/patterns';
import {
  Button,
  Checkbox,
  ContextMenu,
  MicroLabel,
  RelativeTime,
  Spinner,
  toast,
} from '@emdash/ui/react/primitives';
import { Download, Pencil, Plus, Square, Trash2, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type {
  ConversationManagerStore,
  ConversationStore,
} from '@core/features/conversations/api/browser/conversation-manager';
import { conversationTabKind } from '@core/features/conversations/api/browser/conversation-tab-kind';
import { formatConversationTitleForDisplay } from '@core/features/conversations/api/browser/conversation-title-utils';
import { getAcpChatResourceManager } from '@core/features/conversations/browser/acp/acp-chat-resource-manager';
import { ConversationAgentIcon } from '@core/features/conversations/browser/conversation-agent-icon';
import { ConversationSelectionControl } from '@core/features/conversations/browser/conversation-selection-control';
import { deleteConversationBatch } from '@core/features/conversations/browser/delete-conversation-batch';
// TODO(conversations-extraction): Pass task scope into the sidebar instead of importing task hooks.
import { useTaskViewContext } from '@core/features/tasks/contributions/browser/task-view-context';
import {
  useConversations,
  useTaskComposition,
} from '@core/features/workbench/api/browser/task-composition-context';
// TODO(conversations-extraction): Expose tab selection through a conversation scope instead of the task tab view.
import { useTabSelection } from '@core/features/workbench/api/browser/task-tab-registry';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import { MAX_CONVERSATION_TITLE_LENGTH } from '@core/primitives/conversations/api';
import { cn } from '@core/primitives/styling/browser/cn';

const ROW_HEIGHT = 32;
const SECTION_HEADER_HEIGHT = 32;

function lastInteractionTimestamp(conversation: ConversationStore): number {
  return conversation.data.lastInteractedAt
    ? new Date(conversation.data.lastInteractedAt).getTime()
    : 0;
}

function createConversationListView(conversations: ConversationManagerStore) {
  return createListView({
    getItemId: (conversation: ConversationStore) => conversation.data.id,
    source: {
      kind: 'sync',
      items: () =>
        Array.from(conversations.conversations.values()).sort(
          (left, right) => lastInteractionTimestamp(right) - lastInteractionTimestamp(left)
        ),
    },
    sections: {
      by: (conversation) =>
        conversations.isSessionActive(conversation.data.id) ? 'Active' : 'Inactive',
      order: ['Active', 'Inactive'],
    },
    selection: defineSelection({ kind: 'multi' }),
  });
}

type ConversationListView = ReturnType<typeof createConversationListView>;

const ConversationRow = observer(function ConversationRow({
  conversationId,
  view,
  deleting,
  onDelete,
  onRangeStep,
}: {
  conversationId: string;
  view: ConversationListView;
  deleting: boolean;
  onDelete: (conversationIds: string[]) => void;
  onRangeStep: (conversationId: string, direction: -1 | 1) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const committedRef = useRef(false);
  const conversations = useConversations();
  const { projectId, taskId } = useTaskViewContext();
  const liveActionDisabledReason = projectAvailabilityUi.getLiveActionDisabledReason(projectId);
  const { paneLayout } = useTaskComposition();
  const openConfirm = useOpenModal('confirmActionModal');
  const selection = view.useSelection();
  const isSelected = selection.isSelected(conversationId);

  const handleRenameInputRef = useCallback((input: HTMLInputElement | null) => {
    input?.focus();
    input?.select();
  }, []);

  const handleRename = useCallback(() => {
    committedRef.current = false;
    window.setTimeout(() => setIsEditing(true), 0);
  }, []);

  const conversation = conversations.conversations.get(conversationId);
  const isSessionActive = conversations.isSessionActive(conversationId);

  const tabKind = conversationTabKind(conversation?.data.type);
  const { isActive, open: openConversation } = useTabSelection(tabKind, conversationId);

  if (!conversation) return null;
  const displayTitle = formatConversationTitleForDisplay(
    conversation.data.providerId,
    conversation.data.title
  );
  const rawTitle = conversation.data.title ?? '';
  const commitRename = (value: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim().slice(0, MAX_CONVERSATION_TITLE_LENGTH);
    if (trimmed && trimmed !== rawTitle) {
      handleRenameSubmit(trimmed);
    } else {
      setIsEditing(false);
    }
  };

  const handleRenameSubmit = (newTitle: string) => {
    setIsEditing(false);
    void conversations.renameConversation(conversationId, newTitle);
  };

  const closeConversationTab = () => {
    for (const group of paneLayout.groups) {
      const entry = group.pane.findSingleMountEntry(tabKind, conversationId);
      if (entry) group.pane.closeTab(entry.tabId);
    }
  };

  const handleDoubleClick = () => {
    openConversation({ conversationId }, { preview: false });
  };

  const handleDelete = () => {
    onDelete([conversationId]);
  };

  const handleKillSession = () => {
    if (liveActionDisabledReason) return;
    void openConfirm({
      title: '停止会话',
      description: `「${displayTitle}」的会话将停止，对话仍可恢复。`,
      confirmLabel: '停止会话',
      variant: 'destructive',
    }).then((outcome) => {
      if (outcome.success) {
        void (async () => {
          try {
            await conversations.killSession(conversationId);
            closeConversationTab();
          } catch (error) {
            toast.error('无法停止会话', {
              description: error instanceof Error ? error.message : String(error),
            });
          }
        })();
      }
    });
  };

  const handleExport = (kind: 'parsed' | 'raw') => {
    const store = getAcpChatResourceManager(taskId, projectId).get(conversationId);
    if (!store) {
      toast.error('无法导出对话记录', {
        description: '请先打开对话再导出。',
      });
      return;
    }
    store.exportTranscript(kind);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          role="button"
          tabIndex={0}
          onClick={() => openConversation({ conversationId }, { preview: true })}
          onDoubleClick={handleDoubleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openConversation({ conversationId }, { preview: true });
            }
          }}
          className={cn(
            'group/conversation flex h-8 w-full items-center gap-2 rounded-md pl-2 text-left text-sm text-foreground-muted transition-colors hover:bg-background-1 hover:text-foreground',
            isActive && 'bg-background-2 text-foreground hover:bg-background-2'
          )}
        >
          <ConversationAgentIcon
            providerId={conversation.data.providerId}
            isAcp={conversation.data.type === 'acp'}
            size={16}
            className="size-4"
          />
          {isEditing ? (
            <input
              ref={handleRenameInputRef}
              className="min-w-0 flex-1 rounded bg-background-1 px-1.5 py-0.5 text-sm text-foreground ring-1 ring-foreground/20 outline-none focus:ring-foreground/40"
              defaultValue={rawTitle}
              maxLength={MAX_CONVERSATION_TITLE_LENGTH}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitRename(e.currentTarget.value);
                else if (e.key === 'Escape') {
                  committedRef.current = true;
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{displayTitle}</span>
          )}
          <ConversationSelectionControl
            label={`选择 ${displayTitle}`}
            selected={isSelected}
            disabled={deleting}
            onToggle={(shiftKey) =>
              selection.toggle(
                conversationId,
                shiftKey ? ({ shiftKey: true } as ReactMouseEvent) : undefined
              )
            }
            onRangeStep={(direction) => onRangeStep(conversationId, direction)}
            selectionId={conversationId}
          >
            {conversation.indicatorStatus ? (
              <AgentStatus status={conversation.indicatorStatus} />
            ) : (
              <RelativeTime
                value={conversation.data.lastInteractedAt ?? ''}
                className="flex h-full items-center font-sans text-xs text-foreground-passive"
                compact
              />
            )}
          </ConversationSelectionControl>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content finalFocus={false}>
        <ContextMenu.Item onClick={handleRename}>
          <Pencil className="size-4" />
          重命名
        </ContextMenu.Item>
        {conversation.data.type === 'acp' && (
          <>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={() => handleExport('parsed')}>
              <Download className="size-4" />
              导出对话记录
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => handleExport('raw')}>
              <Download className="size-4" />
              导出 ACP 原始日志
            </ContextMenu.Item>
          </>
        )}
        {isSessionActive && (
          <>
            <ContextMenu.Separator />
            <ContextMenu.Item
              variant="destructive"
              disabled={Boolean(liveActionDisabledReason)}
              title={liveActionDisabledReason ?? undefined}
              onClick={handleKillSession}
            >
              <Square className="size-4" />
              停止会话
            </ContextMenu.Item>
          </>
        )}
        <ContextMenu.Separator />
        <ContextMenu.Item variant="destructive" disabled={deleting} onClick={handleDelete}>
          <Trash2 className="size-4" />
          删除
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
});

const ConversationSectionHeader = observer(function ConversationSectionHeader({
  view,
  deleting,
}: {
  view: ConversationListView;
  deleting: boolean;
}) {
  const section = view.useSection();
  const sectionLabel = section.key === 'Active' ? '进行中' : '未运行';
  const selection = view.useSelection();
  const selectedCount = section.items.filter((conversation) =>
    selection.isSelected(conversation.data.id)
  ).length;
  const allSelected = selectedCount === section.count;
  const partiallySelected = selectedCount > 0 && !allSelected;

  const toggleSection = () => {
    const shouldSelect = !allSelected;
    for (const conversation of section.items) {
      const conversationId = conversation.data.id;
      if (selection.isSelected(conversationId) !== shouldSelect) {
        selection.toggle(conversationId);
      }
    }
  };

  return (
    <div className="group/section flex h-8 items-end justify-between pb-1 pl-2">
      <MicroLabel className="text-foreground-passive">{sectionLabel}</MicroLabel>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center transition-opacity',
          'opacity-0 group-hover/section:opacity-100 group-focus-within/section:opacity-100',
          selectedCount > 0 && 'opacity-100'
        )}
      >
        <Checkbox
          checked={allSelected}
          indeterminate={partiallySelected}
          disabled={deleting}
          onCheckedChange={toggleSection}
          aria-label={`选择所有${sectionLabel}的对话`}
        />
      </span>
    </div>
  );
});

const ConversationSelectionBar = observer(function ConversationSelectionBar({
  view,
  deleting,
  onDelete,
}: {
  view: ConversationListView;
  deleting: boolean;
  onDelete: (conversationIds: string[]) => void;
}) {
  const selection = view.useSelection();
  if (selection.count === 0) return null;

  return (
    <ListPopoverCard className="justify-between">
      <span className="text-xs whitespace-nowrap text-foreground-muted">
        已选择 {selection.count} 项
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="destructive"
          size="sm"
          disabled={deleting}
          onClick={() => onDelete([...selection.selectedIds])}
        >
          {deleting ? <Spinner size="sm" /> : <Trash2 className="size-3.5" />}
          删除
        </Button>
        <Button
          variant="ghost"
          size="xs"
          icon
          disabled={deleting}
          onClick={selection.clear}
          aria-label="清除对话选择"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </ListPopoverCard>
  );
});

const SidebarConversationsListContent = observer(function SidebarConversationsListContent({
  view,
  conversations,
}: {
  view: ConversationListView;
  conversations: ConversationManagerStore;
}) {
  const { projectId, taskId } = useTaskViewContext();
  const liveActionDisabledReason = projectAvailabilityUi.getLiveActionDisabledReason(projectId);
  const taskView = useTaskComposition();
  const { paneLayout } = taskView;
  const openCreateConversationModal = useOpenModal('createConversationModal');
  const openConfirm = useOpenModal('confirmActionModal');
  const selection = view.useSelection();
  const { orderedIds } = view.useListView();
  const [deleting, setDeleting] = useState(false);
  const listRootRef = useRef<HTMLDivElement>(null);

  const handleCreate = () => {
    if (liveActionDisabledReason) return;
    void openCreateConversationModal({
      projectId,
      taskId,
    }).then((outcome) => {
      if (!outcome.success) return;
      const { conversationId, type } = outcome.data;
      if (type === 'acp') {
        paneLayout.open('acp-chat', { conversationId }, { preview: false });
      } else {
        paneLayout.open('conversation', { conversationId }, { preview: false });
      }
    });
  };

  const handleRangeStep = useCallback(
    (conversationId: string, direction: -1 | 1) => {
      const currentIndex = orderedIds.indexOf(conversationId);
      if (currentIndex < 0) return;
      const targetId = orderedIds[currentIndex + direction];
      if (!targetId) return;

      selection.toggle(targetId, { shiftKey: true } as ReactKeyboardEvent);
      const targetControl = Array.from(
        listRootRef.current?.querySelectorAll<HTMLElement>('[data-conversation-selection-id]') ?? []
      ).find((control) => control.dataset.conversationSelectionId === targetId);
      targetControl?.focus();
    },
    [orderedIds, selection]
  );

  const closeConversationTabs = useCallback(
    (conversationId: string) => {
      for (const group of paneLayout.groups) {
        for (const kind of ['conversation', 'acp-chat'] as const) {
          const entry = group.pane.findSingleMountEntry(kind, conversationId);
          if (entry) group.pane.closeTab(entry.tabId);
        }
      }
    },
    [paneLayout]
  );

  const handleDelete = useCallback(
    async (requestedIds: string[]) => {
      if (deleting) return;
      const targets = [...new Set(requestedIds)].flatMap((conversationId) => {
        const conversation = conversations.conversations.get(conversationId);
        return conversation ? [conversation] : [];
      });
      if (targets.length === 0) return;

      const activeCount = targets.filter((conversation) =>
        conversations.isSessionActive(conversation.data.id)
      ).length;
      const singleTarget = targets.length === 1 ? targets[0] : undefined;
      const singleTitle = singleTarget
        ? formatConversationTitleForDisplay(singleTarget.data.providerId, singleTarget.data.title)
        : null;
      const activeDescription =
        activeCount > 0
          ? `其中 ${activeCount} 个会话仍在运行。`
          : '';
      const outcome = await openConfirm({
        title: singleTarget ? '删除对话' : `删除 ${targets.length} 个对话？`,
        description: singleTarget
          ? `「${singleTitle}」将被永久删除，无法撤销。${activeDescription}`
          : `将永久删除 ${targets.length} 个对话，无法撤销。${activeDescription}`,
        confirmLabel: '删除',
        variant: 'destructive',
      });
      if (!outcome.success) return;

      setDeleting(true);
      try {
        const result = await deleteConversationBatch(
          targets.map((conversation) => conversation.data.id),
          (conversationId) => conversations.deleteConversation(conversationId)
        );
        for (const conversationId of result.succeededIds) {
          closeConversationTabs(conversationId);
          if (selection.isSelected(conversationId)) selection.toggle(conversationId);
        }

        if (result.failures.length > 0) {
          const firstError = result.failures[0]!.error;
          toast.error(`已删除 ${result.succeededIds.length} 项，${result.failures.length} 项失败`, {
            description: firstError instanceof Error ? firstError.message : String(firstError),
          });
        } else if (result.succeededIds.length > 1) {
          toast(`已删除 ${result.succeededIds.length} 个对话`);
        }
      } finally {
        setDeleting(false);
      }
    },
    [closeConversationTabs, conversations, deleting, openConfirm, selection]
  );

  return (
    <div ref={listRootRef} className="relative flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between pt-2 pr-2 pb-1 pl-4">
        <MicroLabel className="font-medium">对话</MicroLabel>
        <projectAvailabilityUi.LiveActionGuard projectId={projectId}>
          <Button
            size="sm"
            icon
            variant="ghost"
            aria-label="创建对话"
            disabled={Boolean(liveActionDisabledReason)}
            onClick={handleCreate}
          >
            <Plus className="size-3.5" />
          </Button>
        </projectAvailabilityUi.LiveActionGuard>
      </div>
      <ListView.Body>
        <view.List
          className={cn('px-2', selection.count > 0 && 'pb-14')}
          virtualization={{
            estimateSize: ROW_HEIGHT,
            estimateHeaderSize: SECTION_HEADER_HEIGHT,
            overscan: 5,
            measure: false,
          }}
          renderSection={() => <ConversationSectionHeader view={view} deleting={deleting} />}
          renderItem={(conversation) => (
            <ConversationRow
              conversationId={conversation.data.id}
              view={view}
              deleting={deleting}
              onDelete={(conversationIds) => void handleDelete(conversationIds)}
              onRangeStep={handleRangeStep}
            />
          )}
        />
      </ListView.Body>
      <ConversationSelectionBar
        view={view}
        deleting={deleting}
        onDelete={(conversationIds) => void handleDelete(conversationIds)}
      />
    </div>
  );
});

export const SidebarConversationsList = observer(function SidebarConversationsList() {
  const conversations = useConversations();
  const view = useMemo(() => createConversationListView(conversations), [conversations]);

  return (
    <view.Root>
      <SidebarConversationsListContent view={view} conversations={conversations} />
    </view.Root>
  );
});
