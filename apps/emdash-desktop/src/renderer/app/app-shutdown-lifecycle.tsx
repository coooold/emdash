import { Spinner, toast } from '@emdash/ui/react/primitives';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openFileStore } from '@core/features/editor/api/browser/open-file-store/open-file-store';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import type { ActiveSessionSummary } from '@core/primitives/desktop-host/api/host-contract';
import { log } from '@core/primitives/logging/browser/logger';
import { useMementoClient } from '@core/primitives/mementos/react';
import { modalStore } from '@core/primitives/modals/react/modal-store';
import { getDesktopWireClient } from '@renderer/lib/runtime/desktop-wire-client';

export function AppShutdownLifecycle() {
  const mementoClient = useMementoClient();
  const openUnsavedChangesModal = useOpenModal('quitUnsavedChangesModal');
  const openConfirmQuitModal = useOpenModal('confirmActionModal');
  const activeRequestId = useRef<string | null>(null);
  const shutdownStarted = useRef(false);
  const [shuttingDown, setShuttingDown] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const runQuitGuards = useCallback(
    async (requestId: string, summary: ActiveSessionSummary): Promise<boolean> => {
      // All dirty buffers — file tabs and editable diffs alike — live in the
      // app-global OpenFileStore.
      const dirtyCount = openFileStore.dirtyEntries().length;
      if (dirtyCount > 0) {
        const outcome = await openUnsavedChangesModal({ count: dirtyCount });
        if (!outcome.success || activeRequestId.current !== requestId) return false;

        try {
          if (outcome.data === 'save-all') {
            const allSaved = await openFileStore.saveAllDirty();
            if (!allSaved) {
              toast.error('无法保存所有文件', {
                description: '请解决文件冲突后再退出。',
              });
              return false;
            }
          } else {
            openFileStore.discardAllDirty();
          }
        } catch (error) {
          log.error('Failed to resolve unsaved files before quit:', error);
          toast.error('无法处理未保存的文件', {
            description: '更改已保留，请重试退出。',
          });
          return false;
        }
      }

      if (activeRequestId.current !== requestId) return false;
      const confirmation = await openConfirmQuitModal({
        title: '退出 Emdash？',
        description: describeShutdownImpact(summary),
        confirmLabel: '退出',
      });
      return confirmation.success && activeRequestId.current === requestId;
    },
    [openConfirmQuitModal, openUnsavedChangesModal]
  );

  const handleConfirmationRequest = useCallback(
    async (requestId: string, summary: ActiveSessionSummary): Promise<void> => {
      activeRequestId.current = requestId;
      const confirmed = await runQuitGuards(requestId, summary);
      if (activeRequestId.current === requestId) activeRequestId.current = null;
      const client = await getDesktopWireClient();
      await client.host.resolveQuitConfirmation({ requestId, confirmed });
    },
    [runQuitGuards]
  );

  const handleShutdownStarted = useCallback(async (): Promise<void> => {
    if (shutdownStarted.current) return;
    shutdownStarted.current = true;
    setShuttingDown(true);
    const client = await getDesktopWireClient();
    try {
      await mementoClient.flush();
    } catch (error) {
      log.error('Failed to flush mementos during shutdown:', error);
    } finally {
      await client.host.ackShutdownFlush();
    }
  }, [mementoClient]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void getDesktopWireClient().then(async (client) => {
      const nextUnsubscribe = await client.host.events.subscribe(undefined, {
        onEvent: (event) => {
          if (event.type === 'quit-confirmation-requested') {
            void handleConfirmationRequest(event.requestId, event.summary);
          } else if (event.type === 'quit-confirmation-cancelled') {
            if (activeRequestId.current !== event.requestId) return;
            activeRequestId.current = null;
            modalStore.dismissAll('passive');
          } else if (event.type === 'shutdown-started') {
            void handleShutdownStarted();
          }
        },
        onGap: () => {
          log.warn('Host event stream gap during shutdown lifecycle');
        },
      });
      if (disposed) {
        nextUnsubscribe();
        return;
      }
      unsubscribe = nextUnsubscribe;
      await client.host.shutdownReady();
    });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [handleConfirmationRequest, handleShutdownStarted]);

  useEffect(() => {
    if (!shuttingDown) return;
    const timer = setTimeout(() => setShowOverlay(true), 500);
    return () => clearTimeout(timer);
  }, [shuttingDown]);

  return showOverlay ? <ShutdownOverlay /> : null;
}

function ShutdownOverlay() {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blockInput = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', blockInput, true);
    overlay.current?.focus();
    return () => window.removeEventListener('keydown', blockInput, true);
  }, []);

  return (
    <div
      ref={overlay}
      role="alertdialog"
      aria-modal="true"
      aria-label="正在退出 Emdash"
      tabIndex={-1}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-background/95"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-muted-foreground text-sm">
          正在停止会话并保存状态…
        </p>
      </div>
    </div>
  );
}

function describeShutdownImpact(summary: ActiveSessionSummary): string {
  const localAgents = summary.acpSessions + summary.localTuiSessions;
  const impacts: string[] = [];
  if (localAgents > 0) {
    impacts.push(`${localAgents} 个运行中的代理会话`);
  }
  if (summary.terminals > 0) {
    impacts.push(`${summary.terminals} 个终端`);
  }

  if (impacts.length > 0) {
    return `${summary.incomplete ? '至少 ' : ''}${impacts.join('和')}可能会停止。`;
  }
  return summary.incomplete ? '运行中的代理会话和终端可能会停止。' : '后台服务和自动化将停止。';
}
