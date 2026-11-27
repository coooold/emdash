import type { HostFileRef } from '@emdash/core/primitives/path/api';
import { Button, Dialog } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { defineModal } from '@core/primitives/modals/react';
import { getLanguageServices } from './language-services';

/** Details are shown on demand from the file tab menu, never in the file header. */
export const LanguageStatus = observer(function LanguageStatus({ file }: { file: HostFileRef }) {
  const services = getLanguageServices();
  const status = services?.status(file);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string>();
  if (!status) return <Dialog.Body>此文件不支持语言服务。</Dialog.Body>;
  const { connection } = status;
  const server = connection.kind === 'connected' ? connection.server : undefined;
  const starting = connection.kind === 'connecting' || server?.phase === 'starting';
  const unavailable = connection.kind === 'disconnected' || server?.phase === 'failed';
  const error = connection.kind === 'disconnected' ? connection.message : server?.error;
  const basic = status.fallbackAvailable && (starting || unavailable);
  return (
    <>
      <Dialog.Body>
        <p>{status.serverName}</p>
        <p className="text-foreground-passive">
          {basic
            ? '已加载文件可使用基础功能，完整的项目功能目前不可用。'
            : starting
              ? '正在连接语言服务…'
              : unavailable
                ? '语言服务不可用。'
                : '语言服务已就绪。'}
        </p>
        {error && <p className="break-words text-foreground-passive">{error}</p>}
        {restartError && <p role="alert">{restartError}</p>}
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="secondary"
          size="sm"
          disabled={starting || restarting}
          onClick={async () => {
            setRestarting(true);
            setRestartError(undefined);
            try {
              await services?.restartServer(file);
            } catch (error) {
              setRestartError(
                error instanceof Error ? error.message : '无法重启语言服务。'
              );
            } finally {
              setRestarting(false);
            }
          }}
        >
          {starting || restarting
            ? '正在连接…'
            : unavailable
              ? '重试'
              : '重启语言服务'}
        </Button>
      </Dialog.Footer>
    </>
  );
});

function LanguageServicesDialog({ file }: { file: HostFileRef }) {
  return (
    <>
      <Dialog.Header>
        <Dialog.Title>语言服务</Dialog.Title>
        <Dialog.Description>提供当前文件工作区的代码提示和导航。</Dialog.Description>
      </Dialog.Header>
      <LanguageStatus file={file} />
    </>
  );
}

export const languageServicesDialog = defineModal<void>()({
  id: 'languageServicesDialog',
  component: LanguageServicesDialog,
  size: 'sm',
});
